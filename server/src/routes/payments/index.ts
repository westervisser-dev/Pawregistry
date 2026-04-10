import Elysia, { t } from 'elysia';
import { eq, desc, and, sum } from 'drizzle-orm';
import { db } from '../../db';
import { payments, clients, puppies } from '../../db/schema';
import { adminPlugin, authPlugin } from '../../lib/auth';
import { logActivity } from '../../lib/activity';
import { sendClientEmailWithVars, sendAdminNotification } from '../../lib/email';
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

		await sendAdminNotification(
			`Deposit received — ${payment.client.firstName} ${payment.client.lastName}`,
			`${payment.client.firstName} ${payment.client.lastName} has paid their ${tier === 'r5000' ? 'R5,000 secured' : 'R500 standard'} deposit.\n\nView client: ${CLIENT_URL}/admin/clients/${payment.clientId}`,
		);
	}

	if (payment.type === 'booking') {
		const puppyId = meta.puppyId as string;
		const puppyName = (meta.puppyName as string) ?? 'your puppy';
		const tier = (meta.tier as 'r5000' | 'r500') ?? 'r5000';

		// Update deposit status if this was a new/upgraded deposit
		await db.update(clients)
			.set({
				depositStatus: 'paid',
				depositTier: tier,
				stage: 'match_requested',
				updatedAt: new Date(),
			})
			.where(eq(clients.id, payment.clientId));

		// Puppy → booked, clear expiry
		if (puppyId) {
			await db.update(puppies)
				.set({ status: 'booked', bookingExpiresAt: null, updatedAt: new Date() })
				.where(eq(puppies.id, puppyId));
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

		await sendAdminNotification(
			`Puppy booked — ${payment.client.firstName} ${payment.client.lastName}`,
			`${payment.client.firstName} ${payment.client.lastName} has paid their booking deposit (R${payment.amountRands.toLocaleString()}).\n\n${puppyName} is now booked and awaiting your approval.\n\nView client: ${CLIENT_URL}/admin/clients/${payment.clientId}`,
		);
	}

	if (payment.type === 'final') {
		const puppyId = meta.puppyId as string | undefined;

		await db.update(clients)
			.set({ stage: 'matched_paid', updatedAt: new Date() })
			.where(eq(clients.id, payment.clientId));

		if (puppyId) {
			await db.update(puppies)
				.set({ status: 'matched_paid', updatedAt: new Date() })
				.where(eq(puppies.id, puppyId));
		}

		logActivity(
			payment.clientId,
			'final_payment_received',
			`Final payment of R${payment.amountRands.toLocaleString()} received. Client is ready to collect.`,
			'system',
			{ paymentId, puppyId, amountRands: payment.amountRands },
		);

		await sendClientEmailWithVars(payment.clientId, 'payment_confirmed', {
			amount: `R${payment.amountRands.toLocaleString()}`,
			payment_type: 'final',
		});

		await sendAdminNotification(
			`Final payment received — ${payment.client.firstName} ${payment.client.lastName}`,
			`${payment.client.firstName} ${payment.client.lastName} has made their final payment of R${payment.amountRands.toLocaleString()}.\n\nThey are ready to collect their puppy!\n\nView client: ${CLIENT_URL}/admin/clients/${payment.clientId}`,
		);
	}
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export const paymentsRoutes = new Elysia({ prefix: '/payments' })

	// ── Paystack webhook (no auth — raw body required) ────────────────────────
	.post(
		'/webhook',
		async ({ body, headers, error }) => {
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

	// ── Client: initiate a deposit payment from portal ────────────────────────
	.use(authPlugin)
	.post(
		'/deposit',
		async ({ body, user, error }) => {
			const client = await db.query.clients.findFirst({
				where: eq(clients.userId, user!.id),
			});
			if (!client) return error(404, { error: 'NotFound', message: 'Client not found' });

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
	.get('/mine', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({
			where: eq(clients.userId, user!.id),
		});
		if (!client) return error(404, { error: 'NotFound', message: 'Client not found' });

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
		async ({ params }) => {
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
		async ({ params, error }) => {
			const payment = await db.query.payments.findFirst({
				where: eq(payments.id, params.id),
			});
			if (!payment) return error(404, { error: 'NotFound', message: 'Payment not found' });
			if (payment.status === 'complete') {
				return error(409, { error: 'Conflict', message: 'Payment already complete' });
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

	// ── Admin: trigger final payment ──────────────────────────────────────────
	.post(
		'/final/:clientId',
		async ({ params, body, error }) => {
			const client = await db.query.clients.findFirst({
				where: eq(clients.id, params.clientId),
			});
			if (!client) return error(404, { error: 'NotFound', message: 'Client not found' });
			if (!client.puppyId) {
				return error(400, { error: 'NoPuppy', message: 'Client has no matched puppy' });
			}

			// Calculate total already paid
			const paidResult = await db
				.select({ total: sum(payments.amountRands) })
				.from(payments)
				.where(and(eq(payments.clientId, client.id), eq(payments.status, 'complete')));

			const alreadyPaid = Number(paidResult[0]?.total ?? 0);
			const finalDue = Math.max(0, body.totalPriceRands - alreadyPaid);

			if (finalDue <= 0) {
				return error(400, { error: 'AlreadyPaid', message: 'Client has already paid the full amount' });
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
			const puppy = await db.query.puppies.findFirst({ where: eq(puppies.id, client.puppyId) });
			const puppyName = puppy
				? `${puppy.collarColour} collar (${puppy.sex})`
				: 'your puppy';

			const { authorizationUrl } = await initializeTransaction({
				email: client.email,
				amountRands: finalDue,
				reference,
				callbackUrl: `${CLIENT_URL}/portal/payments?ref=${reference}`,
				metadata: {
					clientId: client.id,
					puppyId: client.puppyId,
					totalPriceRands: body.totalPriceRands,
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
				metadata: {
					puppyId: client.puppyId,
					puppyName,
					totalPriceRands: body.totalPriceRands,
					alreadyPaid,
				},
			}).returning();

			// Notify client
			await sendClientEmailWithVars(client.id, 'final_payment_requested', {
				amount: `R${finalDue.toLocaleString()}`,
				total_price: `R${body.totalPriceRands.toLocaleString()}`,
				already_paid: `R${alreadyPaid.toLocaleString()}`,
				puppy_name: puppyName,
				payment_url: authorizationUrl,
				payments_link: `${CLIENT_URL}/portal/payments`,
			});

			await sendAdminNotification(
				`Final payment requested — ${client.firstName} ${client.lastName}`,
				`Final payment of R${finalDue.toLocaleString()} has been requested from ${client.firstName} ${client.lastName}.\n\nTotal price: R${body.totalPriceRands.toLocaleString()} | Already paid: R${alreadyPaid.toLocaleString()}`,
			);

			return { paymentId: payment.id, finalDue, authorizationUrl };
		},
		{
			params: t.Object({ clientId: t.String() }),
			body: t.Object({ totalPriceRands: t.Number() }),
		},
	);
