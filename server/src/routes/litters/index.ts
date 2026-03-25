import Elysia, { t } from 'elysia';
import { eq, desc, asc } from 'drizzle-orm';
import { db } from '../../db';
import { litters, puppies, litterImages, clients, updates } from '../../db/schema';
import { adminPlugin } from '../../lib/auth';
import { supabase, uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';

export const littersRoutes = new Elysia({ prefix: '/litters' })
	// ── Public: active public litters ──
	.get('/', async () => {
		return db.query.litters.findMany({
			where: eq(litters.isPublic, true),
			orderBy: [desc(litters.createdAt)],
			with: { sire: true, dam: true, puppies: true, images: { orderBy: [asc(litterImages.createdAt)], limit: 1 } },
		});
	})

	.get('/:id', async ({ params, error }) => {
		const litter = await db.query.litters.findFirst({
			where: eq(litters.id, params.id),
			with: { sire: true, dam: true, puppies: true, images: { orderBy: [asc(litterImages.createdAt)] } },
		});
		if (!litter) return error(404, { error: 'Not found', message: 'Litter not found' });
		return litter;
	})

	// ── Admin routes ──
	.use(adminPlugin)

	.get('/admin/all', async () => {
		return db.query.litters.findMany({
			orderBy: [desc(litters.createdAt)],
			with: { sire: true, dam: true, puppies: true },
		});
	})

	.post(
		'/',
		async ({ body }) => {
			const [litter] = await db.insert(litters).values(body).returning();
			return litter;
		},
		{
			body: t.Object({
				name: t.String(),
				breed: t.Optional(t.Nullable(t.String())),
				sireId: t.String(),
				damId: t.String(),
				status: t.Optional(t.Union([
					t.Literal('planned'), t.Literal('confirmed'), t.Literal('born'),
					t.Literal('weaning'), t.Literal('ready'), t.Literal('completed'),
				])),
				expectedDate: t.Optional(t.Nullable(t.String())),
				whelpDate: t.Optional(t.Nullable(t.String())),
				depositAmount: t.Optional(t.Nullable(t.Number())),
				notes: t.Optional(t.Nullable(t.String())),
				isPublic: t.Optional(t.Boolean()),
			}),
		}
	)

	.patch(
		'/:id',
		async ({ params, body, error }) => {
			const [updated] = await db
				.update(litters)
				.set({ ...body, updatedAt: new Date() })
				.where(eq(litters.id, params.id))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Litter not found' });
			return updated;
		},
		{ body: t.Partial(t.Object({
			name: t.String(),
			breed: t.Nullable(t.String()),
			status: t.Union([
				t.Literal('planned'), t.Literal('confirmed'), t.Literal('born'),
				t.Literal('weaning'), t.Literal('ready'), t.Literal('completed'),
			]),
			whelpDate: t.Nullable(t.String()),
			expectedDate: t.Nullable(t.String()), puppyCount: t.Nullable(t.Number()),
			availableCount: t.Nullable(t.Number()), depositAmount: t.Nullable(t.Number()),
			notes: t.Nullable(t.String()), isPublic: t.Boolean(),
		})) }
	)

	// ── Admin: upload gallery image (max 30) ──
	.post(
		'/:id/gallery',
		async ({ params, body, error }) => {
			const litter = await db.query.litters.findFirst({ where: eq(litters.id, params.id) });
			if (!litter) return error(404, { error: 'Not found', message: 'Litter not found' });

			const existing = await db.query.litterImages.findMany({ where: eq(litterImages.litterId, params.id) });
			if (existing.length >= 30) return error(400, { error: 'Limit reached', message: 'Maximum 30 photos per litter.' });

			const file = body.file as File;
			const storagePath = `${params.id}/gallery/${Date.now()}-${file.name}`;
			const url = await uploadFile(STORAGE_BUCKETS.litters, storagePath, file, file.type);

			const [image] = await db
				.insert(litterImages)
				.values({ litterId: params.id, url, storagePath })
				.returning();

			return image;
		},
		{ body: t.Object({ file: t.File() }) }
	)

	// ── Admin: delete gallery image ──
	.delete(
		'/:id/gallery/:imageId',
		async ({ params, error }) => {
			const image = await db.query.litterImages.findFirst({
				where: eq(litterImages.id, params.imageId),
			});
			if (!image) return error(404, { error: 'Not found', message: 'Image not found' });

			await db.delete(litterImages).where(eq(litterImages.id, params.imageId));
			await supabase.storage.from(STORAGE_BUCKETS.litters).remove([image.storagePath]);

			return { success: true };
		}
	)

	// ── Puppy management within a litter ──
	.post(
		'/:id/puppies',
		async ({ params, body }) => {
			const [puppy] = await db.insert(puppies).values({ ...body, litterId: params.id }).returning();
			return puppy;
		},
		{
			body: t.Object({
				collarColour: t.String(),
				sex: t.Union([t.Literal('male'), t.Literal('female')]),
				colour: t.String(),
				status: t.Optional(t.Union([
					t.Literal('available'), t.Literal('reserved'), t.Literal('placed'),
					t.Literal('retained'), t.Literal('not_for_sale'),
				])),
				birthWeight: t.Optional(t.Nullable(t.Number())),
				notes: t.Optional(t.Nullable(t.String())),
			}),
		}
	)

	.patch(
		'/puppies/:puppyId',
		async ({ params, body, error }) => {
			const [updated] = await db
				.update(puppies)
				.set({ ...body, updatedAt: new Date() })
				.where(eq(puppies.id, params.puppyId))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Puppy not found' });
			return updated;
		},
		{
			body: t.Partial(t.Object({
				collarColour: t.String(),
				sex: t.Union([t.Literal('male'), t.Literal('female')]),
				colour: t.String(),
				status: t.Union([
					t.Literal('available'), t.Literal('reserved'), t.Literal('placed'),
					t.Literal('retained'), t.Literal('not_for_sale'),
				]),
				birthWeight: t.Nullable(t.Number()), currentWeight: t.Nullable(t.Number()),
				notes: t.Nullable(t.String()), profileImageUrl: t.Nullable(t.String()),
			})),
		}
	)

	// ── Admin: delete litter (blocked if clients are assigned) ──
	.delete(
		'/:id',
		async ({ params, error }) => {
			const blocking = await db.query.clients.findMany({
				where: eq(clients.litterId, params.id),
				columns: { firstName: true, lastName: true },
			});
			if (blocking.length > 0) {
				return error(409, {
					error: 'Blocked',
					blockingRecords: blocking.map((c) => `${c.firstName} ${c.lastName}`),
				});
			}
			// Delete orphaned updates (no FK cascade on targetId)
			await db.delete(updates).where(eq(updates.targetId, params.id));
			// Delete litter (puppies + images cascade via FK)
			await db.delete(litters).where(eq(litters.id, params.id));
			return new Response(null, { status: 204 });
		}
	);
