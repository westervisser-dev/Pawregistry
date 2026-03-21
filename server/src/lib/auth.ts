import Elysia from 'elysia';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

// derive runs globally so user is available in any route that composes this plugin
export const authPlugin = new Elysia({ name: 'auth' })
	.derive(
		{ as: 'global' },
		async ({ headers }): Promise<{ user: User | null }> => {
			const authHeader = headers['authorization'];
			if (!authHeader?.startsWith('Bearer ')) return { user: null };

			const token = authHeader.slice(7);
			const { data, error: authError } = await supabase.auth.getUser(token);

			if (authError || !data.user) return { user: null };
			return { user: data.user };
		}
	);

const ADMIN_IDS = new Set(
	(process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
);

export const adminPlugin = new Elysia({ name: 'admin' })
	.use(authPlugin)
	.onBeforeHandle({ as: 'scoped' }, ({ user, set }) => {
		if (!user) {
			set.status = 401;
			return { error: 'Unauthorized', message: 'Not authenticated' };
		}
		if (!ADMIN_IDS.has(user.id)) {
			set.status = 403;
			return { error: 'Forbidden', message: 'Admin access required' };
		}
	});
