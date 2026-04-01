import Elysia, { t } from 'elysia';
import { eq, asc, max, sql } from 'drizzle-orm';
import { db } from '../../db';
import { clients, clientActivity } from '../../db/schema';
import { adminPlugin, authPlugin } from '../../lib/auth';
import { sendStageEmail } from '../../lib/email';
import { logActivity } from '../../lib/activity';

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
				depositStatus: body.depositStatus ?? 'none',
				stage: 'enquired',
			}).returning();
			sendStageEmail(client.id, 'enquired').catch(console.error);
			logActivity(client.id, 'application_submitted', 'Application submitted', 'client');
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
				depositStatus: t.Optional(t.Union([t.Literal('none'), t.Literal('pending'), t.Literal('paid')])),
				applicationData: applicationDataSchema,
			}),
		}
	)

	// ── Client portal: view own record ──
	.use(authPlugin)
	.get('/me', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user.id),
			with: { puppy: true, litter: true, documents: true, checklist: true },
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });
		return client;
	})

	// ── Client portal: waitlist position ──
	.get('/me/waitlist-position', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user.id),
			columns: { id: true, stage: true },
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });
		if (client.stage !== 'waitlisted') return { position: null, total: null };

		const waitlisted = await db
			.select({ id: clients.id })
			.from(clients)
			.where(eq(clients.stage, 'waitlisted'))
			.orderBy(
				sql`CASE WHEN ${clients.depositStatus} != 'none' THEN 0 ELSE 1 END`,
				asc(clients.priority),
				asc(clients.createdAt),
			);

		const position = waitlisted.findIndex(r => r.id === client.id) + 1;
		return { position: position > 0 ? position : null, total: waitlisted.length };
	})

	// ── Client portal: update own preferences ──
	.patch(
		'/me/preferences',
		async ({ user, body, error }) => {
			const client = await db.query.clients.findFirst({
				where: eq(clients.userId, user.id),
			});
			if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

			const currentApp = (client.applicationData ?? {}) as Record<string, unknown>;
			const updatedApp = { ...currentApp, ...body };

			// Track what changed for the activity log
			const changes: Record<string, { from: unknown; to: unknown }> = {};
			for (const key of Object.keys(body) as (keyof typeof body)[]) {
				if (currentApp[key] !== body[key]) {
					changes[key] = { from: currentApp[key] ?? null, to: body[key] };
				}
			}

			const [updated] = await db
				.update(clients)
				.set({ applicationData: updatedApp, updatedAt: new Date() })
				.where(eq(clients.id, client.id))
				.returning();

			if (Object.keys(changes).length > 0) {
				logActivity(client.id, 'preferences_updated', 'Preferences updated', 'client', { changes });
			}

			return updated;
		},
		{
			body: t.Partial(t.Object({
				preferredBreedSize: t.Nullable(t.String()),
				secondChoiceBreedSize: t.Nullable(t.String()),
				preferredSex: t.Union([t.Literal('male'), t.Literal('female'), t.Literal('no_preference')]),
				preferredColour: t.Nullable(t.String()),
				considerOppositeSex: t.Boolean(),
				considerOtherColour: t.Boolean(),
				considerOtherBreedSize: t.Boolean(),
				considerRehome: t.Boolean(),
				readyTimeframe: t.Nullable(t.Union([t.Literal('asap'), t.Literal('6_months'), t.Literal('1_year')])),
				puppyPurpose: t.Nullable(t.String()),
			})),
		}
	)

	// ── Client portal: opt in to deposit (pending only — admin confirms to paid) ──
	.patch(
		'/me/deposit',
		async ({ user, error }) => {
			const client = await db.query.clients.findFirst({
				where: eq(clients.userId, user.id),
			});
			if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });
			if (client.depositStatus !== 'none') {
				return error(400, { error: 'Bad request', message: 'Deposit status can only be set from none to pending' });
			}
			const [updated] = await db
				.update(clients)
				.set({ depositStatus: 'pending', updatedAt: new Date() })
				.where(eq(clients.id, client.id))
				.returning();
			logActivity(client.id, 'deposit_changed', 'Deposit status changed from none to pending', 'client', { from: 'none', to: 'pending' });
			return updated;
		}
	)

	// ── Admin routes ──
	.use(adminPlugin)

	.get(
		'/admin',
		async ({ query }) => {
			const rows = await db.query.clients.findMany({
				where: query.stage ? eq(clients.stage, query.stage) : undefined,
				orderBy: [asc(clients.priority), asc(clients.createdAt)],
				with: { puppy: true, litter: true },
			});
			return rows;
		},
		{
			query: t.Object({
				stage: t.Optional(t.Union([
					t.Literal('enquired'), t.Literal('approved'), t.Literal('rejected'),
					t.Literal('waitlisted'), t.Literal('placed'), t.Literal('match_requested'),
					t.Literal('matched'), t.Literal('matched_paid'),
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
				documents: true,
				checklist: true,
			},
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client not found' });
		return client;
	})

	.get('/admin/:id/activity', async ({ params }) => {
		return db
			.select()
			.from(clientActivity)
			.where(eq(clientActivity.clientId, params.id))
			.orderBy(desc(clientActivity.createdAt));
	})

	.get('/admin/:id/waitlist-position', async ({ params, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.id, params.id),
			columns: { id: true, stage: true },
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client not found' });
		if (client.stage !== 'waitlisted') return { position: null, total: null };

		const waitlisted = await db
			.select({ id: clients.id })
			.from(clients)
			.where(eq(clients.stage, 'waitlisted'))
			.orderBy(
				sql`CASE WHEN ${clients.depositStatus} != 'none' THEN 0 ELSE 1 END`,
				asc(clients.priority),
				asc(clients.createdAt),
			);

		const position = waitlisted.findIndex(r => r.id === client.id) + 1;
		return { position: position > 0 ? position : null, total: waitlisted.length };
	})

	.patch(
		'/admin/:id',
		async ({ params, body, error }) => {
			// Fetch current values for change detection
			const current = (body.stage || body.depositStatus !== undefined || body.adminNotes !== undefined)
				? await db.query.clients.findFirst({
					where: eq(clients.id, params.id),
					columns: { stage: true, depositStatus: true, adminNotes: true },
				})
				: null;

			// When entering the waitlist, place client at the bottom by assigning
			// a priority one step below the current maximum
			let newPriority: number | undefined;
			if (body.stage === 'waitlisted' && current?.stage !== 'waitlisted') {
				const [{ maxPriority }] = await db
					.select({ maxPriority: max(clients.priority) })
					.from(clients)
					.where(eq(clients.stage, 'waitlisted'));
				newPriority = (maxPriority ?? 0) + 10;
			}

			const [updated] = await db
				.update(clients)
				.set({ ...body, ...(newPriority !== undefined ? { priority: newPriority } : {}), updatedAt: new Date() })
				.where(eq(clients.id, params.id))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Client not found' });

			// Fire stage email only when stage actually changed
			if (body.stage && current && body.stage !== current.stage) {
				sendStageEmail(params.id, body.stage).catch(console.error);
				logActivity(params.id, 'stage_changed', `Stage changed from ${current.stage} to ${body.stage}`, 'admin', { from: current.stage, to: body.stage });
			}
			if (body.depositStatus && current && body.depositStatus !== current.depositStatus) {
				logActivity(params.id, 'deposit_changed', `Deposit status changed from ${current.depositStatus} to ${body.depositStatus}`, 'admin', { from: current.depositStatus, to: body.depositStatus });
			}
			if (body.adminNotes !== undefined && current && body.adminNotes !== current.adminNotes) {
				logActivity(params.id, 'notes_updated', 'Admin notes updated', 'admin');
			}

			return updated;
		},
		{
			body: t.Partial(t.Object({
				stage: t.Union([
					t.Literal('enquired'), t.Literal('approved'), t.Literal('rejected'),
					t.Literal('waitlisted'), t.Literal('placed'), t.Literal('match_requested'),
					t.Literal('matched'), t.Literal('matched_paid'),
				]),
				priority: t.Number(),
				puppyId: t.Nullable(t.String()),
				litterId: t.Nullable(t.String()),
				adminNotes: t.Nullable(t.String()),
				userId: t.Nullable(t.String()),
				depositStatus: t.Union([t.Literal('none'), t.Literal('pending'), t.Literal('paid')]),
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
	)

	// ── Admin: generate portal link without sending email (impersonation / support) ──
	.post(
		'/admin/:id/impersonate',
		async ({ params, error }) => {
			const client = await db.query.clients.findFirst({ where: eq(clients.id, params.id) });
			if (!client) return error(404, { error: 'Not found', message: 'Client not found' });

			const { supabase } = await import('../../lib/supabase');
			const { data, error: linkError } = await supabase.auth.admin.generateLink({
				type: 'magiclink',
				email: client.email,
				options: { redirectTo: `${process.env.CLIENT_URL}/portal/callback` },
			});

			if (linkError || !data?.properties?.action_link) {
				return error(500, { error: 'Link generation failed', message: linkError?.message ?? 'Unknown error' });
			}

			return { url: data.properties.action_link };
		}
	)

	// ── Admin: delete client ──
	.delete(
		'/admin/:id',
		async ({ params, error }) => {
			const existing = await db.query.clients.findFirst({ where: eq(clients.id, params.id) });
			if (!existing) return error(404, { error: 'Not found', message: 'Client not found' });
			await db.delete(clients).where(eq(clients.id, params.id));
			return new Response(null, { status: 204 });
		}
	);
