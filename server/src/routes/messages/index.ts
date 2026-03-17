import Elysia, { t } from 'elysia';
import { eq, asc } from 'drizzle-orm';
import { db } from '../../db';
import { messages, clients } from '../../db/schema';
import { adminPlugin, authPlugin } from '../../lib/auth';

export const messagesRoutes = new Elysia({ prefix: '/messages' })
	// ── Client: get own thread ──
	.use(authPlugin)
	.get('/my', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({ where: eq(clients.userId, user.id) });
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

		const thread = await db.query.messages.findMany({
			where: eq(messages.clientId, client.id),
			orderBy: [asc(messages.createdAt)],
		});

		// Mark unread admin messages as read
		await db
			.update(messages)
			.set({ readAt: new Date() })
			.where(eq(messages.clientId, client.id));

		return thread;
	})

	.post(
		'/my',
		async ({ user, body, error }) => {
			const client = await db.query.clients.findFirst({ where: eq(clients.userId, user.id) });
			if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

			const [msg] = await db.insert(messages).values({
				clientId: client.id,
				author: 'client',
				body: body.body,
				attachmentUrls: [],
			}).returning();
			return msg;
		},
		{ body: t.Object({ body: t.String() }) }
	)

	// ── Admin: view & reply to any client thread ──
	.use(adminPlugin)

	.get('/admin/:clientId', async ({ params }) => {
		return db.query.messages.findMany({
			where: eq(messages.clientId, params.clientId),
			orderBy: [asc(messages.createdAt)],
		});
	})

	.post(
		'/admin/:clientId',
		async ({ params, body }) => {
			const [msg] = await db.insert(messages).values({
				clientId: params.clientId,
				author: 'admin',
				body: body.body,
				attachmentUrls: [],
			}).returning();
			return msg;
		},
		{ body: t.Object({ body: t.String() }) }
	)

	.patch('/admin/:messageId/read', async ({ params }) => {
		const [updated] = await db
			.update(messages)
			.set({ readAt: new Date() })
			.where(eq(messages.id, params.messageId))
			.returning();
		return updated;
	});
