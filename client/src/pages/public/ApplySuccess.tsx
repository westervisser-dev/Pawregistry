import { usePageTitle } from '@/hooks/usePageTitle';
import { Link } from 'react-router-dom';

export function ApplySuccess() {
	usePageTitle('Application Received');

	return (
		<div className="max-w-lg mx-auto px-6 py-16 text-center" id="main-content">
			<div className="text-5xl mb-6">🐾</div>

			<h1 className="font-serif text-2xl font-bold text-warm-900 mb-3">
				Application received!
			</h1>

			<p className="text-warm-600 text-sm leading-relaxed mb-8">
				Your deposit payment is being processed and your spot on the waiting list is secured.
				We&apos;ll send you a confirmation email shortly &mdash; it also contains a link to your
				client portal where you can track your application.
			</p>

			<div className="bg-warm-50 border border-warm-200 rounded-xl p-5 text-left text-sm text-warm-700 mb-8">
				<p className="font-semibold text-warm-900 mb-2">What happens next?</p>
				<ol className="list-decimal list-inside space-y-1.5">
					<li>We review your application (usually within 1&ndash;2 days).</li>
					<li>You&apos;ll receive an email once you&apos;ve been approved.</li>
					<li>Use the portal link in your email to sign in and track everything.</li>
				</ol>
			</div>

			<Link
				to="/login"
				className="inline-flex items-center justify-center px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors mb-4"
			>
				Go to client portal
			</Link>

			<div className="mt-4">
				<Link
					to="/"
					className="text-warm-400 hover:text-warm-600 text-xs transition-colors"
				>
					&larr; Back to home
				</Link>
			</div>
		</div>
	);
}
