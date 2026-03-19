import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const ADMIN_EMAIL = 'westervisser@gmail.com';

export function AdminLoginPage() {
	const navigate = useNavigate();
	const init = useAuthStore((s) => s.init);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const submit = async () => {
		setError('');
		if (!email || !password) return;
		if (email !== ADMIN_EMAIL) {
			setError('Unauthorised email address.');
			return;
		}
		setLoading(true);
		const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
		if (authError) {
			setLoading(false);
			setError('Incorrect email or password.');
			return;
		}
		await init();
		navigate('/admin', { replace: true });
	};

	return (
		<div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
			<div className="w-full max-w-sm">
				<div className="text-center mb-8">
					<Link to="/" className="inline-flex items-center gap-2 mb-6">
						<span className="text-3xl">🐾</span>
					</Link>
					<h1 className="font-serif text-2xl font-bold text-stone-900">Admin Portal</h1>
					<p className="text-stone-500 text-sm mt-2">Sign in to manage your registry.</p>
				</div>

				<div className="bg-white rounded-xl border border-stone-200 p-8">
					<div className="flex flex-col gap-4">
						<div>
							<label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && submit()}
								placeholder="you@example.com"
								autoComplete="email"
								className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && submit()}
								placeholder="••••••••"
								autoComplete="current-password"
								className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
						</div>
						{error && <p className="text-red-600 text-sm">{error}</p>}
						<button
							onClick={submit}
							disabled={loading || !email || !password}
							className="w-full py-2.5 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 text-sm"
						>
							{loading ? 'Signing in…' : 'Sign in'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
