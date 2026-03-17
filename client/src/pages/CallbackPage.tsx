import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';

export function CallbackPage() {
	const navigate = useNavigate();

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				navigate('/portal', { replace: true });
			} else {
				navigate('/login', { replace: true });
			}
		});
	}, [navigate]);

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<Spinner size="lg" />
				<p className="text-stone-500 text-sm">Signing you in…</p>
			</div>
		</div>
	);
}
