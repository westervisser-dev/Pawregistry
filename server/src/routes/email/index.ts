import Elysia, { t } from 'elysia';
import { eq, desc, asc } from 'drizzle-orm';
import { db } from '../../db';
import { emailTemplates, emailLogs, appSettings } from '../../db/schema';
import { adminPlugin } from '../../lib/auth';

export const emailRoutes = new Elysia({ prefix: '/email' })
	.use(adminPlugin)

	// ── List all email templates ──
	.get('/templates', async () => {
		return db.select().from(emailTemplates).orderBy(asc(emailTemplates.trigger));
	})

	// ── Update an email template ──
	.patch(
		'/templates/:id',
		async ({ params, body, error }) => {
			const [updated] = await db
				.update(emailTemplates)
				.set({ ...body, updatedAt: new Date() })
				.where(eq(emailTemplates.id, params.id))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Template not found' });
			return updated;
		},
		{
			body: t.Partial(t.Object({
				subject: t.String({ minLength: 1 }),
				body: t.String({ minLength: 1 }),
				enabled: t.Boolean(),
			})),
		}
	)

	// ── Get app settings (key-value) ──
	.get('/settings', async () => {
		const rows = await db.select().from(appSettings);
		return Object.fromEntries(rows.map((r) => [r.key, r.value]));
	})

	// ── Upsert one or more settings ──
	.patch(
		'/settings',
		async ({ body }) => {
			for (const [key, value] of Object.entries(body)) {
				if (value === undefined) continue;
				await db
					.insert(appSettings)
					.values({ key, value })
					.onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
			}
			const rows = await db.select().from(appSettings);
			return Object.fromEntries(rows.map((r) => [r.key, r.value]));
		},
		{
			body: t.Object({
				admin_email: t.Optional(t.String()),
				admin_notification_recipients: t.Optional(t.String()),
			}),
		},
	)

	// ── List email logs (optionally filtered by client) ──
	.get(
		'/logs',
		async ({ query }) => {
			if (query.clientId) {
				return db
					.select()
					.from(emailLogs)
					.where(eq(emailLogs.clientId, query.clientId))
					.orderBy(desc(emailLogs.sentAt));
			}
			return db
				.select()
				.from(emailLogs)
				.orderBy(desc(emailLogs.sentAt))
				.limit(200);
		},
		{
			query: t.Object({
				clientId: t.Optional(t.String()),
			}),
		}
	);
