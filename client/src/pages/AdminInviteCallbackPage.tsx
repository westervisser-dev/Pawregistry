import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui';

export function AdminInviteCallbackPage() {
	const navigate = useNavigate();
	const { user, loading, init } = useAuthStore();
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		document.title = 'Set Password — Paw Registry';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	// init() processes the invite token from the URL hash
	useEffect(() => {
		init();
	}, [init]);

	const submit = async () => {
		setError('');
		if (password.length < 8) {
			setError('Password must be at least 8 characters.');
			return;
		}
		if (password !== confirm) {
			setError('Passwords do not match.');
			return;
		}
		setSubmitting(true);
		const { error: updateError } = await supabase.auth.updateUser({ password });
		if (updateError) {
			setError(updateError.message);
			setSubmitting(false);
			return;
		}
		navigate('/admin', { replace: true });
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Spinner size="lg" />
					<p className="text-warm-500 text-sm">Verifying invite…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="min-h-screen bg-warm-50 flex items-center justify-center px-6">
				<div className="w-full max-w-sm text-center">
					<span className="text-4xl">🐾</span>
					<h1 className="font-serif text-xl font-bold text-warm-900 mt-4 mb-2">Invite link invalid</h1>
					<p className="text-warm-500 text-sm mb-6">This invite link has expired or has already been used.</p>
					<Link to="/admin/login" className="text-sm text-brand-600 hover:underline">Back to login</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-warm-50 flex items-center justify-center px-6">
			<div className="w-full max-w-sm">
				<div className="text-center mb-8">
					<Link to="/" className="inline-flex items-center gap-2 mb-6">
						<span className="text-3xl">🐾</span>
					</Link>
					<h1 className="font-serif text-2xl font-bold text-warm-900">Set your password</h1>
					<p className="text-warm-500 text-sm mt-2">Welcome to Paw Registry. Choose a password to complete your setup.</p>
				</div>

				<div className="bg-white rounded-xl border border-warm-200 p-8">
					<div className="flex flex-col gap-4">
						<div>
							<label htmlFor="new-password" className="block text-sm font-medium text-warm-700 mb-1">Password</label>
							<input
								id="new-password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && submit()}
								placeholder="Min. 8 characters"
								autoComplete="new-password"
								className="w-full px-3 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
						</div>
						<div>
							<label htmlFor="confirm-password" className="block text-sm font-medium text-warm-700 mb-1">Confirm password</label>
							<input
								id="confirm-password"
								type="password"
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && submit()}
								placeholder="Repeat your password"
								autoComplete="new-password"
								className="w-full px-3 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
						</div>
						{error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
						<button
							onClick={submit}
							disabled={submitting || !password || !confirm}
							className="w-full py-2.5 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 text-sm"
						>
							{submitting ? 'Setting password…' : 'Set password & continue'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
