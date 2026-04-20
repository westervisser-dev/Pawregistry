import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, LoadingPage, PageHeader, Segmented, StatCard } from '@/components/ui';
import { AdminTable, PaymentProgressCell } from './_shared';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Invoice, PaymentSummary, PaymentWithClient } from '@paw-registry/shared';

type Tab = 'by-client' | 'pending' | 'history';

interface PaymentStats {
	collectedThisMonth: number;
	outstanding: number;
	overdueCount: number;
	needsPlanCount: number;
}

interface ClientSummaryRow extends PaymentSummary {
	clientName: string;
	clientEmail: string;
	clientStage: string;
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
	if (status === 'complete') {
		return (
			<span className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-[3px] rounded-full font-medium" style={{ background: '#e4ebe0', color: '#3e5a2a' }}>
				<span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3e5a2a' }} aria-hidden="true" /> Paid
			</span>
		);
	}
	if (status === 'pending') {
		return (
			<span className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-[3px] rounded-full font-medium" style={{ background: '#fef3e7', color: '#a35c17' }}>
				<span className="w-1.5 h-1.5 rounded-full" style={{ background: '#c47420' }} aria-hidden="true" /> Pending
			</span>
		);
	}
	if (status === 'failed') {
		return (
			<span className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-[3px] rounded-full font-medium" style={{ background: '#f4e4e1', color: '#883224' }}>
				<span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a8412e' }} aria-hidden="true" /> Failed
			</span>
		);
	}
	return (
		<span className="inline-flex items-center px-2 py-[3px] rounded-full font-medium text-[11.5px] bg-warm-100 text-warm-500">
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
}

// ─── Payment type dot ────────────────────────────────────────────────────────

const typeAccent: Record<'deposit' | 'booking' | 'final', string> = {
	deposit: '#1e5b8a',
	booking: '#7a47a8',
	final: '#4a6741',
};

function TypeTag({ payment }: { payment: PaymentWithClient }) {
	return (
		<span className="inline-flex items-center gap-1.5 text-[12px] text-warm-700">
			<span className="w-1.5 h-1.5 rounded-full" style={{ background: typeAccent[payment.type] }} aria-hidden="true" />
			{typeLabel(payment)}
		</span>
	);
}

// ─── Payment type label ──────────────────────────────────────────────────────

function typeLabel(p: PaymentWithClient): string {
	const meta = p.metadata as Record<string, unknown>;
	if (meta?.isInstalment) return `Instalment ${Number(meta.instalmentIndex) + 1} of ${meta.instalmentTotal}`;
	return p.type === 'deposit' ? 'Deposit' : p.type === 'booking' ? 'Booking' : 'Final';
}

// ─── Time remaining helper ───────────────────────────────────────────────────

function timeRemaining(expiresAt: string | null): string | null {
	if (!expiresAt) return null;
	const diff = new Date(expiresAt).getTime() - Date.now();
	if (diff <= 0) return 'Expired';
	const hours = Math.floor(diff / 3_600_000);
	const mins = Math.floor((diff % 3_600_000) / 60_000);
	return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
}

// ─── By Client Tab ───────────────────────────────────────────────────────────

function ByClientTab({ summaries, invoiceCounts }: { summaries: ClientSummaryRow[]; invoiceCounts: Record<string, number> }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [expandedPayments, setExpandedPayments] = useState<PaymentWithClient[]>([]);
	const [loadingExpanded, setLoadingExpanded] = useState(false);

	const sorted = [...summaries].sort((a, b) => {
		if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
		return (b.balanceDue ?? 0) - (a.balanceDue ?? 0);
	});

	const toggleExpand = async (clientId: string) => {
		if (expandedId === clientId) {
			setExpandedId(null);
			return;
		}
		setExpandedId(clientId);
		setLoadingExpanded(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.payments as any).client({ clientId }).get();
		setExpandedPayments((data ?? []) as PaymentWithClient[]);
		setLoadingExpanded(false);
	};

	return (
		<Card>
			<AdminTable headers={['Client', { label: 'Total', hideMobile: true }, 'Payment', { label: 'Balance', hideMobile: true }, '']}>
				{sorted.map((s) => (
					<>
						<tr
							key={s.clientId}
							className="border-b border-black/[0.05] hover:bg-warm-50 bg-white transition-colors cursor-pointer"
							onClick={() => toggleExpand(s.clientId)}
						>
							<td className="py-3 px-2 md:px-4">
								<div className="flex items-center gap-2">
									<p className="font-medium text-warm-900">{s.clientName}</p>
									{(invoiceCounts[s.clientId] ?? 0) > 0 && (
										<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-100 text-brand-700">
											{invoiceCounts[s.clientId]} inv
										</span>
									)}
								</div>
								<p className="text-xs text-warm-400">{s.clientEmail}</p>
								{s.clientStage && (
									<span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-warm-100 text-warm-500 capitalize">
										{s.clientStage.replace(/_/g, ' ')}
									</span>
								)}
							</td>
							<td className="hidden md:table-cell py-3 px-4 text-sm text-warm-700 tabular-nums">
								{s.totalPriceRands != null ? `R${s.totalPriceRands.toLocaleString()}` : '—'}
							</td>
							<td className="py-3 px-2 md:px-4">
								<PaymentProgressCell summary={s} stage={s.clientStage} />
							</td>
							<td className="hidden md:table-cell py-3 px-4">
								{s.balanceDue != null ? (
									<span className={`text-sm font-medium tabular-nums ${s.balanceDue === 0 ? 'text-green-600' : s.overdueCount > 0 ? 'text-red-600' : s.isTotalEstimated ? 'text-warm-400' : 'text-warm-700'}`}>
										{s.isTotalEstimated && <span className="text-warm-300 mr-0.5">~</span>}R{s.balanceDue.toLocaleString()}
									</span>
								) : '—'}
							</td>
							<td className="py-3 px-2 md:px-4">
								<Link
									to={`/admin/clients/${s.clientId}`}
									className="text-sm text-brand-600 hover:underline"
									onClick={(e) => e.stopPropagation()}
								>
									View →
								</Link>
							</td>
						</tr>
						{expandedId === s.clientId && (
							<tr key={`${s.clientId}-expanded`} className="bg-warm-50/50">
								<td colSpan={5} className="px-4 md:px-8 py-3">
									{loadingExpanded ? (
										<p className="text-sm text-warm-400">Loading...</p>
									) : expandedPayments.length === 0 ? (
										<p className="text-sm text-warm-400">No payments recorded.</p>
									) : (
										<div className="space-y-1.5">
											{expandedPayments.map((p) => (
												<div key={p.id} className="flex items-center gap-3 text-xs text-warm-600">
													<span className="w-24 font-medium">{typeLabel(p as PaymentWithClient)}</span>
													<span className="tabular-nums">R{p.amountRands.toLocaleString()}</span>
													<StatusBadge status={p.status} />
													<span className="text-warm-400">
														{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
													</span>
												</div>
											))}
										</div>
									)}
								</td>
							</tr>
						)}
					</>
				))}
				{sorted.length === 0 && (
					<tr><td colSpan={5} className="py-6 text-center text-sm text-warm-400">No active clients with payments.</td></tr>
				)}
			</AdminTable>
		</Card>
	);
}

// ─── Pending Tab ─────────────────────────────────────────────────────────────

function PendingTab({ payments: pendingPayments }: { payments: PaymentWithClient[] }) {
	const now = Date.now();
	const sorted = [...pendingPayments].sort((a, b) => {
		const aOverdue = a.dueDate && new Date(a.dueDate).getTime() < now ? 1 : 0;
		const bOverdue = b.dueDate && new Date(b.dueDate).getTime() < now ? 1 : 0;
		if (aOverdue !== bOverdue) return bOverdue - aOverdue;
		if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	});

	return (
		<Card>
			<AdminTable headers={['Client', 'Type', { label: 'Amount', hideMobile: true }, { label: 'Due / Expires', hideMobile: true }, { label: 'Status', hideMobile: true }, '']}>
				{sorted.map((p) => {
					const isOverdue = !!p.dueDate && new Date(p.dueDate).getTime() < now;
					return (
						<tr key={p.id} className={`border-b border-black/[0.05] hover:bg-warm-50 bg-white transition-colors ${isOverdue ? 'border-l-2 border-l-red-400' : ''}`}>
							<td className="py-3 px-2 md:px-4">
								<p className="font-medium text-warm-900">{p.client.firstName} {p.client.lastName}</p>
								<p className="text-xs text-warm-400 md:hidden">
									R{p.amountRands.toLocaleString()} · {typeLabel(p)}
								</p>
							</td>
							<td className="hidden md:table-cell py-3 px-4"><TypeTag payment={p} /></td>
							<td className="hidden md:table-cell py-3 px-4 text-sm text-warm-700 tabular-nums font-medium">
								R{p.amountRands.toLocaleString()}
							</td>
							<td className="hidden md:table-cell py-3 px-4 text-xs">
								{isOverdue ? (
									<span className="text-red-600 font-medium">Overdue since {new Date(p.dueDate!).toLocaleDateString()}</span>
								) : p.dueDate ? (
									<span className="text-warm-500">Due {new Date(p.dueDate).toLocaleDateString()}</span>
								) : p.expiresAt ? (
									<span className="text-amber-600">{timeRemaining(p.expiresAt)}</span>
								) : (
									<span className="text-warm-300">—</span>
								)}
							</td>
							<td className="hidden md:table-cell py-3 px-4"><StatusBadge status={p.status} /></td>
							<td className="py-3 px-2 md:px-4 text-right">
								{p.authorizationUrl && (
									<button
										className="text-xs text-brand-600 hover:underline mr-3"
										onClick={() => navigator.clipboard.writeText(p.authorizationUrl!)}
										title="Copy Paystack link"
									>
										Copy link
									</button>
								)}
								<Link to={`/admin/clients/${p.clientId}`} className="text-sm text-brand-600 hover:underline">
									View →
								</Link>
							</td>
						</tr>
					);
				})}
				{sorted.length === 0 && (
					<tr><td colSpan={6} className="py-6 text-center text-sm text-warm-400">No pending payments.</td></tr>
				)}
			</AdminTable>
		</Card>
	);
}

// ─── History Tab ─────────────────────────────────────────────────────────────

function HistoryTab({ payments: historyPayments }: { payments: PaymentWithClient[] }) {
	return (
		<Card>
			<AdminTable headers={['Client', 'Type', { label: 'Amount', hideMobile: true }, { label: 'Paid', hideMobile: true }, { label: 'Reference', hideMobile: true }]}>
				{historyPayments.map((p) => (
					<tr key={p.id} className="border-b border-black/[0.05] hover:bg-warm-50 bg-white transition-colors">
						<td className="py-3 px-2 md:px-4">
							<p className="font-medium text-warm-900">{p.client.firstName} {p.client.lastName}</p>
							<p className="text-xs text-warm-400 md:hidden">
								R{p.amountRands.toLocaleString()} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
							</p>
						</td>
						<td className="hidden md:table-cell py-3 px-4"><TypeTag payment={p} /></td>
						<td className="hidden md:table-cell py-3 px-4 text-sm text-warm-700 tabular-nums font-medium">
							R{p.amountRands.toLocaleString()}
						</td>
						<td className="hidden md:table-cell py-3 px-4 text-xs text-warm-500">
							{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
						</td>
						<td className="hidden md:table-cell py-3 px-4 text-xs text-warm-400 font-mono">
							{p.reference}
						</td>
					</tr>
				))}
				{historyPayments.length === 0 && (
					<tr><td colSpan={5} className="py-6 text-center text-sm text-warm-400">No completed payments yet.</td></tr>
				)}
			</AdminTable>
		</Card>
	);
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function AdminPayments() {
	usePageTitle('Payments');

	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<Tab>('by-client');
	const [stats, setStats] = useState<PaymentStats | null>(null);
	const [clientSummaries, setClientSummaries] = useState<ClientSummaryRow[]>([]);
	const [pendingPayments, setPendingPayments] = useState<PaymentWithClient[]>([]);
	const [historyPayments, setHistoryPayments] = useState<PaymentWithClient[]>([]);
	const [invoiceCounts, setInvoiceCounts] = useState<Record<string, number>>({});

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const paymentsApi = api.payments as any;

		const [statsRes, summariesRes, clientsRes] = await Promise.all([
			paymentsApi.admin.stats.get(),
			paymentsApi.admin.summaries.get(),
			api.clients.admin.get({ query: {} }),
		]);

		if (statsRes.data) setStats(statsRes.data as PaymentStats);

		// Merge client info into summaries
		const allClients = (clientsRes.data ?? []) as Array<{ id: string; firstName: string; lastName: string; email: string; stage: string }>;
		const clientMap = new Map(allClients.map((c) => [c.id, c]));

		if (summariesRes.data) {
			const rows = (summariesRes.data as PaymentSummary[]).map((s) => {
				const client = clientMap.get(s.clientId);
				return {
					...s,
					clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
					clientEmail: client?.email ?? '',
					clientStage: client?.stage ?? '',
				};
			});
			setClientSummaries(rows);
		}

		// Lazy-load tab data and invoices in background
		paymentsApi.admin.all.get({ query: { status: 'pending' } }).then(({ data }: { data: PaymentWithClient[] | null }) => {
			if (data) setPendingPayments(data);
		});
		paymentsApi.admin.all.get({ query: { status: 'complete' } }).then(({ data }: { data: PaymentWithClient[] | null }) => {
			if (data) setHistoryPayments(data);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.invoices as any).admin.get().then(({ data }: { data: Invoice[] | null }) => {
			if (data) {
				const counts: Record<string, number> = {};
				for (const inv of data) {
					counts[inv.clientId] = (counts[inv.clientId] ?? 0) + 1;
				}
				setInvoiceCounts(counts);
			}
		});

		setLoading(false);
	};

	const segmentedOptions: { value: Tab; label: string; count?: number }[] = [
		{ value: 'by-client', label: 'By client', count: clientSummaries.length },
		{ value: 'pending', label: 'Pending', count: pendingPayments.length },
		{ value: 'history', label: 'History', count: historyPayments.length },
	];

	return (
		<div className="p-5 md:p-8 max-w-[1600px]">
			<PageHeader title="Payments" subtitle="Track deposits, booking payments and final balances." />

			{/* Stat cards */}
			{stats && (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
					<StatCard
						label={`${new Date().toLocaleDateString('en-ZA', { month: 'long' })} collected`}
						value={`R${stats.collectedThisMonth.toLocaleString()}`}
						accent="green"
						sub="Month-to-date"
					/>
					<StatCard
						label="Outstanding"
						value={`R${stats.outstanding.toLocaleString()}`}
						accent="brand"
						sub={`${pendingPayments.length} pending`}
					/>
					<StatCard
						label="Overdue"
						value={stats.overdueCount}
						accent="rust"
						sub={stats.overdueCount > 0 ? 'Immediate follow-up' : 'All caught up'}
					/>
					<StatCard
						label="Needs plan"
						value={stats.needsPlanCount}
						accent="plum"
						sub={stats.needsPlanCount > 0 ? 'Booked without final plan' : 'All booked clients covered'}
					/>
				</div>
			)}

			<div className="mb-4">
				<Segmented options={segmentedOptions} value={tab} onChange={setTab} ariaLabel="Payments view" />
			</div>

			{loading ? <LoadingPage /> : (
				<>
					{tab === 'by-client' && <ByClientTab summaries={clientSummaries} invoiceCounts={invoiceCounts} />}
					{tab === 'pending' && <PendingTab payments={pendingPayments} />}
					{tab === 'history' && <HistoryTab payments={historyPayments} />}
				</>
			)}
		</div>
	);
}

export default AdminPayments;
