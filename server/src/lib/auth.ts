import Elysia from 'elysia';
import { supabase } from './supabase';

export const authPlugin = new Elysia({ name: 'auth' }).derive(
	{ as: 'scoped' },
	async ({ headers, error }) => {
		const authHeader = headers['authorization'];
		if (!authHeader?.startsWith('Bearer ')) {
			return error(401, { error: 'Unauthorized', message: 'Missing bearer token' });
		}

		const token = authHeader.slice(7);
		const { data, error: authError } = await supabase.auth.getUser(token);

		if (authError || !data.user) {
			return error(401, { error: 'Unauthorized', message: 'Invalid or expired token' });
		}

		return { user: data.user };
	}
);

// Admin check — matches against ADMIN_USER_IDS env list
export const adminPlugin = new Elysia({ name: 'admin' })
	.use(authPlugin)
	.derive({ as: 'scoped' }, ({ user, error }) => {
		const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim());
		if (!adminIds.includes(user.id)) {
			return error(403, { error: 'Forbidden', message: 'Admin access required' });
		}
		return { admin: true as const };
	});
