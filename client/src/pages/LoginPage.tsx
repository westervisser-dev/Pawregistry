import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';

export function LoginPage() {
	const navigate = useNavigate();
	const init = useAuthStore((s) => s.init);
	const [email, setEmail] = useState('');
	const [sent, setSent] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [otp, setOtp] = useState('');
	const [verifying, setVerifying] = useState(false);
	const [otpError, setOtpError] = useState('');

	const submit = async () => {
		if (!email) return;
		setLoading(true);
		setError('');
		const { data, error: apiError } = await api.auth['magic-link'].post({ email });
		if (apiError) {
			setLoading(false);
			setError('No application found for this email address.');
			return;
		}
		if (data && 'token' in data && data.token) {
			const { error: authError } = await supabase.auth.verifyOtp({
				email,
				token: data.token,
				type: 'magiclink',
			});
			setLoading(false);
			if (authError) {
				setError('Auto sign-in failed. Please try again.');
				return;
			}
			await init();
			const { isAdmin } = useAuthStore.getState();
			navigate(isAdmin ? '/admin' : '/portal', { replace: true });
			return;
		}
		setLoading(false);
		setSent(true);
	};

	const verifyOtp = async () => {
		if (!otp.trim()) return;
		setVerifying(true);
		setOtpError('');
		const { error: authError } = await supabase.auth.verifyOtp({
			email,
			token: otp.trim(),
			type: 'email',
		});
		if (authError) {
			setVerifying(false);
			setOtpError('Invalid or expired code. Please check your email and try again.');
			return;
		}
		await init();
		const { isAdmin } = useAuthStore.getState();
		navigate(isAdmin ? '/admin' : '/portal', { replace: true });
	};

	usePageTitle('Client Login');

	return (
		<div className="min-h-screen bg-warm-50 flex items-center justify-center px-6">
			<div className="w-full max-w-sm">
				<div className="text-center mb-8">
					<Link to="/" className="inline-flex items-center gap-2 mb-6">
						<span className="text-3xl">🐾</span>
					</Link>
					<h1 className="font-serif text-2xl font-bold text-warm-900">Client Portal</h1>
					<p className="text-warm-500 text-sm mt-2">
						Sign in to view your puppy updates and documents.
					</p>
				</div>

				<div className="bg-white rounded-xl border border-warm-200 p-8">
					{sent ? (
						<div className="flex flex-col gap-4">
							<div className="text-center">
								<div className="text-4xl mb-4">📬</div>
								<h2 className="font-medium text-warm-900 mb-2">Check your email</h2>
								<p className="text-warm-500 text-sm">
									We sent a sign-in link to <strong>{email}</strong>.
									Click the link in your email, or enter the code below.
								</p>
							</div>
							<div>
								<label htmlFor="otp-code" className="block text-sm font-medium text-warm-700 mb-1">
									Sign-in code
								</label>
								<input
									id="otp-code"
									type="text"
									inputMode="numeric"
									value={otp}
									onChange={(e) => setOtp(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
									placeholder="Enter code from email"
									autoComplete="one-time-code"
									className="w-full px-3 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 tracking-widest text-center"
								/>
							</div>
							{otpError && <p role="alert" className="text-red-600 text-sm">{otpError}</p>}
							<button
								onClick={verifyOtp}
								disabled={verifying || !otp.trim()}
								className="w-full py-2.5 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 text-sm"
							>
								{verifying ? 'Verifying…' : 'Sign in with code'}
							</button>
							<button
								onClick={() => { setSent(false); setOtp(''); setOtpError(''); }}
								className="text-xs text-warm-400 hover:text-warm-600 text-center"
							>
								Use a different email
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							<div>
								<label htmlFor="login-email" className="block text-sm font-medium text-warm-700 mb-1">
									Email address
								</label>
								<input
									id="login-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && submit()}
									placeholder="you@example.com"
									autoComplete="email"
									className="w-full px-3 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
								/>
							</div>
							{error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
							<button
								onClick={submit}
								disabled={loading || !email}
								className="w-full py-2.5 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 text-sm"
							>
								{loading ? 'Sending…' : 'Send sign-in link'}
							</button>
							<p className="text-xs text-warm-400 text-center">
								Only clients with an approved application can sign in.{' '}
								<Link to="/apply" className="text-brand-600 hover:underline">
									Apply here.
								</Link>
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
