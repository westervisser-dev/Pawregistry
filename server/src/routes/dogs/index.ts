import Elysia, { t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { dogs, healthCerts } from '../../db/schema';
import { adminPlugin } from '../../lib/auth';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';

export const dogsRoutes = new Elysia({ prefix: '/dogs' })
	// ── Public: list all active dogs (breeding dogs shown on public site) ──
	.get(
		'/',
		async ({ query }) => {
			const rows = await db.query.dogs.findMany({
				where: query.status ? eq(dogs.status, query.status as 'active' | 'retired' | 'deceased') : undefined,
				orderBy: [desc(dogs.createdAt)],
				with: { healthCerts: true },
			});
			return rows;
		},
		{
			query: t.Object({ status: t.Optional(t.String()) }),
		}
	)

	// ── Public: single dog with pedigree depth ──
	.get(
		'/:id',
		async ({ params, error }) => {
			const dog = await db.query.dogs.findFirst({
				where: eq(dogs.id, params.id),
				with: {
					healthCerts: true,
					sire: true,
					dam: true,
				},
			});
			if (!dog) return error(404, { error: 'Not found', message: 'Dog not found' });
			return dog;
		}
	)

	// ── Public: pedigree tree (up to 4 generations) ──
	.get('/:id/pedigree', async ({ params, error }) => {
		const fetchAncestors = async (id: string, depth: number): Promise<unknown> => {
			if (depth === 0 || !id) return null;
			const dog = await db.query.dogs.findFirst({ where: eq(dogs.id, id) });
			if (!dog) return null;
			return {
				...dog,
				sire: dog.sireId ? await fetchAncestors(dog.sireId, depth - 1) : null,
				dam: dog.damId ? await fetchAncestors(dog.damId, depth - 1) : null,
			};
		};
		const tree = await fetchAncestors(params.id, 4);
		if (!tree) return error(404, { error: 'Not found', message: 'Dog not found' });
		return tree;
	})

	// ── Admin: create dog ──
	.use(adminPlugin)
	.post(
		'/',
		async ({ body }) => {
			const [dog] = await db.insert(dogs).values(body).returning();
			return dog;
		},
		{
			body: t.Object({
				name: t.String(),
				callName: t.Optional(t.Nullable(t.String())),
				registeredName: t.Optional(t.Nullable(t.String())),
				breed: t.String(),
				sex: t.Union([t.Literal('male'), t.Literal('female')]),
				dob: t.String(),
				colour: t.String(),
				status: t.Optional(t.Union([t.Literal('active'), t.Literal('retired'), t.Literal('deceased')])),
				sireId: t.Optional(t.Nullable(t.String())),
				damId: t.Optional(t.Nullable(t.String())),
				microchipNumber: t.Optional(t.Nullable(t.String())),
				registrationNumber: t.Optional(t.Nullable(t.String())),
				notes: t.Optional(t.Nullable(t.String())),
			}),
		}
	)

	// ── Admin: update dog ──
	.patch(
		'/:id',
		async ({ params, body, error }) => {
			const [updated] = await db
				.update(dogs)
				.set({ ...body, updatedAt: new Date() })
				.where(eq(dogs.id, params.id))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Dog not found' });
			return updated;
		},
		{
			body: t.Partial(
				t.Object({
					name: t.String(),
					callName: t.Nullable(t.String()),
					registeredName: t.Nullable(t.String()),
					breed: t.String(),
					sex: t.Union([t.Literal('male'), t.Literal('female')]),
					dob: t.String(),
					colour: t.String(),
					status: t.Union([t.Literal('active'), t.Literal('retired'), t.Literal('deceased')]),
					sireId: t.Nullable(t.String()),
					damId: t.Nullable(t.String()),
					microchipNumber: t.Nullable(t.String()),
					registrationNumber: t.Nullable(t.String()),
					notes: t.Nullable(t.String()),
				})
			),
		}
	)

	// ── Admin: upload dog image ──
	.post(
		'/:id/images',
		async ({ params, body, error }) => {
			const dog = await db.query.dogs.findFirst({ where: eq(dogs.id, params.id) });
			if (!dog) return error(404, { error: 'Not found', message: 'Dog not found' });

			const file = body.file as File;
			const path = `${params.id}/${Date.now()}-${file.name}`;
			const url = await uploadFile(STORAGE_BUCKETS.dogs, path, file, file.type);

			const isProfile = body.isProfile === 'true';
			const newImageUrls = [...(dog.imageUrls ?? []), url];

			const [updated] = await db
				.update(dogs)
				.set({
					imageUrls: newImageUrls,
					profileImageUrl: isProfile ? url : dog.profileImageUrl,
					updatedAt: new Date(),
				})
				.where(eq(dogs.id, params.id))
				.returning();

			return updated;
		},
		{ body: t.Object({ file: t.File(), isProfile: t.Optional(t.String()) }) }
	)

	// ── Admin: add health cert ──
	.post(
		'/:id/health-certs',
		async ({ params, body }) => {
			const [cert] = await db
				.insert(healthCerts)
				.values({ ...body, dogId: params.id })
				.returning();
			return cert;
		},
		{
			body: t.Object({
				type: t.Union([
					t.Literal('ofa_hips'), t.Literal('ofa_elbows'), t.Literal('ofa_eyes'),
					t.Literal('ofa_heart'), t.Literal('dna_panel'), t.Literal('brucellosis'), t.Literal('other'),
				]),
				result: t.Union([
					t.Literal('pass'), t.Literal('fail'), t.Literal('pending'),
					t.Literal('excellent'), t.Literal('good'), t.Literal('fair'),
				]),
				certNumber: t.Optional(t.Nullable(t.String())),
				issuedBy: t.Optional(t.Nullable(t.String())),
				issuedAt: t.String(),
				expiresAt: t.Optional(t.Nullable(t.String())),
				notes: t.Optional(t.Nullable(t.String())),
			}),
		}
	);
