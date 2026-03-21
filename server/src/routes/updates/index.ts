import Elysia, { t } from 'elysia';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { updates, clients } from '../../db/schema';
import { adminPlugin, authPlugin } from '../../lib/auth';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';

export const updatesRoutes = new Elysia({ prefix: '/updates' })
	// ── Client portal: updates for the logged-in client ──
	.use(authPlugin)
	.get('/my', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user.id),
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

		// Fetch updates targeted at this client, their puppy, or their litter
		const targetIds = [client.id, client.puppyId, client.litterId].filter(Boolean) as string[];
		if (targetIds.length === 0) return [];

		return db.query.updates.findMany({
			where: and(eq(updates.isPublished, true), inArray(updates.targetId, targetIds)),
			orderBy: [desc(updates.publishedAt)],
		});
	})

	// ── Admin routes ──
	.use(adminPlugin)

	.get('/admin', async () => {
		return db.query.updates.findMany({ orderBy: [desc(updates.createdAt)] });
	})

	.post(
		'/',
		async ({ body }) => {
			const [update] = await db.insert(updates).values({
				title: body.title,
				body: body.body,
				targetType: body.targetType as 'litter' | 'puppy' | 'client',
				targetId: body.targetId,
				weekNumber: body.weekNumber ?? null,
				isPublished: body.isPublished ?? false,
				publishedAt: body.isPublished ? new Date() : null,
			}).returning();
			return update;
		},
		{
			body: t.Object({
				title: t.String(),
				body: t.String(),
				targetType: t.Union([t.Literal('litter'), t.Literal('puppy'), t.Literal('client')]),
				targetId: t.String(),
				weekNumber: t.Optional(t.Nullable(t.Number())),
				isPublished: t.Optional(t.Boolean()),
			}),
		}
	)

	.patch(
		'/:id',
		async ({ params, body, error }) => {
			const existing = await db.query.updates.findFirst({ where: eq(updates.id, params.id) });
			if (!existing) return error(404, { error: 'Not found', message: 'Update not found' });

			const publishedAt =
				body.isPublished && !existing.isPublished ? new Date() : existing.publishedAt;

			const [updated] = await db
				.update(updates)
				.set({ ...body, publishedAt, updatedAt: new Date() })
				.where(eq(updates.id, params.id))
				.returning();
			return updated;
		},
		{
			body: t.Partial(t.Object({
				title: t.String(),
				body: t.String(),
				weekNumber: t.Nullable(t.Number()),
				isPublished: t.Boolean(),
			})),
		}
	)

	// ── Upload media for an update ──
	.post(
		'/:id/media',
		async ({ params, body, error }) => {
			const update = await db.query.updates.findFirst({ where: eq(updates.id, params.id) });
			if (!update) return error(404, { error: 'Not found', message: 'Update not found' });

			const file = body.file as File;
			const path = `${params.id}/${Date.now()}-${file.name}`;
			const url = await uploadFile(STORAGE_BUCKETS.updates, path, file, file.type);

			const [updated] = await db
				.update(updates)
				.set({ mediaUrls: [...update.mediaUrls, url], updatedAt: new Date() })
				.where(eq(updates.id, params.id))
				.returning();
			return updated;
		},
		{ body: t.Object({ file: t.File() }) }
	);
