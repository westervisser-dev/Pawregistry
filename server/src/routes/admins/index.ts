import Elysia, { t } from 'elysia';
import { eq } from 'drizzle-orm';
import { adminPlugin } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { db } from '../../db';
import { admins } from '../../db/schema';

export const adminsRoutes = new Elysia({ prefix: '/admins' })
	.use(adminPlugin)

	// List all admins
	.get('/', async () => {
		return db.select().from(admins).orderBy(admins.createdAt);
	})

	// Invite a new admin — creates their Supabase account + inserts into admins table
	.post(
		'/invite',
		async ({ body, error }) => {
			// Check not already an admin
			const existing = await db.query.admins.findFirst({
				where: eq(admins.email, body.email),
			});
			if (existing) {
				return error(409, { error: 'Conflict', message: 'This email is already an admin.' });
			}

			const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(body.email, {
				redirectTo: `${process.env.CLIENT_URL}/admin/invite-callback`,
			});

			if (inviteError || !data.user) {
				return error(500, { error: 'Invite failed', message: inviteError?.message ?? 'Unknown error' });
			}

			await db.insert(admins).values({
				userId: data.user.id,
				email: body.email,
			});

			return { message: `Invite sent to ${body.email}.` };
		},
		{ body: t.Object({ email: t.String({ format: 'email' }) }) }
	)

	// Remove an admin
	.delete(
		'/:id',
		async ({ params, error }) => {
			const record = await db.query.admins.findFirst({
				where: eq(admins.id, params.id),
			});
			if (!record) return error(404, { error: 'Not found', message: 'Admin not found.' });

			await db.delete(admins).where(eq(admins.id, params.id));
			return { message: 'Admin removed.' };
		},
		{ params: t.Object({ id: t.String() }) }
	);
