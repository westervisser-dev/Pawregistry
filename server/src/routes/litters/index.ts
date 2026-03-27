import Elysia, { t } from 'elysia';
import { eq, desc, asc, inArray, and, ne, notInArray } from 'drizzle-orm';
import { db } from '../../db';
import { litters, puppies, litterImages, clients, updates, puppyInterests, clientActivity, litterNotifications } from '../../db/schema';
import { adminPlugin, authPlugin } from '../../lib/auth';
import { supabase, uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';
import { parseBreedSize } from '@paw-registry/shared';

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

	// ── Client-auth routes ──
	.use(authPlugin)

	// Client: express interest in a puppy
	.post(
		'/puppies/:puppyId/interest',
		async ({ params, user, error }) => {
			if (!user) return error(401, { error: 'Unauthorized', message: 'Not authenticated' });

			const client = await db.query.clients.findFirst({
				where: eq(clients.userId, user.id),
				columns: { id: true, firstName: true, lastName: true },
			});
			if (!client) return error(403, { error: 'Forbidden', message: 'No client account found' });

			const puppy = await db.query.puppies.findFirst({
				where: eq(puppies.id, params.puppyId),
				columns: { id: true, status: true, litterId: true },
			});
			if (!puppy) return error(404, { error: 'Not found', message: 'Puppy not found' });
			if (puppy.status !== 'available') return error(400, { error: 'Unavailable', message: 'This puppy is no longer available' });

			// Check notification eligibility: if a batch exists, client must be in it
			const batchRecords = await db.query.litterNotifications.findMany({
				where: eq(litterNotifications.litterId, puppy.litterId),
				columns: { clientId: true },
			});
			if (batchRecords.length > 0) {
				const isNotified = batchRecords.some((n) => n.clientId === client.id);
				if (!isNotified) {
					// Find client's rank among all waitlisted clients sorted by priority
					const allWaitlisted = await db.query.clients.findMany({
						where: eq(clients.stage, 'waitlisted'),
						columns: { id: true, priority: true },
						orderBy: [asc(clients.priority)],
					});
					const position = allWaitlisted.findIndex((c) => c.id === client.id) + 1;
					return error(403, {
						error: 'NotEligible',
						message: `This litter is currently open to the top ${batchRecords.length} waitlisted clients. You are currently #${position || '?'}.`,
						position,
						notifiedUpTo: batchRecords.length,
					});
				}
			}

			// Check for existing interest
			const existing = await db.query.puppyInterests.findFirst({
				where: and(eq(puppyInterests.puppyId, params.puppyId), eq(puppyInterests.clientId, client.id)),
			});
			if (existing) return error(409, { error: 'Conflict', message: 'You have already expressed interest in this puppy' });

			const [interest] = await db
				.insert(puppyInterests)
				.values({ puppyId: params.puppyId, clientId: client.id })
				.returning();

			// Log client activity
			await db.insert(clientActivity).values({
				clientId: client.id,
				type: 'preferences_updated',
				description: `Expressed interest in a puppy.`,
				metadata: { puppyId: params.puppyId, litterId: puppy.litterId },
				actor: 'client',
			});

			return interest;
		}
	)

	// Client: get own interests + eligibility for a litter
	.get(
		'/:id/my-interests',
		async ({ params, user }) => {
			const empty = { interests: [], isNotified: false, position: null as number | null, notifiedUpTo: null as number | null };
			if (!user) return empty;

			const client = await db.query.clients.findFirst({
				where: eq(clients.userId, user.id),
				columns: { id: true },
			});
			if (!client) return empty;

			const litter = await db.query.litters.findFirst({
				where: eq(litters.id, params.id),
				with: { puppies: { columns: { id: true } } },
			});
			if (!litter) return empty;

			const puppyIds = litter.puppies.map((p) => p.id);
			const interests = puppyIds.length > 0
				? await db.query.puppyInterests.findMany({
					where: and(eq(puppyInterests.clientId, client.id), inArray(puppyInterests.puppyId, puppyIds)),
					columns: { puppyId: true, status: true },
				})
				: [];

			// Eligibility check
			const batchRecords = await db.query.litterNotifications.findMany({
				where: eq(litterNotifications.litterId, params.id),
				columns: { clientId: true },
			});

			const isNotified = batchRecords.length === 0 || batchRecords.some((n) => n.clientId === client.id);
			let position: number | null = null;
			if (!isNotified) {
				const allWaitlisted = await db.query.clients.findMany({
					where: eq(clients.stage, 'waitlisted'),
					columns: { id: true },
					orderBy: [asc(clients.priority)],
				});
				position = allWaitlisted.findIndex((c) => c.id === client.id) + 1 || null;
			}

			return {
				interests,
				isNotified,
				position,
				notifiedUpTo: batchRecords.length > 0 ? batchRecords.length : null,
			};
		}
	)

	// ── Admin routes ──
	.use(adminPlugin)

	.get('/admin/all', async () => {
		return db.query.litters.findMany({
			orderBy: [desc(litters.createdAt)],
			with: { sire: true, dam: true, puppies: true },
		});
	})

	// ── Admin: matching client counts for all litters ──
	.get('/admin/matching-counts', async () => {
		const allLitters = await db.query.litters.findMany({
			columns: { id: true, breed: true },
			with: { puppies: { columns: { sex: true, colour: true } } },
		});
		const eligible = await db.query.clients.findMany({
			where: eq(clients.stage, 'waitlisted'),
			columns: { applicationData: true },
		});

		const counts: Record<string, number> = {};
		for (const lit of allLitters) {
			if (!lit.breed) { counts[lit.id] = 0; continue; }
			const litterBS = parseBreedSize(lit.breed);
			if (!litterBS) { counts[lit.id] = 0; continue; }

			let count = 0;
			for (const client of eligible) {
				const app = (client.applicationData ?? {}) as Record<string, unknown>;
				const p1 = parseBreedSize(app.preferredBreedSize as string | null);
				const p2 = parseBreedSize(app.secondChoiceBreedSize as string | null);
				const openSize = !!(app.considerOtherBreedSize);

				const match =
					(p1 && p1.breed === litterBS.breed && p1.size === litterBS.size) ||
					(p2 && p2.breed === litterBS.breed && p2.size === litterBS.size) ||
					(p1 && p1.breed === litterBS.breed && p1.size !== litterBS.size && openSize) ||
					(p2 && p2.breed === litterBS.breed && p2.size !== litterBS.size && openSize);

				if (match) count++;
			}
			counts[lit.id] = count;
		}
		return counts;
	})

	// ── Admin: matching clients for a litter ──
	.get('/:id/matching-clients', async ({ params, error }) => {
		const litter = await db.query.litters.findFirst({
			where: eq(litters.id, params.id),
			with: { puppies: true },
		});
		if (!litter) return error(404, { error: 'Not found', message: 'Litter not found' });
		if (!litter.breed) return error(400, { error: 'Bad request', message: 'Litter has no breed set' });

		const litterBreedSize = parseBreedSize(litter.breed);
		if (!litterBreedSize) return error(400, { error: 'Bad request', message: 'Invalid litter breed format' });

		const eligible = await db.query.clients.findMany({
			where: eq(clients.stage, 'waitlisted'),
			orderBy: [asc(clients.priority)],
		});

		const hasPuppies = litter.puppies.length > 0;
		const puppySexes = hasPuppies ? [...new Set(litter.puppies.map((p) => p.sex))] : [];
		const puppyColours = hasPuppies ? [...new Set(litter.puppies.map((p) => p.colour.toLowerCase()))] : [];

		const results = eligible
			.map((client) => {
				const app = (client.applicationData ?? {}) as Record<string, unknown>;
				const pref1 = parseBreedSize(app.preferredBreedSize as string | null);
				const pref2 = parseBreedSize(app.secondChoiceBreedSize as string | null);
				const prefSex = (app.preferredSex as string | null) ?? null;
				const prefColour = ((app.preferredColour as string | null) ?? '').toLowerCase().trim();
				const openToOppositeSex = !!(app.considerOppositeSex);
				const openToOtherColour = !!(app.considerOtherColour);
				const openToOtherBreedSize = !!(app.considerOtherBreedSize);

				let score = 0;
				const reasons: string[] = [];

				const exactMatch1 = pref1 && pref1.breed === litterBreedSize.breed && pref1.size === litterBreedSize.size;
				const exactMatch2 = pref2 && pref2.breed === litterBreedSize.breed && pref2.size === litterBreedSize.size;
				const breedOnlyMatch1 = pref1 && pref1.breed === litterBreedSize.breed && pref1.size !== litterBreedSize.size;
				const breedOnlyMatch2 = pref2 && pref2.breed === litterBreedSize.breed && pref2.size !== litterBreedSize.size;

				if (exactMatch1) {
					score += 50;
					reasons.push('First choice breed match');
				} else if (exactMatch2) {
					score += 35;
					reasons.push('Second choice breed match');
				} else if (breedOnlyMatch1 && openToOtherBreedSize) {
					score += 25;
					reasons.push('First choice breed, open to other size');
				} else if (breedOnlyMatch2 && openToOtherBreedSize) {
					score += 20;
					reasons.push('Second choice breed, open to other size');
				} else {
					return null;
				}

				if (hasPuppies && prefSex) {
					if (prefSex === 'no_preference') {
						score += 20;
						reasons.push('No sex preference');
					} else if (puppySexes.includes(prefSex as 'male' | 'female')) {
						score += 20;
						reasons.push(`Sex preference matches (${prefSex})`);
					} else if (openToOppositeSex) {
						score += 10;
						reasons.push('Open to opposite sex');
					}
				}

				if (hasPuppies && prefColour) {
					if (puppyColours.some((c) => c.includes(prefColour) || prefColour.includes(c))) {
						score += 15;
						reasons.push(`Colour preference matches`);
					} else if (openToOtherColour) {
						score += 8;
						reasons.push('Open to other colour');
					}
				}

				if (client.depositStatus === 'paid') {
					score += 10;
					reasons.push('Deposit paid');
				} else if (client.depositStatus === 'pending') {
					score += 5;
					reasons.push('Deposit pending');
				}

				return {
					id: client.id,
					firstName: client.firstName,
					lastName: client.lastName,
					email: client.email,
					city: client.city,
					stage: client.stage,
					depositStatus: client.depositStatus,
					priority: client.priority,
					preferredBreedSize: (app.preferredBreedSize as string | null) ?? null,
					secondChoiceBreedSize: (app.secondChoiceBreedSize as string | null) ?? null,
					preferredSex: prefSex,
					preferredColour: (app.preferredColour as string | null) ?? null,
					considerOppositeSex: openToOppositeSex,
					considerOtherColour: openToOtherColour,
					considerOtherBreedSize: openToOtherBreedSize,
					considerRehome: !!(app.considerRehome),
					score,
					matchReasons: reasons,
				};
			})
			.filter((r): r is NonNullable<typeof r> => r !== null)
			.sort((a, b) => b.score - a.score || a.priority - b.priority);

		return results;
	})

	// ── Admin: get all interests for all puppies in a litter ──
	.get('/admin/interests/:litterId', async ({ params, error }) => {
		const litter = await db.query.litters.findFirst({
			where: eq(litters.id, params.litterId),
			with: { puppies: { columns: { id: true } } },
		});
		if (!litter) return error(404, { error: 'Not found', message: 'Litter not found' });

		const puppyIds = litter.puppies.map((p) => p.id);
		if (puppyIds.length === 0) return [];

		const interests = await db.query.puppyInterests.findMany({
			where: inArray(puppyInterests.puppyId, puppyIds),
			with: {
				client: {
					columns: { id: true, firstName: true, lastName: true, email: true, city: true, stage: true, depositStatus: true },
				},
			},
			orderBy: [asc(puppyInterests.createdAt)],
		});

		return interests;
	})

	// ── Admin: get notifications for a litter (who was notified + when) ──
	.get('/admin/notifications/:litterId', async ({ params }) => {
		return db.query.litterNotifications.findMany({
			where: eq(litterNotifications.litterId, params.litterId),
			with: {
				client: {
					columns: { id: true, firstName: true, lastName: true, email: true, city: true, priority: true, depositStatus: true },
				},
			},
			orderBy: [asc(litterNotifications.notifiedAt)],
		});
	})

	// ── Admin: notify next N breed-matched waitlisted clients by priority ──
	.post(
		'/admin/notifications/:litterId',
		async ({ params, body, error }) => {
			const litter = await db.query.litters.findFirst({
				where: eq(litters.id, params.litterId),
			});
			if (!litter) return error(404, { error: 'Not found', message: 'Litter not found' });
			if (!litter.breed) return error(400, { error: 'Bad request', message: 'Set a breed on this litter first' });

			// Already-notified client IDs
			const alreadyNotified = await db.query.litterNotifications.findMany({
				where: eq(litterNotifications.litterId, params.litterId),
				columns: { clientId: true },
			});
			const notifiedIds = new Set(alreadyNotified.map((n) => n.clientId));

			// Breed-matched waitlisted clients sorted by priority, excluding already-notified
			const litterBS = parseBreedSize(litter.breed);
			const allWaitlisted = await db.query.clients.findMany({
				where: notifiedIds.size > 0
					? and(eq(clients.stage, 'waitlisted'), notInArray(clients.id, [...notifiedIds]))
					: eq(clients.stage, 'waitlisted'),
				orderBy: [asc(clients.priority)],
			});

			const matched = allWaitlisted.filter((c) => {
				if (!litterBS) return false;
				const app = (c.applicationData ?? {}) as Record<string, unknown>;
				const p1 = parseBreedSize(app.preferredBreedSize as string | null);
				const p2 = parseBreedSize(app.secondChoiceBreedSize as string | null);
				const openSize = !!(app.considerOtherBreedSize);
				return (
					(p1 && p1.breed === litterBS.breed && p1.size === litterBS.size) ||
					(p2 && p2.breed === litterBS.breed && p2.size === litterBS.size) ||
					(p1 && p1.breed === litterBS.breed && openSize) ||
					(p2 && p2.breed === litterBS.breed && openSize)
				);
			}).slice(0, body.count);

			if (matched.length === 0) return error(400, { error: 'No candidates', message: 'No more matching waitlisted clients to notify' });

			const created = await db
				.insert(litterNotifications)
				.values(matched.map((c) => ({ litterId: params.litterId, clientId: c.id })))
				.returning();

			// TODO: send emails via Resend to each matched client
			// matched.forEach(c => sendNotificationEmail(c, litter))

			return { notified: created.length, clients: matched.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, priority: c.priority })) };
		},
		{ body: t.Object({ count: t.Number() }) }
	)

	// ── Admin: approve or reject an interest ──
	.patch(
		'/admin/interests/:interestId',
		async ({ params, body, error }) => {
			const interest = await db.query.puppyInterests.findFirst({
				where: eq(puppyInterests.id, params.interestId),
				with: {
					client: { columns: { id: true, firstName: true, lastName: true } },
					puppy: { columns: { id: true, litterId: true } },
				},
			});
			if (!interest) return error(404, { error: 'Not found', message: 'Interest not found' });

			const [updated] = await db
				.update(puppyInterests)
				.set({ status: body.status, updatedAt: new Date() })
				.where(eq(puppyInterests.id, params.interestId))
				.returning();

			if (body.status === 'approved') {
				// Mark puppy as reserved
				await db.update(puppies).set({ status: 'reserved', updatedAt: new Date() }).where(eq(puppies.id, interest.puppyId));

				// Auto-reject all other pending interests for this puppy
				await db
					.update(puppyInterests)
					.set({ status: 'rejected', updatedAt: new Date() })
					.where(and(
						eq(puppyInterests.puppyId, interest.puppyId),
						ne(puppyInterests.id, params.interestId),
						eq(puppyInterests.status, 'pending'),
					));

				// Log client activity
				await db.insert(clientActivity).values({
					clientId: interest.clientId,
					type: 'stage_changed',
					description: `Puppy interest approved by breeder. Puppy reserved.`,
					metadata: { puppyId: interest.puppyId, interestId: interest.id },
					actor: 'admin',
				});
			}

			return updated;
		},
		{
			body: t.Object({
				status: t.Union([t.Literal('approved'), t.Literal('rejected')]),
			}),
		}
	)

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
			await db.delete(updates).where(eq(updates.targetId, params.id));
			await db.delete(litters).where(eq(litters.id, params.id));
			return new Response(null, { status: 204 });
		}
	);
