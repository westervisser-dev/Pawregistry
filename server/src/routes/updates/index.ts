import Elysia, { t } from 'elysia';
import { eq, desc, and, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../../db';
import { updates, clients, litterInterests, litterNotifications, litterUpdateOptOuts, puppies } from '../../db/schema';
import { adminPlugin, clientPlugin } from '../../lib/auth';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';
import { sendLitterUpdateEmails } from '../../lib/email';

export const updatesRoutes = new Elysia({ prefix: '/updates' })
	// ── Client portal ──────────────────────────────────────────────────────────
	.use(clientPlugin)

	.get('/my', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user.id),
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

		// Collect all litter IDs this client is associated with
		const [interestRows, notifRows] = await Promise.all([
			db.select({ litterId: litterInterests.litterId })
				.from(litterInterests)
				.where(eq(litterInterests.clientId, client.id)),
			db.select({ litterId: litterNotifications.litterId })
				.from(litterNotifications)
				.where(eq(litterNotifications.clientId, client.id)),
		]);

		// If client has a puppyId, get that puppy's litterId
		let puppyLitterId: string | null = null;
		if (client.puppyId) {
			const [puppy] = await db.select({ litterId: puppies.litterId })
				.from(puppies)
				.where(eq(puppies.id, client.puppyId));
			puppyLitterId = puppy?.litterId ?? null;
		}

		const associatedLitterIds = [
			...new Set([
				...(client.litterId ? [client.litterId] : []),
				...(puppyLitterId ? [puppyLitterId] : []),
				...interestRows.map((r) => r.litterId),
				...notifRows.map((r) => r.litterId),
			]),
		];

		const whereClause = associatedLitterIds.length > 0
			? and(
				eq(updates.isPublished, true),
				or(isNull(updates.litterId), inArray(updates.litterId, associatedLitterIds)),
			)
			: and(eq(updates.isPublished, true), isNull(updates.litterId));

		return db.query.updates.findMany({
			where: whereClause,
			orderBy: [desc(updates.publishedAt)],
			with: { litter: true },
		});
	})

	// Returns the litter IDs the current client has opted out of
	.get('/my/opt-outs', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user.id),
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

		const rows = await db.select({ litterId: litterUpdateOptOuts.litterId })
			.from(litterUpdateOptOuts)
			.where(eq(litterUpdateOptOuts.clientId, client.id));

		return rows.map((r) => r.litterId);
	})

	// Opt out of email updates for a litter
	.post('/my/opt-out/:litterId', async ({ user, params, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user.id),
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

		// Upsert — ignore if already opted out
		await db.insert(litterUpdateOptOuts)
			.values({ clientId: client.id, litterId: params.litterId })
			.onConflictDoNothing();

		return { ok: true };
	})

	// Opt back in to email updates for a litter
	.delete('/my/opt-out/:litterId', async ({ user, params, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user.id),
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

		await db.delete(litterUpdateOptOuts)
			.where(
				and(
					eq(litterUpdateOptOuts.clientId, client.id),
					eq(litterUpdateOptOuts.litterId, params.litterId),
				),
			);

		return { ok: true };
	})

	// ── Admin routes ────────────────────────────────────────────────────────────
	.use(adminPlugin)

	.get('/admin', async () => {
		return db.query.updates.findMany({
			orderBy: [desc(updates.createdAt)],
			with: { litter: true },
		});
	})

	.post(
		'/',
		async ({ body }) => {
			const [update] = await db.insert(updates).values({
				title: body.title,
				body: body.body,
				litterId: body.litterId ?? null,
				weekNumber: body.weekNumber ?? null,
				isPublished: body.isPublished ?? false,
				publishedAt: body.isPublished ? new Date() : null,
			}).returning();

			if (update.isPublished && body.sendEmail && body.litterId) {
				const litter = await db.query.litters.findFirst({
					where: (l, { eq }) => eq(l.id, body.litterId!),
				});
				if (litter) {
					await sendLitterUpdateEmails({
						updateId: update.id,
						litterId: litter.id,
						litterName: litter.name,
						title: update.title,
						body: update.body,
						weekNumber: update.weekNumber,
					});
				}
			}

			return db.query.updates.findFirst({
				where: eq(updates.id, update.id),
				with: { litter: true },
			});
		},
		{
			body: t.Object({
				title: t.String({ minLength: 1 }),
				body: t.String(),
				litterId: t.Optional(t.Nullable(t.String())),
				weekNumber: t.Optional(t.Nullable(t.Number())),
				isPublished: t.Optional(t.Boolean()),
				sendEmail: t.Optional(t.Boolean()),
			}),
		},
	)

	.patch(
		'/:id',
		async ({ params, body, error }) => {
			const existing = await db.query.updates.findFirst({
				where: eq(updates.id, params.id),
				with: { litter: true },
			});
			if (!existing) return error(404, { error: 'Not found', message: 'Update not found' });

			const isFirstPublish = body.isPublished && !existing.isPublished;
			const publishedAt = isFirstPublish ? new Date() : existing.publishedAt;

			const [updated] = await db
				.update(updates)
				.set({
					...(body.title !== undefined && { title: body.title }),
					...(body.body !== undefined && { body: body.body }),
					...(body.weekNumber !== undefined && { weekNumber: body.weekNumber }),
					...(body.isPublished !== undefined && { isPublished: body.isPublished }),
					publishedAt,
					updatedAt: new Date(),
				})
				.where(eq(updates.id, params.id))
				.returning();

			if (isFirstPublish && body.sendEmail && updated.litterId) {
				const litter = await db.query.litters.findFirst({
					where: (l, { eq }) => eq(l.id, updated.litterId!),
				});
				if (litter) {
					await sendLitterUpdateEmails({
						updateId: updated.id,
						litterId: litter.id,
						litterName: litter.name,
						title: updated.title,
						body: updated.body,
						weekNumber: updated.weekNumber,
					});
				}
			}

			return db.query.updates.findFirst({
				where: eq(updates.id, updated.id),
				with: { litter: true },
			});
		},
		{
			body: t.Partial(t.Object({
				title: t.String({ minLength: 1 }),
				body: t.String(),
				weekNumber: t.Nullable(t.Number()),
				isPublished: t.Boolean(),
				sendEmail: t.Boolean(),
			})),
		},
	)

	.delete('/:id', async ({ params, error }) => {
		const existing = await db.query.updates.findFirst({ where: eq(updates.id, params.id) });
		if (!existing) return error(404, { error: 'Not found', message: 'Update not found' });

		await db.delete(updates).where(eq(updates.id, params.id));
		return { ok: true };
	})

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
		{ body: t.Object({ file: t.File() }) },
	)

	// ── Remove a media file from an update ──
	.delete(
		'/:id/media',
		async ({ params, body, error }) => {
			const update = await db.query.updates.findFirst({ where: eq(updates.id, params.id) });
			if (!update) return error(404, { error: 'Not found', message: 'Update not found' });

			const [updated] = await db
				.update(updates)
				.set({
					mediaUrls: update.mediaUrls.filter((u) => u !== body.url),
					updatedAt: new Date(),
				})
				.where(eq(updates.id, params.id))
				.returning();

			return updated;
		},
		{ body: t.Object({ url: t.String() }) },
	);
