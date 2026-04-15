import Elysia, { t } from 'elysia';
import { eq } from 'drizzle-orm';
import { supabase } from '../../lib/supabase';
import { db } from '../../db';
import { clients } from '../../db/schema';
import { isAdminUser } from '../../lib/auth';

export const authRoutes = new Elysia({ prefix: '/auth' })
	// Send magic link to a client email
	.post(
		'/magic-link',
		async ({ body, set }) => {
			const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
			const isAdmin = adminEmails.includes(body.email);

			// Allow admins through without a client record; all others must have an application
			if (!isAdmin) {
				const client = await db.query.clients.findFirst({
					where: eq(clients.email, body.email.toLowerCase().trim()),
				});
				if (!client) {
					set.status = 404;
					return { error: 'Not found', message: 'No application found for this email address.' };
				}
			}

			if (process.env.BYPASS_OTP === 'true') {
				const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
					type: 'magiclink',
					email: body.email,
					options: { redirectTo: `${process.env.CLIENT_URL}/portal/callback` },
				});
				if (linkError) {
					set.status = 500;
					return { error: 'Auth error', message: linkError.message };
				}
				return { message: 'Bypass active.', token: linkData.properties.hashed_token };
			}

			const { error: authError } = await supabase.auth.signInWithOtp({
				email: body.email,
				options: { emailRedirectTo: `${process.env.CLIENT_URL}/portal/callback` },
			});

			if (authError) {
				set.status = 500;
				return { error: 'Auth error', message: authError.message };
			}

			return { message: 'Magic link sent — check your email.', token: null };
		},
		{ body: t.Object({ email: t.String({ format: 'email' }) }) }
	)

	// Exchange Supabase session token for user info + link userId to client record
	.post(
		'/session',
		async ({ body, set }) => {
			try {
				const { data, error: authError } = await supabase.auth.getUser(body.accessToken);
				if (authError || !data.user) {
					set.status = 401;
					return { error: 'Unauthorized', message: 'Invalid token' };
				}

				const user = data.user;

				// Link the Supabase user ID to the client record (first login)
				const client = await db.query.clients.findFirst({
					where: eq(clients.email, (user.email ?? '').toLowerCase().trim()),
				});

				if (client && !client.userId) {
					await db
						.update(clients)
						.set({ userId: user.id, updatedAt: new Date() })
						.where(eq(clients.id, client.id));
				}

				const isAdmin = await isAdminUser(user.id);

				return {
					userId: user.id,
					email: user.email,
					hasClientRecord: !!client,
					isAdmin,
					clientStage: client?.stage ?? null,
				};
			} catch (e) {
				console.error('[/auth/session error]', e);
				throw e;
			}
		},
		{ body: t.Object({ accessToken: t.String() }) }
	);
