import * as Sentry from '@sentry/node';

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
	enabled: process.env.NODE_ENV === 'production',
});

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { eq, and, lt } from 'drizzle-orm';
import { db } from './db';
import { puppies, payments, clients } from './db/schema';
import { littersRoutes } from './routes/litters';
import { clientsRoutes } from './routes/clients';
import { updatesRoutes } from './routes/updates';
import { templatesRoutes } from './routes/templates';
import { authRoutes } from './routes/auth';
import { adminsRoutes } from './routes/admins';
import { emailRoutes } from './routes/email';
import { paymentsRoutes } from './routes/payments';
import { logActivity } from './lib/activity';
import { sendClientEmailWithVars, sendAdminNotification } from './lib/email';

// ─── Booking expiry job — runs every 5 minutes ────────────────────────────────
// Finds puppies with status='reserved' whose bookingExpiresAt has passed,
// releases them back to available, cancels the pending payment, notifies client.

async function runBookingExpiryCheck(): Promise<void> {
	try {
		const expired = await db.query.puppies.findMany({
			where: and(
				eq(puppies.status, 'reserved'),
				lt(puppies.bookingExpiresAt, new Date()),
			),
		});

		for (const puppy of expired) {
			// Release puppy
			await db.update(puppies)
				.set({ status: 'available', bookingExpiresAt: null, updatedAt: new Date() })
				.where(eq(puppies.id, puppy.id));

			// Find and cancel the matching pending booking payment
			const pendingBooking = await db.query.payments.findFirst({
				where: and(
					eq(payments.type, 'booking'),
					eq(payments.status, 'pending'),
				),
				with: { client: true },
			});

			if (pendingBooking) {
				const meta = pendingBooking.metadata as Record<string, unknown>;
				// Only cancel if this payment is for this puppy
				if (meta.puppyId === puppy.id) {
					await db.update(payments)
						.set({ status: 'cancelled' })
						.where(eq(payments.id, pendingBooking.id));

					// Revert client stage back to waitlisted
					await db.update(clients)
						.set({ stage: 'waitlisted', updatedAt: new Date() })
						.where(eq(clients.id, pendingBooking.clientId));

					logActivity(
						pendingBooking.clientId,
						'booking_expired',
						`Booking window expired for ${meta.puppyName ?? 'puppy'}. Puppy released back to available.`,
						'system',
						{ puppyId: puppy.id, paymentId: pendingBooking.id },
					);

					const puppyName = (meta.puppyName as string) ?? 'the puppy';

					sendClientEmailWithVars(pendingBooking.clientId, 'puppy_booking_expired', {
						puppy_name: puppyName,
						portal_link: `${process.env.CLIENT_URL}/portal/litters`,
					}).catch(console.error);

					sendAdminNotification(
						`Booking expired — ${pendingBooking.client.firstName} ${pendingBooking.client.lastName}`,
						`The 24h booking window expired for ${pendingBooking.client.firstName} ${pendingBooking.client.lastName}.\n\n${puppyName} is now available again.`,
					).catch(console.error);
				}
			}
		}
	} catch (e) {
		console.error('Booking expiry check failed:', e);
	}
}

setInterval(runBookingExpiryCheck, 5 * 60 * 1000);

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Elysia()
	.use(
		cors({
			origin: (req) => {
				const origin = req.headers.get('origin') ?? '';
				return /^http:\/\/localhost:\d+$/.test(origin) || origin === process.env.CLIENT_URL;
			},
			credentials: true,
		})
	)
	.use(
		swagger({
			documentation: {
				info: { title: `${process.env.APP_NAME ?? 'Teddydoodles'} API`, version: '1.0.0' },
			},
		})
	)

	// Global error capture — forwards unhandled Elysia errors to Sentry
	.onError(({ error, request }) => {
		// Don't report 4xx client errors — only unexpected server faults
		const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
		if (status >= 500) {
			Sentry.captureException(error, {
				extra: { url: request.url, method: request.method },
			});
		}
	})

	// Health check — used by Railway
	.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

	// Routes
	.use(authRoutes)
	.use(adminsRoutes)
	.use(emailRoutes)
	.use(littersRoutes)
	.use(clientsRoutes)
	.use(updatesRoutes)
	.use(templatesRoutes)
	.use(paymentsRoutes)

	.listen(process.env.PORT ?? 3000);

console.log(`${process.env.APP_NAME ?? 'Teddydoodles'} API running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;

