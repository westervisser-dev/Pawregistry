import Elysia, { t } from 'elysia';
import { eq, asc, and } from 'drizzle-orm';
import { db } from '../../db';
import { documentTemplates, clientTemplateChecklist, clients } from '../../db/schema';
import { adminPlugin, authPlugin } from '../../lib/auth';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';

export const templatesRoutes = new Elysia({ prefix: '/templates' })
	// ── Client: list templates with checklist status ──
	.use(authPlugin)
	.get('/my', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({ where: eq(clients.userId, user.id) });
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

		const templates = await db.query.documentTemplates.findMany({
			where: eq(documentTemplates.isActive, true),
			orderBy: [asc(documentTemplates.sortOrder), asc(documentTemplates.createdAt)],
		});

		const checklistItems = await db.query.clientTemplateChecklist.findMany({
			where: eq(clientTemplateChecklist.clientId, client.id),
		});

		const checkedMap = new Map(checklistItems.map((c) => [c.templateId, c.checkedAt]));

		return templates.map((t) => ({
			...t,
			checkedAt: checkedMap.get(t.id) ?? null,
		}));
	})

	.post(
		'/my/:templateId/upload',
		async ({ user, params, body, error }) => {
			const client = await db.query.clients.findFirst({ where: eq(clients.userId, user.id) });
			if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

			const file = body.file as File;
			const path = `client-templates/${client.id}/${params.templateId}-${Date.now()}-${file.name}`;
			const url = await uploadFile(STORAGE_BUCKETS.documents, path, file, file.type);

			const existing = await db.query.clientTemplateChecklist.findFirst({
				where: and(
					eq(clientTemplateChecklist.clientId, client.id),
					eq(clientTemplateChecklist.templateId, params.templateId)
				),
			});

			if (existing) {
				const [updated] = await db
					.update(clientTemplateChecklist)
					.set({ checkedAt: new Date(), uploadedFileUrl: url })
					.where(eq(clientTemplateChecklist.id, existing.id))
					.returning();
				return updated;
			} else {
				const [created] = await db.insert(clientTemplateChecklist).values({
					clientId: client.id,
					templateId: params.templateId,
					checkedAt: new Date(),
					uploadedFileUrl: url,
				}).returning();
				return created;
			}
		},
		{ body: t.Object({ file: t.File() }) }
	)

	// ── Admin routes ──
	.use(adminPlugin)

	.get('/admin', async () => {
		return db.query.documentTemplates.findMany({
			orderBy: [asc(documentTemplates.sortOrder), asc(documentTemplates.createdAt)],
		});
	})

	.post(
		'/admin',
		async ({ body }) => {
			const file = body.file as File;
			const path = `templates/${Date.now()}-${file.name}`;
			const url = await uploadFile(STORAGE_BUCKETS.templates, path, file, file.type);

			const [template] = await db.insert(documentTemplates).values({
				name: body.name,
				description: body.description ?? null,
				fileUrl: url,
				category: body.category ?? null,
				sortOrder: body.sortOrder ?? 0,
			}).returning();
			return template;
		},
		{
			body: t.Object({
				file: t.File(),
				name: t.String(),
				description: t.Optional(t.String()),
				category: t.Optional(t.String()),
				sortOrder: t.Optional(t.Number()),
			}),
		}
	)

	.patch(
		'/admin/:id',
		async ({ params, body, error }) => {
			const [updated] = await db
				.update(documentTemplates)
				.set({ ...body, updatedAt: new Date() })
				.where(eq(documentTemplates.id, params.id))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Template not found' });
			return updated;
		},
		{
			body: t.Object({
				name: t.Optional(t.String()),
				description: t.Optional(t.Nullable(t.String())),
				category: t.Optional(t.Nullable(t.String())),
				sortOrder: t.Optional(t.Number()),
				isActive: t.Optional(t.Boolean()),
			}),
		}
	)

	.delete('/admin/:id', async ({ params, error }) => {
		const [deleted] = await db
			.delete(documentTemplates)
			.where(eq(documentTemplates.id, params.id))
			.returning();
		if (!deleted) return error(404, { error: 'Not found', message: 'Template not found' });
		return { success: true };
	});
