import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';

type PaymentStatus = 'loading' | 'complete' | 'failed' | 'no-ref';

export function ApplySuccess() {
	const [searchParams] = useSearchParams();
	const ref = searchParams.get('ref') || searchParams.get('trxref');
	const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(ref ? 'loading' : 'no-ref');

	usePageTitle(paymentStatus === 'failed' ? 'Payment Issue' : 'Application Received');

	useEffect(() => {
		if (!ref) return;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.payments as any).status({ reference: ref }).get()
			.then(({ data }: { data: { status: string } | null }) => {
				if (data?.status === 'complete') {
					setPaymentStatus('complete');
				} else {
					setPaymentStatus('failed');
				}
			})
			.catch(() => {
				setPaymentStatus('failed');
			});
	}, [ref]);

	// Loading state while checking payment
	if (paymentStatus === 'loading') {
		return (
			<div className="max-w-lg mx-auto px-6 py-16 text-center" id="main-content">
				<div className="text-5xl mb-6">⏳</div>
				<h1 className="font-serif text-2xl font-bold text-warm-900 mb-3">
					Checking your payment&hellip;
				</h1>
				<p className="text-warm-500 text-sm">Just a moment while we verify your payment status.</p>
			</div>
		);
	}

	// Payment failed or was cancelled
	if (paymentStatus === 'failed') {
		return (
			<div className="max-w-lg mx-auto px-6 py-16 text-center" id="main-content">
				<h1 className="font-serif text-2xl font-bold text-warm-900 mb-3">
					Oh no, we couldn&apos;t finish your payment!
				</h1>

				<p className="text-warm-600 text-sm leading-relaxed mb-6">
					No need to worry &mdash; your application is still successful and we have received it.
					You can log in to your client portal at any time to complete your deposit payment.
				</p>

				<div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left text-sm text-amber-800 mb-8">
					<p className="font-semibold text-amber-900 mb-2">What happens next?</p>
					<ol className="list-decimal list-inside space-y-1.5">
						<li>Your application has been received &mdash; no need to re-apply.</li>
						<li>Check your email for a sign-in link to your client portal.</li>
						<li>Head to the <strong>Payments</strong> page in your portal to retry your deposit.</li>
					</ol>
				</div>

				<Link
					to="/login"
					className="inline-flex items-center justify-center px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors mb-4"
				>
					Log in to complete payment
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

	// Payment succeeded or no ref (no deposit chosen)
	return (
		<div className="max-w-lg mx-auto px-6 py-16 text-center" id="main-content">
			<div className="text-5xl mb-6">🐾</div>
			<h1 className="font-serif text-2xl font-bold text-warm-900 mb-3">
				Application received!
			</h1>

			<p className="text-warm-600 text-sm leading-relaxed mb-8">
				{paymentStatus === 'complete'
					? <>Your deposit payment has been confirmed and your spot on the waiting list is secured. We&apos;ll send you a confirmation email shortly &mdash; it also contains a link to your client portal where you can track your application.</>
					: <>We&apos;ve received your application. We&apos;ll send you an email shortly with a link to your client portal where you can track your application and manage your deposit.</>
				}
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
