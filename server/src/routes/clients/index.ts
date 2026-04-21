import Elysia, { t } from 'elysia';
import { eq, asc, desc, max, sql, inArray, count, and, isNotNull } from 'drizzle-orm';
import { db } from '../../db';
import { clients, clientActivity, documentTemplates, clientTemplateChecklist, puppies, puppyInterests, litterInterests, litters, payments } from '../../db/schema';
import { adminPlugin, clientPlugin } from '../../lib/auth';
import { sendStageEmail, sendClientEmail, sendAdminNotificationByTrigger } from '../../lib/email';
import { logActivity } from '../../lib/activity';
import { initializeTransaction, generateReference } from '../../lib/paystack';

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
		async ({ body, set }) => {
			// Check for existing application with this email
			const existing = await db.query.clients.findFirst({
				where: eq(clients.email, body.email.toLowerCase().trim()),
				columns: { id: true },
			});
			if (existing) {
				set.status = 409;
				return {
					error: 'EmailExists',
					message: 'An application already exists for this email address. Please log in to your portal instead.',
				};
			}

			const tier = body.depositTier; // null means no deposit chosen

			const [client] = await db.insert(clients).values({
				firstName: body.firstName,
				lastName: body.lastName,
				email: body.email.toLowerCase().trim(),
				phone: body.phone ?? null,
				city: body.city ?? null,
				country: body.country ?? 'ZA',
				applicationData: body.applicationData,
				depositStatus: 'none',
				depositTier: tier ?? null,
				...(tier ? { depositChosenAt: new Date() } : {}),
				stage: 'enquired',
			}).returning();

			sendStageEmail(client.id, 'enquired').catch(console.error);
			sendAdminNotificationByTrigger('admin_new_application', {
				first_name: client.firstName,
				full_name: `${client.firstName} ${client.lastName}`,
				email: client.email,
				city: client.city ?? '',
				admin_link: `${process.env.CLIENT_URL}/admin/clients/${client.id}`,
			}).catch(console.error);
			logActivity(client.id, 'application_submitted', 'Application submitted', 'client');

			// No deposit chosen — return without Paystack redirect
			if (!tier) {
				return {
					id: client.id,
					authorizationUrl: null,
					message: 'Application received.',
				};
			}

			// Initialise Paystack payment
			const amountRands = tier === 'r5000' ? 5000 : 500;
			const reference = generateReference('dep');
			const { authorizationUrl } = await initializeTransaction({
				email: client.email,
				amountRands,
				reference,
				callbackUrl: `${process.env.CLIENT_URL}/apply/success?ref=${reference}`,
				metadata: { clientId: client.id, tier, source: 'apply' },
			});

			await db.insert(payments).values({
				clientId: client.id,
				type: 'deposit',
				amountRands,
				reference,
				authorizationUrl,
				status: 'pending',
				metadata: { tier, source: 'apply' },
			});

			return {
				id: client.id,
				authorizationUrl,
				reference,
				message: 'Application received. Complete your deposit payment to secure your spot.',
			};
		},
		{
			body: t.Object({
				firstName: t.String(),
				lastName: t.String(),
				email: t.String({ format: 'email' }),
				phone: t.Optional(t.String()),
				city: t.Optional(t.String()),
				country: t.Optional(t.String()),
				depositTier: t.Nullable(t.Union([t.Literal('r5000'), t.Literal('r500')])),
				applicationData: applicationDataSchema,
			}),
		}
	)

	// ── Client portal: view own record ──
	.use(clientPlugin)
	.get('/me', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user.id),
			with: { puppy: true, litter: true },
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
					t.Literal('waitlisted'), t.Literal('puppy_reserved'),
					t.Literal('puppy_booked'), t.Literal('puppy_fully_paid'),
				])),
			}),
		}
	)

	// Returns client IDs that need admin action — used for badges and dashboard
	.get('/admin/attention', async () => {
		// Approved clients where every active template has been uploaded by the client
		const approvedIds = (
			await db.select({ id: clients.id }).from(clients).where(eq(clients.stage, 'approved'))
		).map((c) => c.id);

		let docsCompleteIds: string[] = [];
		if (approvedIds.length > 0) {
			const [{ total }] = await db
				.select({ total: count() })
				.from(documentTemplates)
				.where(eq(documentTemplates.isActive, true));

			if (Number(total) > 0) {
				const uploadedCounts = await db
					.select({ clientId: clientTemplateChecklist.clientId, uploaded: count() })
					.from(clientTemplateChecklist)
					.where(
						and(
							inArray(clientTemplateChecklist.clientId, approvedIds),
							isNotNull(clientTemplateChecklist.uploadedFileUrl),
						),
					)
					.groupBy(clientTemplateChecklist.clientId);

				docsCompleteIds = uploadedCounts
					.filter((row) => Number(row.uploaded) >= Number(total))
					.map((row) => row.clientId);
			}
		}

		return { docsCompleteIds };
	})

	.get('/admin/:id', async ({ params, error }) => {
		try {
			const client = await db.query.clients.findFirst({
				where: eq(clients.id, params.id),
				with: {
					puppy: true,
					litter: true,
				},
			});
			if (!client) return error(404, { error: 'Not found', message: 'Client not found' });
			return client;
		} catch (err) {
			console.error(`[GET /admin/${params.id}] 500:`, err);
			return error(500, { error: 'Internal server error', message: 'Failed to load client' });
		}
	})

	.get('/admin/:id/activity', async ({ params }) => {
		return db
			.select()
			.from(clientActivity)
			.where(eq(clientActivity.clientId, params.id))
			.orderBy(desc(clientActivity.createdAt));
	})

	.get('/admin/:id/waitlist-position', async ({ params, error }) => {
		const ACTIVE_QUEUE_STAGES = ['waitlisted', 'puppy_reserved', 'puppy_booked'] as const;
		type ActiveStage = typeof ACTIVE_QUEUE_STAGES[number];

		const client = await db.query.clients.findFirst({
			where: eq(clients.id, params.id),
			columns: { id: true, stage: true },
		});
		if (!client) return error(404, { error: 'Not found', message: 'Client not found' });
		if (!(ACTIVE_QUEUE_STAGES as readonly string[]).includes(client.stage)) return { position: null, total: null };

		const activeQueue = await db
			.select({ id: clients.id })
			.from(clients)
			.where(inArray(clients.stage, ACTIVE_QUEUE_STAGES as unknown as ActiveStage[]))
			.orderBy(
				sql`CASE WHEN ${clients.depositStatus} != 'none' THEN 0 ELSE 1 END`,
				asc(clients.priority),
				asc(clients.createdAt),
			);

		const position = activeQueue.findIndex(r => r.id === client.id) + 1;
		return { position: position > 0 ? position : null, total: activeQueue.length };
	})

	// ── Admin: get litter interests for a client ──
	.get('/admin/:id/litter-interests', async ({ params }) => {
		return db.query.litterInterests.findMany({
			where: eq(litterInterests.clientId, params.id),
			with: {
				litter: {
					columns: { id: true, name: true, breed: true, status: true, selectionDate: true },
				},
			},
			orderBy: [asc(litterInterests.createdAt)],
		});
	})

	.patch(
		'/admin/:id',
		async ({ params, body, error }) => {
			// Fetch current values for change detection
			const current = (body.stage || body.adminNotes !== undefined || body.depositTier !== undefined)
				? await db.query.clients.findFirst({
					where: eq(clients.id, params.id),
					columns: { stage: true, adminNotes: true, depositTier: true },
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

			const tierChanged = body.depositTier !== undefined && body.depositTier !== current?.depositTier;
			const [updated] = await db
				.update(clients)
				.set({
					...body,
					...(newPriority !== undefined ? { priority: newPriority } : {}),
					...(tierChanged ? { depositChosenAt: new Date() } : {}),
					...(body.stage === 'puppy_reserved' && current?.stage !== 'puppy_reserved' ? { reservedAt: new Date() } : {}),
					...(body.stage && body.stage !== 'puppy_reserved' && current?.stage === 'puppy_reserved' ? { reservedAt: null } : {}),
					...(body.stage === 'puppy_booked' && current?.stage !== 'puppy_booked' ? { matchedAt: new Date() } : {}),
					...(body.stage && body.stage !== 'puppy_booked' && current?.stage === 'puppy_booked' ? { matchedAt: null } : {}),
					updatedAt: new Date(),
				})
				.where(eq(clients.id, params.id))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Client not found' });

			// Fire stage email only when stage actually changed
			if (body.stage && current && body.stage !== current.stage) {
				sendStageEmail(params.id, body.stage).catch(console.error);
				logActivity(params.id, 'stage_changed', `Stage changed from ${current.stage} to ${body.stage}`, 'admin', { from: current.stage, to: body.stage });
				// Notify admin when a client has booked a puppy
				if (body.stage === 'puppy_booked') {
					sendAdminNotificationByTrigger('admin_puppy_booked_stage', {
						first_name: updated.firstName,
						full_name: `${updated.firstName} ${updated.lastName}`,
						email: updated.email,
						admin_link: `${process.env.CLIENT_URL}/admin/clients/${params.id}`,
					}).catch(console.error);
				}
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
					t.Literal('waitlisted'), t.Literal('puppy_reserved'),
					t.Literal('puppy_booked'),
				]),
				priority: t.Number(),
				puppyId: t.Nullable(t.String()),
				litterId: t.Nullable(t.String()),
				adminNotes: t.Nullable(t.String()),
				userId: t.Nullable(t.String()),
				depositTier: t.Nullable(t.Union([t.Literal('r5000'), t.Literal('r500')])),
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
