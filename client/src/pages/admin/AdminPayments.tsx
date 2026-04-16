import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, LoadingPage, PageHeader } from '@/components/ui';
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

// ─── Stat Card (supports currency) ───────────────────────────────────────────

function PaymentStatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
	return (
		<div className={`bg-white rounded-[14px] border border-black/[0.07] p-5 pb-[18px] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:rounded-t-[14px] ${accent}`}>
			<p className="font-serif text-[28px] text-warm-900 leading-none mb-1">{value}</p>
			<p className="text-xs text-warm-500 uppercase tracking-[0.04em]">{label}</p>
		</div>
	);
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
	const cls =
		status === 'complete' ? 'bg-green-100 text-green-700' :
		status === 'pending' ? 'bg-amber-100 text-amber-700' :
		status === 'failed' ? 'bg-red-100 text-red-700' :
		'bg-warm-100 text-warm-500';
	const label = status === 'complete' ? 'Paid' : status.charAt(0).toUpperCase() + status.slice(1);
	return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
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
							</td>
							<td className="hidden md:table-cell py-3 px-4 text-sm text-warm-700 tabular-nums">
								{s.totalPriceRands != null ? `R${s.totalPriceRands.toLocaleString()}` : '—'}
							</td>
							<td className="py-3 px-2 md:px-4">
								<PaymentProgressCell summary={s} stage={s.clientStage} />
							</td>
							<td className="hidden md:table-cell py-3 px-4">
								{s.balanceDue != null ? (
									<span className={`text-sm font-medium tabular-nums ${s.balanceDue === 0 ? 'text-green-600' : s.overdueCount > 0 ? 'text-red-600' : 'text-warm-700'}`}>
										R{s.balanceDue.toLocaleString()}
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
							<td className="hidden md:table-cell py-3 px-4 text-sm text-warm-600">{typeLabel(p)}</td>
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
						<td className="hidden md:table-cell py-3 px-4 text-sm text-warm-600">{typeLabel(p)}</td>
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

	const tabs: { key: Tab; label: string }[] = [
		{ key: 'by-client', label: 'By Client' },
		{ key: 'pending', label: `Pending${pendingPayments.length ? ` (${pendingPayments.length})` : ''}` },
		{ key: 'history', label: 'History' },
	];

	return (
		<div className="p-4 md:p-8">
			<PageHeader title="Payments" subtitle="Track all client payments and balances." />

			{/* Stat cards */}
			{stats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
					<PaymentStatCard
						label="Collected this month"
						value={`R${stats.collectedThisMonth.toLocaleString()}`}
						accent="before:bg-[#4A6741]"
					/>
					<PaymentStatCard
						label="Outstanding"
						value={`R${stats.outstanding.toLocaleString()}`}
						accent="before:bg-brand-500"
					/>
					<PaymentStatCard
						label="Overdue"
						value={String(stats.overdueCount)}
						accent={stats.overdueCount > 0 ? 'before:bg-red-500' : 'before:bg-warm-300'}
					/>
					<PaymentStatCard
						label="Needs plan"
						value={String(stats.needsPlanCount)}
						accent={stats.needsPlanCount > 0 ? 'before:bg-amber-500' : 'before:bg-warm-300'}
					/>
				</div>
			)}

			{/* Tab pills */}
			<div className="flex gap-2 mb-6">
				{tabs.map((t) => (
					<button
						key={t.key}
						onClick={() => setTab(t.key)}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
							tab === t.key ? 'bg-brand-500 text-white' : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
						}`}
					>
						{t.label}
					</button>
				))}
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
