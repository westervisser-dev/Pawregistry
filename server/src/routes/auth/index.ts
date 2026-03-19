import Elysia, { t } from 'elysia';
import { eq } from 'drizzle-orm';
import { supabase } from '../../lib/supabase';
import { db } from '../../db';
import { clients } from '../../db/schema';

export const authRoutes = new Elysia({ prefix: '/auth' })
	// Send magic link to a client email
	.post(
		'/magic-link',
		async ({ body, error }) => {
			const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim());
			const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
			const isAdmin = adminEmails.includes(body.email);

			// Allow admins through without a client record; all others must have an application
			if (!isAdmin) {
				const client = await db.query.clients.findFirst({
					where: eq(clients.email, body.email),
				});
				if (!client) {
					return error(404, {
						error: 'Not found',
						message: 'No application found for this email address.',
					});
				}
			}

			const { error: authError } = await supabase.auth.signInWithOtp({
				email: body.email,
				options: { emailRedirectTo: `${process.env.CLIENT_URL}/portal/callback` },
			});

			if (authError) {
				return error(500, { error: 'Auth error', message: authError.message });
			}

			return { message: 'Magic link sent — check your email.' };
		},
		{ body: t.Object({ email: t.String({ format: 'email' }) }) }
	)

	// Exchange Supabase session token for user info + link userId to client record
	.post(
		'/session',
		async ({ body, error }) => {
			const { data, error: authError } = await supabase.auth.getUser(body.accessToken);
			if (authError || !data.user) {
				return error(401, { error: 'Unauthorized', message: 'Invalid token' });
			}

			const user = data.user;

			// Link the Supabase user ID to the client record (first login)
			const client = await db.query.clients.findFirst({
				where: eq(clients.email, user.email ?? ''),
			});

			if (client && !client.userId) {
				await db
					.update(clients)
					.set({ userId: user.id, updatedAt: new Date() })
					.where(eq(clients.id, client.id));
			}

			return {
				userId: user.id,
				email: user.email,
				hasClientRecord: !!client,
			};
		},
		{ body: t.Object({ accessToken: t.String() }) }
	);
