import { useState } from 'react';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

export function LoginPage() {
	const [email, setEmail] = useState('');
	const [sent, setSent] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const submit = async () => {
		if (!email) return;
		setLoading(true);
		setError('');
		const { error: apiError } = await api.auth['magic-link'].post({ email });
		setLoading(false);
		if (apiError) {
			setError('No application found for this email address.');
			return;
		}
		setSent(true);
	};

	return (
		<div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
			<div className="w-full max-w-sm">
				<div className="text-center mb-8">
					<Link to="/" className="inline-flex items-center gap-2 mb-6">
						<span className="text-3xl">🐾</span>
					</Link>
					<h1 className="font-serif text-2xl font-bold text-stone-900">Client Portal</h1>
					<p className="text-stone-500 text-sm mt-2">
						Sign in to view your puppy updates, documents, and messages.
					</p>
				</div>

				<div className="bg-white rounded-xl border border-stone-200 p-8">
					{sent ? (
						<div className="text-center">
							<div className="text-4xl mb-4">📬</div>
							<h2 className="font-medium text-stone-900 mb-2">Check your email</h2>
							<p className="text-stone-500 text-sm">
								We sent a sign-in link to <strong>{email}</strong>.
								Click the link in your email to access your portal.
							</p>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							<div>
								<label className="block text-sm font-medium text-stone-700 mb-1">
									Email address
								</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && submit()}
									placeholder="you@example.com"
									className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
								/>
							</div>
							{error && <p className="text-red-600 text-sm">{error}</p>}
							<button
								onClick={submit}
								disabled={loading || !email}
								className="w-full py-2.5 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 text-sm"
							>
								{loading ? 'Sending…' : 'Send sign-in link'}
							</button>
							<p className="text-xs text-stone-400 text-center">
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
