import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
	user: User | null;
	session: Session | null;
	isAdmin: boolean;
	hasClientRecord: boolean;
	clientStage: string | null;
	loading: boolean;
	init: () => Promise<void>;
	signOut: () => Promise<void>;
	setClientStage: (stage: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => {
	const applySession = async (session: Session | null, isInit = false) => {
		if (session) {
			localStorage.setItem('access_token', session.access_token);
			const { data } = await api.auth.session.post({ accessToken: session.access_token });
			const hasClientRecord = (data && typeof data === 'object' && 'hasClientRecord' in data)
				? Boolean(data.hasClientRecord)
				: false;
			const isAdmin = (data && typeof data === 'object' && 'isAdmin' in data)
				? Boolean(data.isAdmin)
				: false;
			const clientStage = (data && typeof data === 'object' && 'clientStage' in data && typeof data.clientStage === 'string')
				? data.clientStage
				: null;
			set({
				user: session.user,
				session,
				isAdmin,
				hasClientRecord,
				clientStage,
				...(isInit ? { loading: false } : {}),
			});
		} else {
			localStorage.removeItem('access_token');
			set({
				user: null, session: null, isAdmin: false, hasClientRecord: false, clientStage: null,
				...(isInit ? { loading: false } : {}),
			});
		}
	};

	return {
		user: null,
		session: null,
		isAdmin: false,
		hasClientRecord: false,
		clientStage: null,
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
			set({ user: null, session: null, isAdmin: false, hasClientRecord: false, clientStage: null });
		},

		setClientStage: (stage) => set({ clientStage: stage }),
	};
});
