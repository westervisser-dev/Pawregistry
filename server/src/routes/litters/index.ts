import Elysia, { t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { litters, puppies } from '../../db/schema';
import { adminPlugin } from '../../lib/auth';

export const littersRoutes = new Elysia({ prefix: '/litters' })
	// ── Public: active public litters ──
	.get('/', async () => {
		return db.query.litters.findMany({
			where: eq(litters.isPublic, true),
			orderBy: [desc(litters.createdAt)],
			with: { sire: true, dam: true, puppies: true },
		});
	})

	.get('/:id', async ({ params, error }) => {
		const litter = await db.query.litters.findFirst({
			where: eq(litters.id, params.id),
			with: { sire: true, dam: true, puppies: true },
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
				sireId: t.String(),
				damId: t.String(),
				status: t.Optional(t.Union([
					t.Literal('planned'), t.Literal('confirmed'), t.Literal('born'),
					t.Literal('weaning'), t.Literal('ready'), t.Literal('completed'),
				])),
				expectedDate: t.Optional(t.Nullable(t.String())),
				whelpDate: t.Optional(t.Nullable(t.String())),
				depositAmount: t.Optional(t.Nullable(t.Number())),
				purchasePrice: t.Optional(t.Nullable(t.Number())),
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
			name: t.String(), status: t.String(), whelpDate: t.Nullable(t.String()),
			expectedDate: t.Nullable(t.String()), puppyCount: t.Nullable(t.Number()),
			availableCount: t.Nullable(t.Number()), depositAmount: t.Nullable(t.Number()),
			purchasePrice: t.Nullable(t.Number()), notes: t.Nullable(t.String()), isPublic: t.Boolean(),
		})) }
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
				collarColour: t.String(), sex: t.String(), colour: t.String(), status: t.String(),
				birthWeight: t.Nullable(t.Number()), currentWeight: t.Nullable(t.Number()),
				notes: t.Nullable(t.String()), profileImageUrl: t.Nullable(t.String()),
			})),
		}
	);
