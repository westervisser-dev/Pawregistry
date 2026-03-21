import Elysia, { t } from 'elysia';
import { eq, asc, desc } from 'drizzle-orm';
import { db } from '../../db';
import { clients } from '../../db/schema';
import { adminPlugin, authPlugin } from '../../lib/auth';

const applicationDataSchema = t.Object({
	// ── Existing fields ──
	livingType: t.Union([t.Literal('house'), t.Literal('townhouse'), t.Literal('apartment'), t.Literal('farm'), t.Literal('other')]),
	otherLivingType: t.Optional(t.Nullable(t.String())),
	hasGarden: t.Boolean(),
	hasChildren: t.Boolean(),
	childrenAges: t.Array(t.Number()),
	hasOtherPets: t.Boolean(),
	otherPetsDescription: t.Nullable(t.String()),
	previousDogExperience: t.Boolean(),
	experienceDescription: t.Nullable(t.String()),
	preferredSex: t.Union([t.Literal('male'), t.Literal('female'), t.Literal('no_preference')]),
	preferredColour: t.Nullable(t.String()),
	reasonForBreed: t.Optional(t.Nullable(t.String())),
	references: t.Nullable(t.String()),
	agreedToContract: t.Boolean(),
	// ── Personal ──
	puppyPurpose: t.Optional(t.Nullable(t.String())),
	residenceOwnership: t.Optional(t.Nullable(t.Union([t.Literal('own'), t.Literal('rent'), t.Literal('lease')]))),
	primaryCaregiver: t.Optional(t.Nullable(t.String())),
	allergiesToDogs: t.Optional(t.Boolean()),
	allFamilyMembersAgree: t.Optional(t.Boolean()),
	dogLivesIndoors: t.Optional(t.Boolean()),
	// ── Home ──
	yardSize: t.Optional(t.Nullable(t.String())),
	hasPoolOrDriveway: t.Optional(t.Boolean()),
	poolDrivewayFenced: t.Optional(t.Boolean()),
	puppyDaytimeLocation: t.Optional(t.Nullable(t.String())),
	hoursAlonePerDay: t.Optional(t.Nullable(t.String())),
	someoneHomeDuringDay: t.Optional(t.Boolean()),
	aloneArrangements: t.Optional(t.Nullable(t.String())),
	neighbourhoodRestrictions: t.Optional(t.Boolean()),
	neighbourhoodRestrictionsDetails: t.Optional(t.Nullable(t.String())),
	childrenGenderAges: t.Optional(t.Nullable(t.String())),
	// ── Experience ──
	breedsOwnedPast: t.Optional(t.Nullable(t.String())),
	returnedPetToBreeder: t.Optional(t.Boolean()),
	returnedPetDetails: t.Optional(t.Nullable(t.String())),
	givenPetAway: t.Optional(t.Boolean()),
	givenPetAwayDetails: t.Optional(t.Nullable(t.String())),
	activityLevel: t.Optional(t.Nullable(t.String())),
	willingForObedienceClasses: t.Optional(t.Boolean()),
	// ── Preferences ──
	readyTimeframe: t.Optional(t.Nullable(t.Union([t.Literal('asap'), t.Literal('6_months'), t.Literal('1_year')]))),
	preferredBreedSize: t.Optional(t.Nullable(t.String())),
	secondChoiceBreedSize: t.Optional(t.Nullable(t.String())),
	considerOppositeSex: t.Optional(t.Boolean()),
	considerOtherColour: t.Optional(t.Boolean()),
	considerOtherBreedSize: t.Optional(t.Boolean()),
	considerRehome: t.Optional(t.Boolean()),
});

export const clientsRoutes = new Elysia({ prefix: '/clients' })
	// ── Public: submit application ──
	.post(
		'/apply',
		async ({ body }) => {
			const [client] = await db.insert(clients).values({
				firstName: body.firstName,
				lastName: body.lastName,
				email: body.email,
				phone: body.phone ?? null,
				city: body.city ?? null,
				country: body.country ?? 'ZA',
				applicationData: body.applicationData,
				stage: 'enquiry',
			}).returning();
			return { id: client.id, message: 'Application received. We will be in touch soon.' };
		},
		{
			body: t.Object({
				firstName: t.String(),
				lastName: t.String(),
				email: t.String({ format: 'email' }),
				phone: t.Optional(t.String()),
				city: t.Optional(t.String()),
				country: t.Optional(t.String()),
				applicationData: applicationDataSchema,
			}),
		}
	)

	// ── Client portal: view own record ──
	.use(authPlugin)
	.get('/me', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user.id),
			with: { puppy: true, litter: true, messages: true, documents: true, checklist: true },
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });
		return client;
	})

	// ── Admin routes ──
	.use(adminPlugin)

	.get(
		'/admin',
		async ({ query }) => {
			const rows = await db.query.clients.findMany({
				where: query.stage ? eq(clients.stage, query.stage) : undefined,
				orderBy: [asc(clients.priority), desc(clients.createdAt)],
				with: { puppy: true, litter: true },
			});
			return rows;
		},
		{
			query: t.Object({
				stage: t.Optional(t.Union([
					t.Literal('enquiry'), t.Literal('reviewed'), t.Literal('waitlisted'),
					t.Literal('matched'), t.Literal('placed'), t.Literal('declined'),
				])),
			}),
		}
	)

	.get('/admin/:id', async ({ params, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.id, params.id),
			with: {
				puppy: true,
				litter: true,
				messages: { orderBy: [asc(clients.createdAt)] },
				documents: true,
				checklist: true,
			},
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client not found' });
		return client;
	})

	.patch(
		'/admin/:id',
		async ({ params, body, error }) => {
			const [updated] = await db
				.update(clients)
				.set({ ...body, updatedAt: new Date() })
				.where(eq(clients.id, params.id))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Client not found' });
			return updated;
		},
		{
			body: t.Partial(t.Object({
				stage: t.Union([
					t.Literal('enquiry'), t.Literal('reviewed'), t.Literal('waitlisted'),
					t.Literal('matched'), t.Literal('placed'), t.Literal('declined'),
				]),
				priority: t.Number(),
				puppyId: t.Nullable(t.String()),
				litterId: t.Nullable(t.String()),
				adminNotes: t.Nullable(t.String()),
				userId: t.Nullable(t.String()),
			})),
		}
	)

	// ── Admin: reorder waitlist ──
	.patch(
		'/admin/waitlist/reorder',
		async ({ body }) => {
			await Promise.all(
				body.order.map(({ id, priority }) =>
					db.update(clients).set({ priority, updatedAt: new Date() }).where(eq(clients.id, id))
				)
			);
			return { success: true };
		},
		{ body: t.Object({ order: t.Array(t.Object({ id: t.String(), priority: t.Number() })) }) }
	);
