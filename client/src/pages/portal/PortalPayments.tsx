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

function paymentTypeLabel(p: Payment): string {
	if (p.type === 'deposit') return 'Deposit';
	if (p.type === 'booking') return 'Booking Deposit';
	const meta = p.metadata as Record<string, unknown>;
	if (meta.isInstalment) return `Final Payment (${Number(meta.instalmentIndex) + 1} of ${meta.instalmentTotal})`;
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

function DepositJoinCard({ onPay }: { onPay: (tier: 'r5000' | 'r500') => Promise<void> }) {
	const [paying, setPaying] = useState<'r5000' | 'r500' | null>(null);

	const handle = async (tier: 'r5000' | 'r500') => {
		setPaying(tier);
		await onPay(tier);
		setPaying(null);
	};

	return (
		<div className="bg-white border border-warm-200 rounded-xl p-5 flex flex-col gap-4">
			<div>
				<p className="font-semibold text-warm-900 text-sm">Join the Waiting List</p>
				<p className="text-xs text-warm-500 mt-1">Pay a deposit to secure your place on the waiting list and get notified about available puppies.</p>
			</div>
			<div className="flex flex-col gap-2">
				<button
					onClick={() => handle('r5000')}
					disabled={!!paying}
					className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors text-left flex items-center justify-between"
				>
					<div>
						<span className="block">Secured List — R5,000</span>
						<span className="text-xs font-normal opacity-80">Highest priority · first pick from every litter</span>
					</div>
					{paying === 'r5000' ? <span className="text-xs">Redirecting…</span> : <span>→</span>}
				</button>
				<button
					onClick={() => handle('r500')}
					disabled={!!paying}
					className="w-full px-4 py-3 bg-white hover:bg-warm-50 disabled:opacity-50 border border-warm-200 text-warm-800 text-sm font-semibold rounded-lg transition-colors text-left flex items-center justify-between"
				>
					<div>
						<span className="block">Standard List — R500</span>
						<span className="text-xs font-normal text-warm-500">Second priority · R500 applied to final price</span>
					</div>
					{paying === 'r500' ? <span className="text-xs text-warm-500">Redirecting…</span> : <span className="text-warm-400">→</span>}
				</button>
			</div>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PortalPayments() {
	usePageTitle('Payments');
	const [searchParams] = useSearchParams();
	const [payments, setPayments] = useState<Payment[]>([]);
	const [loading, setLoading] = useState(true);
	const [client, setClient] = useState<{
		depositStatus: string;
		depositTier: string | null;
		stage: string;
		puppy: { priceRands: number | null; collarColour: string; sex: string } | null;
		litter: { shippingRands: number | null } | null;
	} | null>(null);
	const [successRef] = useState(searchParams.get('ref'));

	const load = async () => {
		setLoading(true);
		// Fetch payments first — the server auto-verifies pending records with Paystack
		// and updates the client's depositStatus as a side effect. Fetching the client
		// afterwards ensures we read the post-verification state.
		const paymentsRes = await api.payments.mine.get();
		const clientRes = await api.clients.me.get();
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
	// Suppress the manual pay-now section if there is already a pending deposit record
	// (shown in ACTION REQUIRED above) or if we just returned from Paystack (race condition).
	const hasPendingDeposit = pending.some((p) => p.type === 'deposit');
	const hasPendingBooking = pending.some((p) => p.type === 'booking');
	const depositNotPaid = !successRef && !hasPendingDeposit && client?.depositStatus !== 'paid';

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
										<p className="font-semibold text-warm-900">{paymentTypeLabel(p)}</p>
										<p className="text-2xl font-bold text-warm-900 mt-1">{formatRands(p.amountRands)}</p>
										{p.expiresAt && (
											<p className="text-xs text-amber-700 font-medium mt-1">
												⏳ {timeRemaining(p.expiresAt)}
											</p>
										)}
										{p.dueDate && (
											<p className={`text-xs font-medium mt-1 ${new Date(p.dueDate) < new Date() ? 'text-red-700' : 'text-warm-500'}`}>
												{new Date(p.dueDate) < new Date()
													? `Overdue since ${formatDate(p.dueDate)}`
													: `Due by ${formatDate(p.dueDate)}`}
											</p>
										)}
									</div>
									<StatusBadge status={p.status} />
								</div>
								{p.type === 'deposit' && p.status === 'pending' ? (
									<button
										onClick={() => {
											const tier = (p.metadata as Record<string, unknown>)?.tier as 'r5000' | 'r500' | undefined;
											if (tier) handlePay(tier);
										}}
										className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
									>
										Pay now →
									</button>
								) : p.authorizationUrl && (
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

			{/* ── Payment breakdown for booked clients ── */}
			{client?.stage === 'puppy_booked' && client.puppy?.priceRands != null && (() => {
				const puppyPrice = client.puppy!.priceRands!;
				const shipping = client.litter?.shippingRands ?? 0;
				const total = puppyPrice + shipping;
				const paid = payments.filter((p) => p.status === 'complete').reduce((s, p) => s + p.amountRands, 0);
				const remaining = Math.max(0, total - paid);

				return (
					<section className="mb-8">
						<h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">Payment Breakdown</h2>
						<div className="bg-white border border-warm-200 rounded-xl p-5">
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-warm-600">Puppy price</span>
									<span className="font-medium text-warm-900">{formatRands(puppyPrice)}</span>
								</div>
								{shipping > 0 && (
									<div className="flex justify-between">
										<span className="text-warm-600">Shipping</span>
										<span className="font-medium text-warm-900">{formatRands(shipping)}</span>
									</div>
								)}
								<div className="flex justify-between border-t border-warm-100 pt-2">
									<span className="font-medium text-warm-700">Total</span>
									<span className="font-bold text-warm-900">{formatRands(total)}</span>
								</div>
								<div className="flex justify-between text-warm-500">
									<span>Paid so far</span>
									<span>-{formatRands(paid)}</span>
								</div>
								<div className="flex justify-between border-t border-warm-100 pt-2">
									<span className="font-semibold text-warm-700">Remaining</span>
									<span className={`font-bold ${remaining === 0 ? 'text-green-700' : 'text-warm-900'}`}>{formatRands(remaining)}</span>
								</div>
							</div>
						</div>
					</section>
				);
			})()}

			{/* ── Deposit management ── */}
			{depositNotPaid && (
				<section className="mb-8">
					<h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">Waiting List</h2>
					{client?.depositStatus === 'none' ? (
						<DepositJoinCard onPay={handlePay} />
					) : (
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
					)}
				</section>
			)}

			{/* ── Upgrade from R500 → R5000 ── */}
			{!depositNotPaid && client?.depositTier === 'r500' && !hasPendingBooking && (
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
									<p className="text-sm font-medium text-warm-900">{paymentTypeLabel(p)}</p>
									<p className="text-xs text-warm-400 mt-0.5">
										{p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
										{p.dueDate && p.status === 'complete' && (
											<span className="text-warm-300 ml-1">(was due {formatDate(p.dueDate)})</span>
										)}
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
