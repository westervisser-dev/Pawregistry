import Elysia, { t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { goHomeChecklists, clients } from '../../db/schema';
import { adminPlugin, authPlugin } from '../../lib/auth';

export const checklistRoutes = new Elysia({ prefix: '/checklists' })
	// ── Client: view own checklist ──
	.use(authPlugin)
	.get('/my', async ({ user, error }) => {
		const client = await db.query.clients.findFirst({ where: eq(clients.userId, user.id) });
		if (!client) return error(404, { error: 'Not found', message: 'Client record not found' });

		const checklist = await db.query.goHomeChecklists.findFirst({
			where: eq(goHomeChecklists.clientId, client.id),
		});
		if (!checklist) return error(404, { error: 'Not found', message: 'No checklist yet' });
		return checklist;
	})

	// ── Admin: create / update checklist for a client ──
	.use(adminPlugin)

	.post(
		'/:clientId',
		async ({ params, body }) => {
			const [checklist] = await db.insert(goHomeChecklists).values({
				clientId: params.clientId,
				puppyId: body.puppyId,
				goHomeDate: body.goHomeDate ?? null,
			}).returning();
			return checklist;
		},
		{
			body: t.Object({
				puppyId: t.String(),
				goHomeDate: t.Optional(t.Nullable(t.String())),
			}),
		}
	)

	.patch(
		'/:id',
		async ({ params, body, error }) => {
			const [updated] = await db
				.update(goHomeChecklists)
				.set({ ...body, updatedAt: new Date() })
				.where(eq(goHomeChecklists.id, params.id))
				.returning();
			if (!updated) return error(404, { error: 'Not found', message: 'Checklist not found' });
			return updated;
		},
		{
			body: t.Partial(
				t.Object({
					vetCheckDone: t.Boolean(),
					microchipRegistered: t.Boolean(),
					contractSigned: t.Boolean(),
					depositPaid: t.Boolean(),
					balancePaid: t.Boolean(),
					puppyPackPrepared: t.Boolean(),
					goHomeDate: t.Nullable(t.String()),
					notes: t.Nullable(t.String()),
				})
			),
		}
	);
