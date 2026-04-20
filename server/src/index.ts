import * as Sentry from '@sentry/node';

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
	enabled: process.env.NODE_ENV === 'production',
});

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { eq, and, lte, notInArray } from 'drizzle-orm';
import { db } from './db';
import { puppies, litters } from './db/schema';
import { littersRoutes } from './routes/litters';
import { clientsRoutes } from './routes/clients';
import { updatesRoutes } from './routes/updates';
import { templatesRoutes } from './routes/templates';
import { authRoutes } from './routes/auth';
import { adminsRoutes } from './routes/admins';
import { emailRoutes } from './routes/email';
import { paymentsRoutes } from './routes/payments';
import { invoicesRoutes } from './routes/invoices';

// ─── Selection date auto-transition job — runs every 5 minutes ───────────────
// Finds planned litters whose selectionDate has arrived, flips them to available,
// and sets all eligible puppies to available.

async function runSelectionDateCheck(): Promise<void> {
	try {
		const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
		const ready = await db.query.litters.findMany({
			where: and(
				eq(litters.status, 'planned'),
				lte(litters.selectionDate, today),
			),
			columns: { id: true, name: true },
		});

		for (const litter of ready) {
			await db.update(litters)
				.set({ status: 'available', updatedAt: new Date() })
				.where(eq(litters.id, litter.id));

			await db.update(puppies)
				.set({ status: 'available', updatedAt: new Date() })
				.where(and(
					eq(puppies.litterId, litter.id),
					notInArray(puppies.status, ['reserved', 'booked', 'puppy_fully_paid', 'retained', 'not_for_sale']),
				));

			console.log(`Litter "${litter.name}" auto-transitioned to available (selection date reached)`);
		}
	} catch (e) {
		Sentry.captureException(e, { tags: { job: 'selection_date' } });
		console.error('Selection date check failed:', e);
	}
}

setInterval(runSelectionDateCheck, 5 * 60 * 1000);
runSelectionDateCheck(); // run immediately on startup

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
			console.error(`[onError] ${request.method} ${request.url}`, error);
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
	.use(invoicesRoutes)

	.listen(process.env.PORT ?? 3000);

console.log(`${process.env.APP_NAME ?? 'Teddydoodles'} API running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;

