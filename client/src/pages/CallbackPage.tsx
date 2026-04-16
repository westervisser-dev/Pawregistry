import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui';

export function CallbackPage() {
	const navigate = useNavigate();
	const init = useAuthStore((s) => s.init);

	useEffect(() => {
		init().then(() => {
			const { user, isAdmin } = useAuthStore.getState();
			if (user) {
				const redirect = sessionStorage.getItem('postLoginRedirect');
				sessionStorage.removeItem('postLoginRedirect');
				navigate(redirect ?? (isAdmin ? '/admin' : '/portal'), { replace: true });
			} else {
				navigate('/login', { replace: true });
			}
		});
	}, [navigate, init]);

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<Spinner size="lg" />
				<p className="text-warm-500 text-sm">Signing you in…</p>
			</div>
		</div>
	);
}
