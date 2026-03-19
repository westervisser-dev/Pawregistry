import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '').split(',').map((s: string) => s.trim());

export function CallbackPage() {
	const navigate = useNavigate();
	const init = useAuthStore((s) => s.init);

	useEffect(() => {
		init().then(() => {
			supabase.auth.getSession().then(({ data: { session } }) => {
				if (session) {
					const isAdmin = ADMIN_EMAILS.includes(session.user.email ?? '');
					navigate(isAdmin ? '/admin' : '/portal', { replace: true });
				} else {
					navigate('/login', { replace: true });
				}
			});
		});
	}, [navigate, init]);

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<Spinner size="lg" />
				<p className="text-stone-500 text-sm">Signing you in…</p>
			</div>
		</div>
	);
}
