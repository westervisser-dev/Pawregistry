import Elysia, { t } from 'elysia';
import { eq, desc, asc } from 'drizzle-orm';
import { db } from '../../db';
import { emailTemplates, emailLogs, appSettings } from '../../db/schema';
import { adminPlugin } from '../../lib/auth';

const ADMIN_TEMPLATE_DEFAULTS: Array<{ trigger: string; subject: string; body: string }> = [
	{
		trigger: 'admin_new_application',
		subject: 'New application — {{full_name}}',
		body: '{{full_name}} ({{email}}) has submitted a new application.\n\nCity: {{city}}\n\nReview it here: {{admin_link}}',
	},
	{
		trigger: 'admin_deposit_received',
		subject: 'Deposit received — {{full_name}}',
		body: '{{full_name}} has paid their {{deposit_tier}} deposit ({{amount}}).\n\nView client: {{admin_link}}',
	},
	{
		trigger: 'admin_booking_payment_received',
		subject: 'Puppy booked — {{full_name}}',
		body: '{{full_name}} has paid their booking deposit ({{amount}}).\n\n{{puppy_name}} is now booked.\n\nView client: {{admin_link}}',
	},
	{
		trigger: 'admin_final_payment_received',
		subject: 'Final payment received — {{full_name}}',
		body: '{{full_name}} has made their final payment of {{amount}}.\n\nThey are ready to collect their puppy!\n\nView client: {{admin_link}}',
	},
	{
		trigger: 'admin_instalment_received',
		subject: '{{instalment_label}} received — {{full_name}}',
		body: '{{full_name}} has paid {{amount}} ({{instalment_label}}).\n\nTotal paid: {{total_paid}} of {{total_price}}.\n\nView client: {{admin_link}}',
	},
	{
		trigger: 'admin_puppy_interest',
		subject: 'Puppy interest — {{full_name}}',
		body: '{{full_name}} has expressed interest in {{puppy_name}}.\n\nBooking payment of {{booking_amount}} required within 24h.\n\nView client: {{admin_link}}',
	},
	{
		trigger: 'admin_puppy_auto_booked',
		subject: 'Puppy auto-booked — {{full_name}}',
		body: '{{full_name}} expressed interest in {{puppy_name}}. Puppy auto-booked as R5,000 deposit was already on file.\n\nView client: {{admin_link}}',
	},
	{
		trigger: 'admin_documents_uploaded',
		subject: 'Documents ready to review — {{full_name}}',
		body: '{{full_name}} ({{email}}) has uploaded all required documents and is ready for review.\n\nReview here: {{admin_link}}',
	},
	{
		trigger: 'admin_final_payment_requested',
		subject: 'Final payment requested — {{full_name}}',
		body: 'Final payment of {{amount}} has been requested from {{full_name}}.\n\nTotal price: {{total_price}} | Already paid: {{already_paid}}',
	},
	{
		trigger: 'admin_instalment_plan_created',
		subject: 'Instalment plan created — {{full_name}}',
		body: '{{instalment_total}}-instalment plan created for {{full_name}}.\n\nBalance due: {{balance_due}}\n\nView client: {{admin_link}}',
	},
	{
		trigger: 'admin_puppy_booked_stage',
		subject: 'Puppy booked — {{full_name}}',
		body: '{{full_name}} ({{email}}) has been set to Puppy Booked stage.\n\nView client: {{admin_link}}',
	},
];

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

	// ── Seed admin notification templates (insert defaults if missing) ──
	.post('/admin-templates/seed', async () => {
		for (const tpl of ADMIN_TEMPLATE_DEFAULTS) {
			await db
				.insert(emailTemplates)
				.values({ trigger: tpl.trigger, subject: tpl.subject, body: tpl.body, enabled: true })
				.onConflictDoNothing();
		}
		return db.select().from(emailTemplates)
			.orderBy(asc(emailTemplates.trigger))
			.then((rows) => rows.filter((r) => r.trigger.startsWith('admin_')));
	})

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
