import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingPage } from '@/components/ui';
import type { Payment } from '@paw-registry/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRands(amount: number): string {
	return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-ZA', {
		day: 'numeric', month: 'short', year: 'numeric',
	});
}

function timeRemaining(expiresAt: string): string {
	const diff = new Date(expiresAt).getTime() - Date.now();
	if (diff <= 0) return 'Expired';
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
	if (hours > 0) return `${hours}h ${minutes}m remaining`;
	return `${minutes}m remaining`;
}

function paymentTypeLabel(type: Payment['type']): string {
	if (type === 'deposit') return 'Deposit';
	if (type === 'booking') return 'Booking Deposit';
	return 'Final Payment';
}

function StatusBadge({ status }: { status: Payment['status'] }) {
	const styles: Record<Payment['status'], string> = {
		pending: 'bg-amber-100 text-amber-800 border-amber-200',
		complete: 'bg-green-100 text-green-800 border-green-200',
		failed: 'bg-red-100 text-red-800 border-red-200',
		cancelled: 'bg-warm-100 text-warm-500 border-warm-200',
	};
	const labels: Record<Payment['status'], string> = {
		pending: 'Awaiting Payment',
		complete: 'Paid',
		failed: 'Failed',
		cancelled: 'Cancelled',
	};
	return (
		<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
			{labels[status]}
		</span>
	);
}

// ─── Deposit upgrade card ──────────────────────────────────────────────────────

function DepositUpgradeCard({ currentTier, onPay }: {
	currentTier: 'r500' | null;
	onPay: (tier: 'r5000' | 'r500') => Promise<void>;
}) {
	const [paying, setPaying] = useState(false);

	const handleUpgrade = async () => {
		setPaying(true);
		await onPay('r5000');
		setPaying(false);
	};

	if (currentTier === 'r500') {
		return (
			<div className="bg-white border border-warm-200 rounded-xl p-5 flex flex-col gap-3">
				<div>
					<p className="font-semibold text-warm-900 text-sm">Upgrade to Secured List</p>
					<p className="text-xs text-warm-500 mt-1">Pay R4,500 to upgrade from Standard to Secured. You'll get first pick from every litter.</p>
				</div>
				<button
					onClick={handleUpgrade}
					disabled={paying}
					className="self-start px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
				>
					{paying ? 'Redirecting…' : 'Upgrade — pay R4,500'}
				</button>
			</div>
		);
	}

	return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PortalPayments() {
	usePageTitle('Payments');
	const [searchParams] = useSearchParams();
	const [payments, setPayments] = useState<Payment[]>([]);
	const [loading, setLoading] = useState(true);
	const [client, setClient] = useState<{ depositStatus: string; depositTier: string | null } | null>(null);
	const [successRef] = useState(searchParams.get('ref'));

	const load = async () => {
		setLoading(true);
		const [paymentsRes, clientRes] = await Promise.all([
			api.payments.mine.get(),
			api.clients.me.get(),
		]);
		if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
		if (clientRes.data) setClient(clientRes.data as typeof client);
		setLoading(false);
	};

	useEffect(() => { load(); }, []);

	const handlePay = async (tier: 'r5000' | 'r500') => {
		const { data } = await api.payments.deposit.post({ tier });
		if (data?.authorizationUrl) {
			window.location.href = data.authorizationUrl as string;
		}
	};

	if (loading) return <LoadingPage />;

	const pending = payments.filter((p) => p.status === 'pending');
	const history = payments.filter((p) => p.status !== 'pending');
	const depositNotPaid = !successRef && client?.depositStatus !== 'paid';

	return (
		<div className="max-w-2xl mx-auto px-4 sm:px-6 py-8" id="main-content">
			<h1 className="font-serif text-2xl font-bold text-warm-900 mb-6">Payments</h1>

			{/* ── Success banner after Paystack redirect ── */}
			{!!successRef && (
				<div role="status" className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center gap-3">
					<span className="text-lg">✓</span>
					<span>Payment received — your record has been updated. Thank you!</span>
				</div>
			)}

			{/* ── Pending payments ── */}
			{pending.length > 0 && (
				<section className="mb-8">
					<h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">Action Required</h2>
					<div className="flex flex-col gap-3">
						{pending.map((p) => (
							<div key={p.id} className="bg-white border-2 border-amber-200 rounded-xl p-5 flex flex-col gap-4">
								<div className="flex items-start justify-between gap-4">
									<div>
										<p className="font-semibold text-warm-900">{paymentTypeLabel(p.type)}</p>
										<p className="text-2xl font-bold text-warm-900 mt-1">{formatRands(p.amountRands)}</p>
										{p.expiresAt && (
											<p className="text-xs text-amber-700 font-medium mt-1">
												⏳ {timeRemaining(p.expiresAt)}
											</p>
										)}
									</div>
									<StatusBadge status={p.status} />
								</div>
								{p.authorizationUrl && (
									<a
										href={p.authorizationUrl}
										className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
									>
										Pay now →
									</a>
								)}
							</div>
						))}
					</div>
				</section>
			)}

			{/* ── Deposit management ── */}
			{depositNotPaid && (
				<section className="mb-8">
					<h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">Your Deposit</h2>
					<div className="flex flex-col gap-3">
						<div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
							Your deposit has not been received yet. Pay now to secure your position on the waiting list.
						</div>
						<div className="flex flex-col sm:flex-row gap-3">
							<button
								onClick={() => handlePay('r5000')}
								className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
							>
								Pay R5,000 — Secured List
							</button>
							<button
								onClick={() => handlePay('r500')}
								className="flex-1 px-4 py-3 bg-white hover:bg-warm-50 border border-warm-200 text-warm-800 text-sm font-semibold rounded-lg transition-colors"
							>
								Pay R500 — Standard List
							</button>
						</div>
					</div>
				</section>
			)}

			{/* ── Upgrade from R500 → R5000 ── */}
			{!depositNotPaid && client?.depositTier === 'r500' && (
				<section className="mb-8">
					<h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">Upgrade</h2>
					<DepositUpgradeCard currentTier="r500" onPay={handlePay} />
				</section>
			)}

			{/* ── Payment history ── */}
			{history.length > 0 && (
				<section>
					<h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">Payment History</h2>
					<div className="bg-white border border-warm-200 rounded-xl overflow-hidden">
						{history.map((p, i) => (
							<div key={p.id} className={`flex items-center justify-between px-5 py-4 gap-4 ${i > 0 ? 'border-t border-warm-100' : ''}`}>
								<div>
									<p className="text-sm font-medium text-warm-900">{paymentTypeLabel(p.type)}</p>
									<p className="text-xs text-warm-400 mt-0.5">
										{p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
									</p>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-sm font-semibold text-warm-900">{formatRands(p.amountRands)}</span>
									<StatusBadge status={p.status} />
								</div>
							</div>
						))}
					</div>
				</section>
			)}

			{/* ── Empty state ── */}
			{pending.length === 0 && history.length === 0 && !depositNotPaid && (
				<div className="text-center py-16 text-warm-400 text-sm">
					No payment records yet.
				</div>
			)}
		</div>
	);
}
