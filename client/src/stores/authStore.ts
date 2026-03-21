import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
	user: User | null;
	session: Session | null;
	isAdmin: boolean;
	hasClientRecord: boolean;
	loading: boolean;
	init: () => Promise<void>;
	signOut: () => Promise<void>;
}

// Admin emails configured via env — simple client-side hint (real gate is server-side)
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '').split(',').map((s: string) => s.trim());

export const useAuthStore = create<AuthState>((set) => {
	const applySession = async (session: Session | null, isInit = false) => {
		if (session) {
			localStorage.setItem('access_token', session.access_token);
			const { data } = await api.auth.session.post({ accessToken: session.access_token });
			const hasClientRecord = (data && typeof data === 'object' && 'hasClientRecord' in data)
				? Boolean(data.hasClientRecord)
				: false;
			set({
				user: session.user,
				session,
				isAdmin: ADMIN_EMAILS.includes(session.user.email ?? ''),
				hasClientRecord,
				...(isInit ? { loading: false } : {}),
			});
		} else {
			localStorage.removeItem('access_token');
			set({
				user: null, session: null, isAdmin: false, hasClientRecord: false,
				...(isInit ? { loading: false } : {}),
			});
		}
	};

	return {
		user: null,
		session: null,
		isAdmin: false,
		hasClientRecord: false,
		loading: true,

		init: async () => {
			const { data: { session } } = await supabase.auth.getSession();
			await applySession(session, true);

			supabase.auth.onAuthStateChange(async (_, session) => {
				await applySession(session);
			});
		},

		signOut: async () => {
			await supabase.auth.signOut();
			localStorage.removeItem('access_token');
			set({ user: null, session: null, isAdmin: false, hasClientRecord: false });
		},
	};
});
