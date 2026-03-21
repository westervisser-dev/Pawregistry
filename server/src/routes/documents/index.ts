import Elysia, { t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { documents, clients } from '../../db/schema';
import { adminPlugin, authPlugin } from '../../lib/auth';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';

export const documentsRoutes = new Elysia({ prefix: '/documents' })
	// ── Client: view own documents ──
	.use(authPlugin)
	.get('/my', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({ where: eq(clients.userId, user.id) });
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });
		return db.query.documents.findMany({ where: eq(documents.clientId, client.id) });
	})

	// ── Admin: upload document for a client ──
	.use(adminPlugin)

	.get('/admin/:clientId', async ({ params }) => {
		return db.query.documents.findMany({ where: eq(documents.clientId, params.clientId) });
	})

	.post(
		'/admin/:clientId',
		async ({ params, body }) => {
			const file = body.file as File;
			const path = `${params.clientId}/${Date.now()}-${file.name}`;
			const url = await uploadFile(STORAGE_BUCKETS.documents, path, file, file.type);

			const [doc] = await db.insert(documents).values({
				clientId: params.clientId,
				puppyId: body.puppyId ?? null,
				type: body.type,
				label: body.label,
				fileUrl: url,
			}).returning();
			return doc;
		},
		{
			body: t.Object({
				file: t.File(),
				type: t.Union([
					t.Literal('contract'), t.Literal('health_record'), t.Literal('go_home_pack'),
					t.Literal('invoice'), t.Literal('other'),
				]),
				label: t.String(),
				puppyId: t.Optional(t.String()),
			}),
		}
	)

	.patch(
		'/admin/:id/sign',
		async ({ params, error }) => {
			const [updated] = await db
				.update(documents)
				.set({ signedAt: new Date() })
				.where(eq(documents.id, params.id))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Document not found' });
			return updated;
		}
	);
