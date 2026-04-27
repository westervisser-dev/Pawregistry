import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingPage, Glyph } from '@/components/ui';
import type { Payment, Invoice } from '@paw-registry/shared';

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

function DepositUpgradeCard({ currentTier, depositStatus, onPay }: {
	currentTier: 'r500' | null;
	depositStatus: string;
	onPay: (tier: 'r5000' | 'r500') => Promise<void>;
}) {
	const [paying, setPaying] = useState(false);

	const handleUpgrade = async () => {
		setPaying(true);
		await onPay('r5000');
		setPaying(false);
	};

	if (currentTier === 'r500') {
		// If R500 deposit is already paid, only the R4,500 top-up is charged.
		// Otherwise (pending / not yet received) the full R5,000 is charged.
		const alreadyPaid = depositStatus === 'paid';
		const upgradeAmount = alreadyPaid ? 'R4,500' : 'R5,000';
		const upgradeDetail = alreadyPaid
			? 'Pay R4,500 to top up to the full R5,000 secured deposit. You\'ll get first pick from every litter.'
			: 'Pay R5,000 to join the Secured List. You\'ll get first pick from every litter.';

		return (
			<div className="bg-white border border-warm-200 rounded-xl p-5 flex flex-col gap-3">
				<div>
					<p className="font-semibold text-warm-900 text-sm">Upgrade to Secured List</p>
					<p className="text-xs text-warm-500 mt-1">{upgradeDetail}</p>
				</div>
				<button
					onClick={handleUpgrade}
					disabled={paying}
					className="self-start px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
				>
					{paying ? 'Redirecting…' : `Upgrade — pay ${upgradeAmount}`}
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
	const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);

	const load = async () => {
		setLoading(true);
		// Fetch payments first — the server auto-verifies pending records with Paystack
		// and updates the client's depositStatus as a side effect. Fetching the client
		// afterwards ensures we read the post-verification state.
		const paymentsRes = await api.payments.mine.get();
		const clientRes = await api.clients.me.get();
		if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
		if (clientRes.data) setClient(clientRes.data as typeof client);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.invoices as any).mine.get().then(({ data }: { data: Invoice[] | null }) => {
			if (data) setClientInvoices(data);
		}).catch(() => {});
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

	const puppyPrice = client?.puppy?.priceRands ?? null;
	const shippingRands = client?.litter?.shippingRands ?? 0;
	const totalRands = puppyPrice != null ? puppyPrice + shippingRands : null;
	const paidRands = payments.filter((p) => p.status === 'complete').reduce((s, p) => s + p.amountRands, 0);
	const remainingRands = totalRands != null ? Math.max(0, totalRands - paidRands) : null;
	const hasPuppyTotals = client?.stage === 'puppy_booked' && totalRands != null;
	const pct = hasPuppyTotals && totalRands! > 0 ? Math.min(100, Math.round((paidRands / totalRands!) * 100)) : 0;

	return (
		<div className="max-w-[900px] mx-auto px-5 md:px-8 pt-6 md:pt-10 pb-8">
			<div className="mb-8">
				<div className="text-[11px] uppercase tracking-[0.14em] text-warm-500 mb-2">Money & invoices</div>
				<h1 className="font-serif text-[30px] md:text-[38px] text-warm-900 leading-[1.05]">Payments</h1>
				<p className="text-[13.5px] md:text-[14.5px] text-warm-600 mt-2">Your deposits, booking payment and final balance.</p>
			</div>

			{/* ── Success banner after Paystack redirect ── */}
			{!!successRef && (
				<div role="status" className="mb-6 px-4 py-3.5 bg-[#e4ebe0] border border-[#b6c9ae] rounded-xl text-[13px] text-[#2a3f22] flex items-center gap-3">
					<Glyph shape="check" color="#3e5a2a" size={14} />
					<span>Payment received — your record has been updated. Thank you!</span>
				</div>
			)}

			{/* ── Editorial total hero (booked clients) ── */}
			{hasPuppyTotals && (
				<div className="mb-8 rounded-[16px] border border-black/[0.05] p-6 md:p-8" style={{ background: 'linear-gradient(180deg,#fff 0%,#fdf6ee 100%)' }}>
					<div className="text-[11px] uppercase tracking-[0.14em] text-warm-500">
						Total for {client?.puppy?.collarColour ? `${client.puppy.collarColour} collar` : 'your puppy'}
					</div>
					<div className="flex items-baseline gap-3 mt-2">
						<div className="font-serif text-[48px] md:text-[56px] leading-none text-warm-900">{formatRands(paidRands)}</div>
						<div className="text-[14px] text-warm-500">of {formatRands(totalRands!)}</div>
					</div>
					<div className="h-2 bg-warm-100 rounded-full overflow-hidden mt-4">
						<div className="h-full rounded-full transition-all duration-700" style={{ width: pct + '%', background: 'linear-gradient(90deg,#d98e3a,#c47420)' }} />
					</div>
					<div className="grid grid-cols-3 gap-3 mt-5">
						<div>
							<div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Paid</div>
							<div className="font-serif text-[20px] text-warm-900 mt-0.5">{formatRands(paidRands)}</div>
						</div>
						<div>
							<div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Remaining</div>
							<div className="font-serif text-[20px] text-warm-900 mt-0.5">{formatRands(remainingRands ?? 0)}</div>
						</div>
						<div>
							<div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Shipping</div>
							<div className="font-serif text-[20px] text-warm-900 mt-0.5">{shippingRands > 0 ? formatRands(shippingRands) : '—'}</div>
						</div>
					</div>
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
					<DepositUpgradeCard currentTier="r500" depositStatus={client?.depositStatus ?? 'none'} onPay={handlePay} />
				</section>
			)}

			{/* ── Payment history ── */}
			{history.length > 0 && (
				<section className="mb-8">
					<h2 className="font-serif text-[22px] text-warm-900 mb-3">History</h2>
					<div className="bg-white rounded-[14px] border border-black/[0.05] divide-y divide-black/[0.04]">
						{history.map((p) => (
							<div key={p.id} className="flex items-center gap-4 px-5 py-4">
								<div
									className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
									style={{ background: p.status === 'complete' ? '#e4ebe0' : '#fef3e7' }}
								>
									<Glyph
										shape={p.status === 'complete' ? 'check' : 'coin'}
										color={p.status === 'complete' ? '#3e5a2a' : '#a35c17'}
										size={14}
									/>
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-[13.5px] font-medium text-warm-900 truncate">{paymentTypeLabel(p)}</div>
									<div className="text-[11.5px] text-warm-500">
										{p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
										{p.dueDate && p.status === 'complete' && (
											<span className="text-warm-300 ml-1">· was due {formatDate(p.dueDate)}</span>
										)}
									</div>
								</div>
								<div className="text-right flex-shrink-0">
									<div className="text-[13.5px] font-medium text-warm-900 tabular-nums">{formatRands(p.amountRands)}</div>
									<div className="text-[11px] text-warm-500 capitalize">{p.status === 'complete' ? 'Paid' : p.status}</div>
								</div>
							</div>
						))}
					</div>
				</section>
			)}

			{/* ── Invoices ── */}
			{clientInvoices.length > 0 && (
				<section>
					<h2 className="font-serif text-[22px] text-warm-900 mb-3">Invoices</h2>
					<div className="bg-white rounded-[14px] border border-black/[0.05] divide-y divide-black/[0.04]">
						{clientInvoices.map((inv) => {
							const balanceDue = Math.max(0, inv.totalRands - inv.paidRands);
							const isPaid = inv.status === 'paid' || balanceDue === 0;
							const isCancelled = inv.status === 'cancelled';
							const statusLabel = isPaid ? 'Paid' : isCancelled ? 'Cancelled' : 'Outstanding';
							return (
								<div key={inv.id} className="flex items-center gap-4 px-5 py-4">
									<div
										className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
										style={{ background: isPaid ? '#e4ebe0' : isCancelled ? '#f5f0e8' : '#fef3e7' }}
									>
										<Glyph
											shape="doc"
											color={isPaid ? '#3e5a2a' : isCancelled ? '#9e8b78' : '#a35c17'}
											size={14}
										/>
									</div>
									<div className="flex-1 min-w-0">
										<div className="text-[13.5px] font-medium text-warm-900 truncate">{inv.invoiceNumber}</div>
										<div className="text-[11.5px] text-warm-500">
											{formatRands(inv.totalRands)} total
											{balanceDue > 0 && <span className="text-[#a35c17] ml-1">· {formatRands(balanceDue)} due</span>}
										</div>
									</div>
									<div className="flex items-center gap-3 flex-shrink-0">
										<span className="text-[11px] text-warm-500">{statusLabel}</span>
										<a
											href={`/invoices/${inv.viewToken}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-[12.5px] text-[#c47420] font-medium"
										>
											View
										</a>
									</div>
								</div>
							);
						})}
					</div>
				</section>
			)}

			{/* ── Empty state ── */}
			{pending.length === 0 && history.length === 0 && !depositNotPaid && clientInvoices.length === 0 && (
				<div className="text-center py-16 text-warm-400 text-[13px]">
					No payment records yet.
				</div>
			)}
		</div>
	);
}
