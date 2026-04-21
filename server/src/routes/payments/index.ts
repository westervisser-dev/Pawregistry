import Elysia, { t } from 'elysia';
import { eq, desc, and, sum, or, ne, inArray, count, lt, sql, isNotNull } from 'drizzle-orm';
import { db } from '../../db';
import { payments, clients, puppies, litters, puppyInterests, invoices } from '../../db/schema';
import { adminPlugin, clientPlugin } from '../../lib/auth';
import { logActivity } from '../../lib/activity';
import { sendClientEmailWithVars, sendAdminNotificationByTrigger } from '../../lib/email';
import {
	initializeTransaction,
	verifyWebhookSignature,
	verifyTransaction,
	generateReference,
} from '../../lib/paystack';

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

// ─── Shared: handle a confirmed payment ──────────────────────────────────────
// Called from both the webhook and the manual mark-paid endpoint.

async function handlePaymentSuccess(paymentId: string): Promise<void> {
	const payment = await db.query.payments.findFirst({
		where: eq(payments.id, paymentId),
		with: { client: true },
	});

	if (!payment) return;
	if (payment.status === 'complete') return; // idempotency guard

	// Mark payment complete
	await db.update(payments)
		.set({ status: 'complete', paidAt: new Date() })
		.where(eq(payments.id, paymentId));

	const meta = payment.metadata as Record<string, unknown>;

	if (payment.type === 'deposit') {
		const tier = (meta.tier as 'r5000' | 'r500') ?? 'r5000';
		await db.update(clients)
			.set({ depositStatus: 'paid', depositTier: tier, updatedAt: new Date() })
			.where(eq(clients.id, payment.clientId));

		logActivity(
			payment.clientId,
			'deposit_paid',
			`Deposit of R${payment.amountRands.toLocaleString()} received (${tier === 'r5000' ? 'Secured' : 'Standard'}).`,
			'system',
			{ paymentId, amountRands: payment.amountRands, tier },
		);

		await sendClientEmailWithVars(payment.clientId, 'payment_confirmed', {
			amount: `R${payment.amountRands.toLocaleString()}`,
			payment_type: 'deposit',
		});

		await sendAdminNotificationByTrigger('admin_deposit_received', {
			first_name: payment.client.firstName,
			full_name: `${payment.client.firstName} ${payment.client.lastName}`,
			amount: `R${payment.amountRands.toLocaleString()}`,
			deposit_tier: tier === 'r5000' ? 'R5,000 secured' : 'R500 standard',
			admin_link: `${CLIENT_URL}/admin/clients/${payment.clientId}`,
		});
	}

	if (payment.type === 'booking') {
		const puppyId = meta.puppyId as string;
		const puppyName = (meta.puppyName as string) ?? 'your puppy';
		const tier = (meta.tier as 'r5000' | 'r500') ?? 'r5000';
		const now = new Date();

		// Update deposit status, stage → puppy_booked, set puppyId + matchedAt, clear reservedAt
		await db.update(clients)
			.set({
				depositStatus: 'paid',
				depositTier: tier,
				stage: 'puppy_booked',
				puppyId: puppyId ?? null,
				matchedAt: now,
				reservedAt: null,
				updatedAt: now,
			})
			.where(eq(clients.id, payment.clientId));

		// Puppy → booked, clear expiry; mark the interest as approved
		if (puppyId) {
			await db.update(puppies)
				.set({ status: 'booked', bookingExpiresAt: null, updatedAt: now })
				.where(eq(puppies.id, puppyId));

			await db.update(puppyInterests)
				.set({ status: 'approved', updatedAt: now })
				.where(and(
					eq(puppyInterests.puppyId, puppyId),
					eq(puppyInterests.clientId, payment.clientId),
					or(eq(puppyInterests.status, 'pending'), eq(puppyInterests.status, 'approved')),
				));

			// Auto-reject all other pending interests for this puppy
			await db
				.update(puppyInterests)
				.set({ status: 'rejected', updatedAt: now })
				.where(and(
					eq(puppyInterests.puppyId, puppyId),
					ne(puppyInterests.clientId, payment.clientId),
					eq(puppyInterests.status, 'pending'),
				));

			// Auto-transition litter to 'booked' if all puppies are now non-available
			const puppy = await db.query.puppies.findFirst({ where: eq(puppies.id, puppyId), columns: { litterId: true } });
			if (puppy) {
				const litter = await db.query.litters.findFirst({
					where: eq(litters.id, puppy.litterId),
					columns: { status: true },
					with: { puppies: { columns: { status: true } } },
				});
				if (litter && litter.puppies.length > 0 && litter.status === 'available') {
					const allTaken = litter.puppies.every((p) => p.status !== 'available');
					if (allTaken) {
						await db.update(litters)
							.set({ status: 'booked', updatedAt: now })
							.where(eq(litters.id, puppy.litterId));
					}
				}
			}
		}

		logActivity(
			payment.clientId,
			'booking_payment_received',
			`Booking payment of R${payment.amountRands.toLocaleString()} received. ${puppyName} is now booked.`,
			'system',
			{ paymentId, puppyId, amountRands: payment.amountRands },
		);

		await sendClientEmailWithVars(payment.clientId, 'puppy_booked', {
			amount: `R${payment.amountRands.toLocaleString()}`,
			puppy_name: puppyName,
			payment_type: 'booking',
		});

		await sendAdminNotificationByTrigger('admin_booking_payment_received', {
			first_name: payment.client.firstName,
			full_name: `${payment.client.firstName} ${payment.client.lastName}`,
			amount: `R${payment.amountRands.toLocaleString()}`,
			puppy_name: puppyName,
			admin_link: `${CLIENT_URL}/admin/clients/${payment.clientId}`,
		});
	}

	if (payment.type === 'final') {
		const puppyId = meta.puppyId as string | undefined;
		const totalPriceRands = (meta.totalPriceRands as number) ?? 0;

		// Check if ALL payments sum up to the total price
		const paidResult = await db
			.select({ total: sum(payments.amountRands) })
			.from(payments)
			.where(and(eq(payments.clientId, payment.clientId), eq(payments.status, 'complete')));
		const totalPaid = Number(paidResult[0]?.total ?? 0);
		const fullyPaid = totalPriceRands > 0 && totalPaid >= totalPriceRands;

		if (fullyPaid) {
			await db.update(clients)
				.set({ stage: 'puppy_fully_paid', updatedAt: new Date() })
				.where(eq(clients.id, payment.clientId));

			if (puppyId) {
				await db.update(puppies)
					.set({ status: 'puppy_fully_paid', updatedAt: new Date() })
					.where(eq(puppies.id, puppyId));
			}

			logActivity(
				payment.clientId,
				'final_payment_received',
				`Final payment of R${payment.amountRands.toLocaleString()} received. Client is ready to collect.`,
				'system',
				{ paymentId, puppyId, amountRands: payment.amountRands, totalPaid },
			);

			await sendClientEmailWithVars(payment.clientId, 'payment_confirmed', {
				amount: `R${payment.amountRands.toLocaleString()}`,
				payment_type: 'final',
			});

			await sendAdminNotificationByTrigger('admin_final_payment_received', {
				first_name: payment.client.firstName,
				full_name: `${payment.client.firstName} ${payment.client.lastName}`,
				amount: `R${payment.amountRands.toLocaleString()}`,
				admin_link: `${CLIENT_URL}/admin/clients/${payment.clientId}`,
			});
		} else {
			// Partial / instalment payment — do NOT transition to fully paid yet
			const isInstalment = !!meta.isInstalment;
			const instalmentLabel = isInstalment
				? `Instalment ${Number(meta.instalmentIndex) + 1} of ${meta.instalmentTotal}`
				: 'Partial final payment';

			logActivity(
				payment.clientId,
				'instalment_payment_received',
				`${instalmentLabel} of R${payment.amountRands.toLocaleString()} received. Total paid so far: R${totalPaid.toLocaleString()}.`,
				'system',
				{ paymentId, puppyId, amountRands: payment.amountRands, totalPaid, instalmentIndex: meta.instalmentIndex, instalmentTotal: meta.instalmentTotal },
			);

			await sendClientEmailWithVars(payment.clientId, 'payment_confirmed', {
				amount: `R${payment.amountRands.toLocaleString()}`,
				payment_type: 'instalment',
			});

			await sendAdminNotificationByTrigger('admin_instalment_received', {
				first_name: payment.client.firstName,
				full_name: `${payment.client.firstName} ${payment.client.lastName}`,
				amount: `R${payment.amountRands.toLocaleString()}`,
				instalment_label: instalmentLabel,
				total_paid: `R${totalPaid.toLocaleString()}`,
				total_price: `R${totalPriceRands.toLocaleString()}`,
				admin_link: `${CLIENT_URL}/admin/clients/${payment.clientId}`,
			});
		}
	}

	// ── Sync linked invoice paidRands ────────────────────────────────────────
	// Re-fetch to get the invoiceId (may have been set after initial fetch)
	const freshPayment = await db.query.payments.findFirst({
		where: eq(payments.id, paymentId),
		columns: { invoiceId: true, clientId: true },
	});

	if (freshPayment?.invoiceId) {
		// Payment is explicitly linked — sync that invoice from its linked payments only
		const paidResult = await db
			.select({ total: sum(payments.amountRands) })
			.from(payments)
			.where(and(eq(payments.invoiceId, freshPayment.invoiceId), eq(payments.status, 'complete')));
		const newPaid = Number(paidResult[0]?.total ?? 0);

		const invoice = await db.query.invoices.findFirst({
			where: eq(invoices.id, freshPayment.invoiceId),
			columns: { totalRands: true, status: true },
		});
		if (invoice) {
			const newStatus = newPaid >= invoice.totalRands ? 'paid' : invoice.status;
			await db.update(invoices)
				.set({ paidRands: newPaid, status: newStatus, updatedAt: new Date() })
				.where(eq(invoices.id, freshPayment.invoiceId));
		}
	} else if (freshPayment?.clientId) {
		// Payment is not linked to an invoice — find the client's open invoice and sync
		// paidRands from ALL client complete payments (matches invoice creation logic)
		const openInvoice = await db.query.invoices.findFirst({
			where: and(
				eq(invoices.clientId, freshPayment.clientId),
				ne(invoices.status, 'cancelled'),
				ne(invoices.status, 'paid'),
			),
			columns: { id: true, totalRands: true, status: true },
		});
		if (openInvoice) {
			const paidResult = await db
				.select({ total: sum(payments.amountRands) })
				.from(payments)
				.where(and(eq(payments.clientId, freshPayment.clientId), eq(payments.status, 'complete')));
			const newPaid = Number(paidResult[0]?.total ?? 0);
			const newStatus = newPaid >= openInvoice.totalRands ? 'paid' : openInvoice.status;
			await db.update(invoices)
				.set({ paidRands: newPaid, status: newStatus, updatedAt: new Date() })
				.where(eq(invoices.id, openInvoice.id));
		}
	}
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export const paymentsRoutes = new Elysia({ prefix: '/payments' })

	// ── Paystack webhook (no auth — raw body required) ────────────────────────
	.post(
		'/webhook',
		async ({body, headers, status}) => {
			const rawBody = body as string;
			const signature = headers['x-paystack-signature'] ?? '';

			// 1. Verify signature — return 200 regardless to avoid Paystack retries
			if (!verifyWebhookSignature(rawBody, signature)) {
				console.warn('Paystack webhook: invalid signature');
				return { received: true };
			}

			let payload: { event: string; data: Record<string, unknown> };
			try {
				payload = JSON.parse(rawBody) as typeof payload;
			} catch {
				console.warn('Paystack webhook: invalid JSON');
				return { received: true };
			}

			// 2. Only handle charge.success
			if (payload.event !== 'charge.success') return { received: true };

			const data = payload.data;
			const reference = data.reference as string;
			const paystackId = String(data.id);
			const amountKobo = data.amount as number;

			// 3. Look up our payment record
			const payment = await db.query.payments.findFirst({
				where: eq(payments.reference, reference),
			});
			if (!payment) {
				console.warn(`Paystack webhook: unknown reference ${reference}`);
				return { received: true };
			}

			// 4. Idempotency
			if (payment.status === 'complete') return { received: true };

			// 5. Secondary verify via Paystack API
			try {
				const verified = await verifyTransaction(reference);
				if (verified.status !== 'success') {
					console.warn(`Paystack webhook: transaction ${reference} not success`);
					return { received: true };
				}
				// 6. Amount check (allow 1 cent tolerance for rounding)
				const paidRands = amountKobo / 100;
				if (Math.abs(paidRands - payment.amountRands) > 0.01) {
					console.warn(`Paystack webhook: amount mismatch for ${reference} — expected ${payment.amountRands}, got ${paidRands}`);
					return { received: true };
				}
			} catch (e) {
				console.error('Paystack verify failed:', e);
				return { received: true };
			}

			// 7. Store Paystack ID then run success logic
			await db.update(payments)
				.set({ paystackId, metadata: { ...(payment.metadata as object), paystackData: data } })
				.where(eq(payments.id, payment.id));

			await handlePaymentSuccess(payment.id);

			return { received: true };
		},
		{ type: 'text' }, // raw body so HMAC can be verified against original bytes
	)

	// ── Public: check payment status by reference (for post-Paystack redirect) ──
	.get(
		'/status/:reference',
		async ({params, status}) => {
			const payment = await db.query.payments.findFirst({
				where: eq(payments.reference, params.reference),
				columns: { status: true, type: true, amountRands: true },
			});
			if (!payment) return status(404, { error: 'NotFound', message: 'Payment not found' });

			// Try to verify with Paystack if still pending
			if (payment.status === 'pending') {
				try {
					const verified = await verifyTransaction(params.reference);
					if (verified.status === 'success') {
						// Webhook will handle the full success flow; just report the current DB status
						return { status: 'complete', type: payment.type, amountRands: payment.amountRands };
					}
				} catch {
					// Paystack API unavailable or not yet paid — leave as pending
				}
			}

			return { status: payment.status, type: payment.type, amountRands: payment.amountRands };
		},
		{ params: t.Object({ reference: t.String() }) },
	)

	// ── Client: initiate a deposit payment from portal ────────────────────────
	.use(clientPlugin)
	.post(
		'/deposit',
		async ({body, user, status}) => {
			const client = await db.query.clients.findFirst({
				where: eq(clients.userId, user!.id),
			});
			if (!client) return status(404, { error: 'NotFound', message: 'Client not found' });

			const tier = body.tier;
			const amountRands = tier === 'r5000' ? 5000 : 500;

			// If upgrading from r500 → r5000, only charge the difference
			let chargeRands = amountRands;
			if (tier === 'r5000' && client.depositStatus === 'paid' && client.depositTier === 'r500') {
				chargeRands = 4500;
			}

			// Mark any previous pending deposit payments as cancelled
			await db.update(payments)
				.set({ status: 'cancelled' })
				.where(and(
					eq(payments.clientId, client.id),
					eq(payments.type, 'deposit'),
					eq(payments.status, 'pending'),
				));

			const reference = generateReference('dep');

			const { authorizationUrl } = await initializeTransaction({
				email: client.email,
				amountRands: chargeRands,
				reference,
				callbackUrl: `${CLIENT_URL}/portal/payments?ref=${reference}`,
				metadata: { clientId: client.id, tier, chargeRands },
			});

			const [payment] = await db.insert(payments).values({
				clientId: client.id,
				type: 'deposit',
				amountRands: chargeRands,
				reference,
				authorizationUrl,
				status: 'pending',
				metadata: { tier },
			}).returning();

			// Update client deposit tier immediately so they know what they selected
			await db.update(clients)
				.set({ depositTier: tier, depositChosenAt: new Date(), updatedAt: new Date() })
				.where(eq(clients.id, client.id));

			return { authorizationUrl, paymentId: payment.id };
		},
		{
			body: t.Object({
				tier: t.Union([t.Literal('r5000'), t.Literal('r500')]),
			}),
		},
	)

	// ── Client: get own payments ──────────────────────────────────────────────
	// Auto-verifies any pending payments against Paystack so the client always
	// sees the correct state even if the webhook was delayed or missed.
	.get('/mine', async ({user, status}) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user!.id),
		});
		if (!client) return status(404, { error: 'NotFound', message: 'Client not found' });

		const clientPayments = await db.query.payments.findMany({
			where: eq(payments.clientId, client.id),
			orderBy: [desc(payments.createdAt)],
		});

		const pending = clientPayments.filter((p) => p.status === 'pending' && p.reference);
		if (pending.length > 0) {
			let anyUpdated = false;
			await Promise.all(
				pending.map(async (p) => {
					try {
						const verified = await verifyTransaction(p.reference);
						if (verified.status === 'success') {
							await handlePaymentSuccess(p.id);
							anyUpdated = true;
						}
					} catch {
						// Not paid yet or Paystack API unavailable — leave as pending
					}
				}),
			);
			// Re-fetch so the client gets the updated statuses
			if (anyUpdated) {
				return db.query.payments.findMany({
					where: eq(payments.clientId, client.id),
					orderBy: [desc(payments.createdAt)],
				});
			}
		}

		return clientPayments;
	})

	// ── Admin: get all payments for a client ──────────────────────────────────
	.use(adminPlugin)
	.get(
		'/client/:clientId',
		async ({params}) => {
			return db.query.payments.findMany({
				where: eq(payments.clientId, params.clientId),
				orderBy: [desc(payments.createdAt)],
			});
		},
		{ params: t.Object({ clientId: t.String() }) },
	)

	// ── Admin: manual mark-paid ───────────────────────────────────────────────
	.patch(
		'/:id/mark-paid',
		async ({params, status}) => {
			const payment = await db.query.payments.findFirst({
				where: eq(payments.id, params.id),
			});
			if (!payment) return status(404, { error: 'NotFound', message: 'Payment not found' });
			if (payment.status === 'complete') {
				return status(409, { error: 'Conflict', message: 'Payment already complete' });
			}

			// For booking payments, ensure we have puppyId in metadata
			await handlePaymentSuccess(payment.id);

			logActivity(
				payment.clientId,
				'payment_marked_paid',
				`Payment of R${payment.amountRands.toLocaleString()} manually marked as paid by admin.`,
				'admin',
				{ paymentId: payment.id },
			);

			return { success: true };
		},
		{ params: t.Object({ id: t.String() }) },
	)

	// ── Admin: payment summary for a client ──────────────────────────────────
	.get(
		'/summary/:clientId',
		async ({params, status}) => {
			const client = await db.query.clients.findFirst({
				where: eq(clients.id, params.clientId),
			});
			if (!client) return status(404, { error: 'NotFound', message: 'Client not found' });

			let puppyPriceRands: number | null = null;
			let shippingRands: number | null = null;

			if (client.puppyId) {
				const puppy = await db.query.puppies.findFirst({
					where: eq(puppies.id, client.puppyId),
					with: { litter: { columns: { shippingRands: true } } },
				});
				if (puppy) {
					puppyPriceRands = puppy.priceRands;
					shippingRands = puppy.litter?.shippingRands ?? null;
				}
			}

			const totalPriceRands = puppyPriceRands != null
				? puppyPriceRands + (shippingRands ?? 0)
				: null;

			const paidResult = await db
				.select({ total: sum(payments.amountRands) })
				.from(payments)
				.where(and(eq(payments.clientId, client.id), eq(payments.status, 'complete')));
			const alreadyPaid = Number(paidResult[0]?.total ?? 0);

			const balanceDue = totalPriceRands != null
				? Math.max(0, totalPriceRands - alreadyPaid)
				: null;

			const clientPayments = await db.query.payments.findMany({
				where: eq(payments.clientId, client.id),
				orderBy: [desc(payments.createdAt)],
			});

			return {
				puppyPriceRands,
				shippingRands,
				totalPriceRands,
				alreadyPaid,
				balanceDue,
				payments: clientPayments,
			};
		},
		{ params: t.Object({ clientId: t.String() }) },
	)

	// ── Admin: batch payment summaries for all active clients ───────────────
	.get(
		'/admin/summaries',
		async () => {
			// Fetch clients with a matched puppy OR a paid deposit OR waitlisted
			const activeClients = await db.query.clients.findMany({
				where: or(
					inArray(clients.stage, ['waitlisted', 'puppy_reserved', 'puppy_booked', 'puppy_fully_paid']),
					eq(clients.depositStatus, 'paid'),
				),
				columns: { id: true, puppyId: true },
			});

			if (activeClients.length === 0) return [];

			const clientIds = activeClients.map((c) => c.id);
			const puppyIds = activeClients.map((c) => c.puppyId).filter((id): id is string => !!id);

			// Batch-fetch puppy prices + litter shipping
			const puppyData = puppyIds.length > 0
				? await db.query.puppies.findMany({
					where: inArray(puppies.id, puppyIds),
					columns: { id: true, priceRands: true, litterId: true },
					with: { litter: { columns: { shippingRands: true } } },
				})
				: [];
			const puppyMap = new Map(puppyData.map((p) => [p.id, p]));

			// Aggregate payments per client in one query
			const now = new Date().toISOString();
			const paymentAggs = await db
				.select({
					clientId: payments.clientId,
					alreadyPaid: sql<number>`coalesce(sum(case when ${payments.status} = 'complete' then ${payments.amountRands} else 0 end), 0)`,
					depositPaid: sql<number>`coalesce(sum(case when ${payments.status} = 'complete' and ${payments.type} = 'deposit' then ${payments.amountRands} else 0 end), 0)`,
					pendingCount: sql<number>`count(case when ${payments.status} = 'pending' then 1 end)`,
					overdueCount: sql<number>`count(case when ${payments.status} = 'pending' and ${payments.dueDate} < ${now} then 1 end)`,
					nextDueDate: sql<string | null>`min(case when ${payments.status} = 'pending' and ${payments.dueDate} is not null then ${payments.dueDate} end)`,
				})
				.from(payments)
				.where(inArray(payments.clientId, clientIds))
				.groupBy(payments.clientId);

			const aggMap = new Map(paymentAggs.map((a) => [a.clientId, a]));

			const SECURING_DEPOSIT_RANDS = 5000;

			return activeClients.map((c) => {
				const puppy = c.puppyId ? puppyMap.get(c.puppyId) : undefined;
				const puppyTotal = puppy?.priceRands != null
					? puppy.priceRands + (puppy.litter?.shippingRands ?? 0)
					: null;
				const isTotalEstimated = puppyTotal == null;
				const totalPriceRands = puppyTotal ?? SECURING_DEPOSIT_RANDS;
				const agg = aggMap.get(c.id);
				const alreadyPaid = Number(agg?.alreadyPaid ?? 0);

				return {
					clientId: c.id,
					totalPriceRands,
					isTotalEstimated,
					alreadyPaid,
					depositPaid: Number(agg?.depositPaid ?? 0),
					balanceDue: Math.max(0, totalPriceRands - alreadyPaid),
					pendingCount: Number(agg?.pendingCount ?? 0),
					overdueCount: Number(agg?.overdueCount ?? 0),
					nextDueDate: agg?.nextDueDate ?? null,
				};
			});
		},
	)

	// ── Admin: all payments with client info ─────────────────────────────────
	.get(
		'/admin/all',
		async ({query}) => {
			const conditions = [];
			if (query.status) conditions.push(eq(payments.status, query.status as 'pending' | 'complete' | 'failed' | 'cancelled'));
			if (query.type) conditions.push(eq(payments.type, query.type as 'deposit' | 'booking' | 'final'));

			const allPayments = await db.query.payments.findMany({
				where: conditions.length > 0 ? and(...conditions) : undefined,
				orderBy: [desc(payments.createdAt)],
				with: {
					client: {
						columns: { id: true, firstName: true, lastName: true, email: true },
					},
				},
			});

			return allPayments;
		},
		{
			query: t.Object({
				status: t.Optional(t.String()),
				type: t.Optional(t.String()),
			}),
		},
	)

	// ── Admin: aggregate payment stats ───────────────────────────────────────
	.get(
		'/admin/stats',
		async () => {
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

			// Collected this month
			const collectedResult = await db
				.select({ total: sql<number>`coalesce(sum(${payments.amountRands}), 0)` })
				.from(payments)
				.where(and(
					eq(payments.status, 'complete'),
					sql`${payments.paidAt} >= ${startOfMonth.toISOString()}`,
				));

			// Total outstanding (all pending payment amounts)
			const outstandingResult = await db
				.select({ total: sql<number>`coalesce(sum(${payments.amountRands}), 0)` })
				.from(payments)
				.where(eq(payments.status, 'pending'));

			// Overdue count
			const overdueResult = await db
				.select({ count: sql<number>`count(*)` })
				.from(payments)
				.where(and(
					eq(payments.status, 'pending'),
					isNotNull(payments.dueDate),
					sql`${payments.dueDate} < ${now.toISOString()}`,
				));

			// Needs payment plan count
			const bookedClients = await db.query.clients.findMany({
				where: eq(clients.stage, 'puppy_booked'),
				columns: { id: true },
			});
			let needsPlanCount = 0;
			if (bookedClients.length > 0) {
				const clientsWithFinal = await db
					.selectDistinct({ clientId: payments.clientId })
					.from(payments)
					.where(and(
						inArray(payments.clientId, bookedClients.map((c) => c.id)),
						eq(payments.type, 'final'),
						ne(payments.status, 'cancelled'),
					));
				needsPlanCount = bookedClients.length - clientsWithFinal.length;
			}

			return {
				collectedThisMonth: Number(collectedResult[0]?.total ?? 0),
				outstanding: Number(outstandingResult[0]?.total ?? 0),
				overdueCount: Number(overdueResult[0]?.count ?? 0),
				needsPlanCount,
			};
		},
	)

	// ── Admin: clients needing a payment plan ────────────────────────────────
	.get(
		'/needs-payment-plan',
		async () => {
			const bookedClients = await db.query.clients.findMany({
				where: eq(clients.stage, 'puppy_booked'),
				columns: { id: true, firstName: true, lastName: true },
			});

			if (bookedClients.length === 0) return [];

			// Find which booked clients already have a non-cancelled final payment
			const clientsWithFinal = await db
				.selectDistinct({ clientId: payments.clientId })
				.from(payments)
				.where(and(
					inArray(payments.clientId, bookedClients.map((c) => c.id)),
					eq(payments.type, 'final'),
					ne(payments.status, 'cancelled'),
				));

			const hasPaymentPlanIds = new Set(clientsWithFinal.map((r) => r.clientId));

			return bookedClients
				.filter((c) => !hasPaymentPlanIds.has(c.id))
				.map((c) => ({
					clientId: c.id,
					clientName: `${c.firstName} ${c.lastName}`,
				}));
		},
	)

	// ── Admin: trigger final payment ──────────────────────────────────────────
	.post(
		'/final/:clientId',
		async ({params, body, status}) => {
			const client = await db.query.clients.findFirst({
				where: eq(clients.id, params.clientId),
			});
			if (!client) return status(404, { error: 'NotFound', message: 'Client not found' });
			if (!client.puppyId) {
				return status(400, { error: 'NoPuppy', message: 'Client has no matched puppy' });
			}

			// Always fetch puppy + litter for price snapshot
			const puppyRecord = await db.query.puppies.findFirst({
				where: eq(puppies.id, client.puppyId),
				with: { litter: { columns: { shippingRands: true, goHomeDate: true } } },
			});
			const snapshotPuppyPrice = puppyRecord?.priceRands ?? null;
			const snapshotShipping = puppyRecord?.litter?.shippingRands ?? 0;
			const goHomeDate = puppyRecord?.litter?.goHomeDate ?? null;

			// Auto-calculate totalPriceRands if not provided
			let totalPriceRands = body.totalPriceRands;
			if (totalPriceRands == null) {
				if (!snapshotPuppyPrice) {
					return status(400, { error: 'NoPrice', message: 'Puppy has no price set. Set the price on the litter page or provide totalPriceRands.' });
				}
				totalPriceRands = snapshotPuppyPrice + snapshotShipping;
			}

			// Validate due date does not exceed go-home date
			if (body.dueDate && goHomeDate && body.dueDate > goHomeDate) {
				return status(400, { error: 'DueDateAfterGoHome', message: `Due date cannot be after the puppy's go-home date (${goHomeDate})` });
			}

			// Calculate total already paid
			const paidResult = await db
				.select({ total: sum(payments.amountRands) })
				.from(payments)
				.where(and(eq(payments.clientId, client.id), eq(payments.status, 'complete')));

			const alreadyPaid = Number(paidResult[0]?.total ?? 0);
			const finalDue = Math.max(0, totalPriceRands - alreadyPaid);

			if (finalDue <= 0) {
				return status(400, { error: 'AlreadyPaid', message: 'Client has already paid the full amount' });
			}

			// Cancel any existing pending final payments
			await db.update(payments)
				.set({ status: 'cancelled' })
				.where(and(
					eq(payments.clientId, client.id),
					eq(payments.type, 'final'),
					eq(payments.status, 'pending'),
				));

			const reference = generateReference('fin');
			const puppyName = puppyRecord
				? `${puppyRecord.collarColour} collar (${puppyRecord.sex})`
				: 'your puppy';

			const { authorizationUrl } = await initializeTransaction({
				email: client.email,
				amountRands: finalDue,
				reference,
				callbackUrl: `${CLIENT_URL}/portal/payments?ref=${reference}`,
				metadata: {
					clientId: client.id,
					puppyId: client.puppyId,
					totalPriceRands,
					alreadyPaid,
					finalDue,
				},
			});

			const [payment] = await db.insert(payments).values({
				clientId: client.id,
				type: 'final',
				amountRands: finalDue,
				reference,
				authorizationUrl,
				status: 'pending',
				dueDate: body.dueDate ? new Date(body.dueDate) : null,
				metadata: {
					puppyId: client.puppyId,
					puppyName,
					totalPriceRands,
					alreadyPaid,
					puppyPriceRands: snapshotPuppyPrice,
					shippingRands: snapshotShipping,
				},
			}).returning();

			// Notify client
			await sendClientEmailWithVars(client.id, 'final_payment_requested', {
				amount: `R${finalDue.toLocaleString()}`,
				total_price: `R${totalPriceRands.toLocaleString()}`,
				already_paid: `R${alreadyPaid.toLocaleString()}`,
				puppy_name: puppyName,
				payment_url: authorizationUrl,
				payments_link: `${CLIENT_URL}/portal/payments`,
			});

			await sendAdminNotificationByTrigger('admin_final_payment_requested', {
				first_name: client.firstName,
				full_name: `${client.firstName} ${client.lastName}`,
				amount: `R${finalDue.toLocaleString()}`,
				total_price: `R${totalPriceRands.toLocaleString()}`,
				already_paid: `R${alreadyPaid.toLocaleString()}`,
			});

			return { paymentId: payment.id, finalDue, authorizationUrl };
		},
		{
			params: t.Object({ clientId: t.String() }),
			body: t.Object({
				totalPriceRands: t.Optional(t.Number()),
				dueDate: t.Optional(t.String()),
			}),
		},
	)

	// ── Admin: create instalment plan ─────────────────────────────────────────
	.post(
		'/final/:clientId/instalments',
		async ({params, body, status}) => {
			const client = await db.query.clients.findFirst({
				where: eq(clients.id, params.clientId),
			});
			if (!client) return status(404, { error: 'NotFound', message: 'Client not found' });
			if (!client.puppyId) {
				return status(400, { error: 'NoPuppy', message: 'Client has no matched puppy' });
			}

			// Always fetch puppy + litter for price snapshot
			const puppyRecord = await db.query.puppies.findFirst({
				where: eq(puppies.id, client.puppyId),
				with: { litter: { columns: { shippingRands: true, goHomeDate: true } } },
			});
			const snapshotPuppyPrice = puppyRecord?.priceRands ?? null;
			const snapshotShipping = puppyRecord?.litter?.shippingRands ?? 0;
			const goHomeDate = puppyRecord?.litter?.goHomeDate ?? null;

			// Auto-calculate totalPriceRands if not provided
			let totalPriceRands = body.totalPriceRands;
			if (totalPriceRands == null) {
				if (!snapshotPuppyPrice) {
					return status(400, { error: 'NoPrice', message: 'Puppy has no price set. Set the price on the litter page or provide totalPriceRands.' });
				}
				totalPriceRands = snapshotPuppyPrice + snapshotShipping;
			}

			// Calculate already paid and balance due
			const paidResult = await db
				.select({ total: sum(payments.amountRands) })
				.from(payments)
				.where(and(eq(payments.clientId, client.id), eq(payments.status, 'complete')));
			const alreadyPaid = Number(paidResult[0]?.total ?? 0);
			const balanceDue = Math.max(0, totalPriceRands - alreadyPaid);

			if (balanceDue <= 0) {
				return status(400, { error: 'AlreadyPaid', message: 'Client has already paid the full amount' });
			}

			// Validate amounts sum to balance due (R1 tolerance for rounding)
			const amountsSum = body.amounts.reduce((a, b) => a + b, 0);
			if (Math.abs(amountsSum - balanceDue) > 1) {
				return status(400, { error: 'AmountMismatch', message: `Instalment amounts (R${amountsSum.toLocaleString()}) do not match balance due (R${balanceDue.toLocaleString()})` });
			}

			// Validate dueDates length matches amounts if provided
			if (body.dueDates && body.dueDates.length !== body.amounts.length) {
				return status(400, { error: 'DueDateMismatch', message: 'dueDates array must match amounts array length' });
			}

			// Validate no instalment due date exceeds go-home date
			if (goHomeDate && body.dueDates) {
				const nonNullDates = body.dueDates.filter((d): d is string => !!d);
				const maxDueDate = nonNullDates.sort().at(-1);
				if (maxDueDate && maxDueDate > goHomeDate) {
					return status(400, { error: 'DueDateAfterGoHome', message: `Instalment due dates cannot be after the puppy's go-home date (${goHomeDate})` });
				}
			}

			// Cancel any existing pending final payments
			await db.update(payments)
				.set({ status: 'cancelled' })
				.where(and(
					eq(payments.clientId, client.id),
					eq(payments.type, 'final'),
					eq(payments.status, 'pending'),
				));

			const puppyName = puppyRecord
				? `${puppyRecord.collarColour} collar (${puppyRecord.sex})`
				: 'your puppy';

			const instalmentTotal = body.amounts.length;
			const createdPayments = [];

			for (let i = 0; i < body.amounts.length; i++) {
				const amount = body.amounts[i];
				const reference = generateReference('fin');

				const { authorizationUrl } = await initializeTransaction({
					email: client.email,
					amountRands: amount,
					reference,
					callbackUrl: `${CLIENT_URL}/portal/payments?ref=${reference}`,
					metadata: {
						clientId: client.id,
						puppyId: client.puppyId,
						totalPriceRands,
						alreadyPaid,
						isInstalment: true,
						instalmentIndex: i,
						instalmentTotal,
					},
				});

				const [payment] = await db.insert(payments).values({
					clientId: client.id,
					type: 'final',
					amountRands: amount,
					reference,
					authorizationUrl,
					status: 'pending',
					dueDate: body.dueDates?.[i] ? new Date(body.dueDates[i]!) : null,
					metadata: {
						puppyId: client.puppyId,
						puppyName,
						totalPriceRands,
						alreadyPaid,
						puppyPriceRands: snapshotPuppyPrice,
						shippingRands: snapshotShipping,
						isInstalment: true,
						instalmentIndex: i,
						instalmentTotal,
					},
				}).returning();

				createdPayments.push(payment);
			}

			// Notify client with instalment schedule
			const scheduleLines = body.amounts.map((a, i) => {
				const dueDateStr = body.dueDates?.[i]
					? ` — due ${new Date(body.dueDates[i]!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`
					: '';
				return `  ${i + 1}. R${a.toLocaleString()}${dueDateStr}`;
			}).join('\n');
			await sendClientEmailWithVars(client.id, 'final_payment_requested', {
				amount: `R${balanceDue.toLocaleString()} (${instalmentTotal} instalments)`,
				total_price: `R${totalPriceRands.toLocaleString()}`,
				already_paid: `R${alreadyPaid.toLocaleString()}`,
				puppy_name: puppyName,
				payment_url: createdPayments[0].authorizationUrl ?? '',
				payments_link: `${CLIENT_URL}/portal/payments`,
			});

			await sendAdminNotificationByTrigger('admin_instalment_plan_created', {
				first_name: client.firstName,
				full_name: `${client.firstName} ${client.lastName}`,
				instalment_total: String(instalmentTotal),
				balance_due: `R${balanceDue.toLocaleString()}`,
				admin_link: `${CLIENT_URL}/admin/clients/${client.id}`,
			});

			return { payments: createdPayments, balanceDue, instalmentTotal };
		},
		{
			params: t.Object({ clientId: t.String() }),
			body: t.Object({
				totalPriceRands: t.Optional(t.Number()),
				amounts: t.Array(t.Number(), { minItems: 2, maxItems: 12 }),
				dueDates: t.Optional(t.Array(t.Union([t.String(), t.Null()]))),
			}),
		},
	);
