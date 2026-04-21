import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
	Card,
	CardHeader,
	PageHeader,
	StatCard,
	STAGE_STYLES,
	ViewAllLink,
} from '@/components/ui';
import type { Litter, Client, Payment } from '@paw-registry/shared';

function getGreeting(): string {
	const h = new Date().getHours();
	if (h < 12) return 'Good morning';
	if (h < 17) return 'Good afternoon';
	return 'Good evening';
}

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60_000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function formatRands(n: number): string {
	return `R${Math.round(n).toLocaleString()}`;
}

function shortDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

type ActivityColor = 'brand' | 'green' | 'blue' | 'brown';

const activityDotColor: Record<ActivityColor, string> = {
	brand: '#c47420',
	green: '#4a6741',
	blue: '#1e5b8a',
	brown: '#8B5E3C',
};

type PendingReservation = { id: string; name: string; pendingCount: number };
type AwaitingPaymentItem = { clientId: string; clientName: string; litterId: string; litterName: string; bookingExpiresAt: string | null };
type PaymentStats = { collectedThisMonth: number; outstanding: number; overdueCount: number; needsPlanCount: number };

const PIPELINE_ORDER = ['enquired', 'approved', 'waitlisted', 'puppy_reserved', 'puppy_booked', 'puppy_fully_paid'];

export function AdminDashboard() {
	const [allClients, setAllClients] = useState<Client[]>([]);
	const [allLitters, setAllLitters] = useState<Litter[]>([]);
	const [allPayments, setAllPayments] = useState<Payment[]>([]);
	const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
	const [docsCompleteIds, setDocsCompleteIds] = useState<Set<string>>(new Set());
	const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);
	const [awaitingPayment, setAwaitingPayment] = useState<AwaitingPaymentItem[]>([]);
	const [needsPaymentPlan, setNeedsPaymentPlan] = useState<{ clientId: string; clientName: string }[]>([]);
	const [loading, setLoading] = useState(true);
	const [openDropdown, setOpenDropdown] = useState<string | null>(null);
	const attentionRef = useRef<HTMLDivElement>(null);

	usePageTitle('Dashboard');

	useEffect(() => {
		if (!openDropdown) return;
		const handler = (e: MouseEvent) => {
			if (attentionRef.current && !attentionRef.current.contains(e.target as Node)) {
				setOpenDropdown(null);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [openDropdown]);

	useEffect(() => {
		Promise.all([
			api.litters.admin.all.get(),
			api.clients.admin.get({ query: {} }),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.clients.admin as any).attention.get(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.litters.admin as any)['pending-reservations'].get(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.litters.admin as any)['awaiting-payment'].get(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.payments as any)['needs-payment-plan'].get(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.payments as any).admin.stats.get(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.payments as any).admin.all.get({ query: { status: 'complete' } }),
		]).then(([littersRes, clientsRes, attentionRes, pendingRes, awaitingRes, paymentPlanRes, statsRes, paymentsRes]) => {
			const litters = (littersRes.data as Litter[] | null) ?? [];
			const clients = (clientsRes.data as Client[] | null) ?? [];
			const attentionData = (attentionRes as { data: { docsCompleteIds: string[] } | null }).data;
			const pendingData = (pendingRes as { data: PendingReservation[] | null }).data ?? [];
			const awaitingData = (awaitingRes as { data: AwaitingPaymentItem[] | null }).data ?? [];
			const paymentPlanData = (paymentPlanRes as { data: { clientId: string; clientName: string }[] | null }).data ?? [];
			const stats = (statsRes as { data: PaymentStats | null }).data;
			const pmts = ((paymentsRes as { data: Payment[] | null }).data ?? []);

			setAllClients(clients);
			setAllLitters(litters);
			setAllPayments(pmts);
			setPaymentStats(stats);
			setDocsCompleteIds(new Set(attentionData?.docsCompleteIds ?? []));
			setPendingReservations(pendingData);
			setAwaitingPayment(awaitingData);
			setNeedsPaymentPlan(paymentPlanData);
			setLoading(false);
		});
	}, []);

	// ── Counts ──
	const activeLitters = allLitters.filter((l) => l.status !== 'completed').length;
	const enquiries = allClients.filter((c) => c.stage === 'enquired').length;
	const waitlisted = allClients.filter((c) => c.stage === 'waitlisted').length;

	// ── Stage pipeline ──
	const pipelineCounts = useMemo(() => {
		const map: Record<string, number> = {};
		for (const s of PIPELINE_ORDER) map[s] = 0;
		for (const c of allClients) {
			if (c.stage in map) map[c.stage] += 1;
		}
		return map;
	}, [allClients]);

	// ── Revenue last 8 months ──
	const revenueSeries = useMemo(() => {
		const now = new Date();
		const months: { label: string; ts: Date; total: number }[] = [];
		for (let i = 7; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			months.push({
				label: d.toLocaleDateString('en-ZA', { month: 'short' }),
				ts: d,
				total: 0,
			});
		}
		for (const p of allPayments) {
			if (!p.paidAt) continue;
			const paidAt = new Date(p.paidAt);
			const idx = months.findIndex((m, i) => {
				const next = months[i + 1]?.ts ?? new Date(m.ts.getFullYear(), m.ts.getMonth() + 1, 1);
				return paidAt >= m.ts && paidAt < next;
			});
			if (idx >= 0) months[idx].total += p.amountRands ?? 0;
		}
		return months;
	}, [allPayments]);

	const revenueTotal = revenueSeries.reduce((s, m) => s + m.total, 0);

	// ── Upcoming go-home ──
	const upcomingGoHome = allLitters
		.filter((l) => l.goHomeDate && new Date(l.goHomeDate).getTime() > Date.now())
		.sort((a, b) => new Date(a.goHomeDate!).getTime() - new Date(b.goHomeDate!).getTime())
		.slice(0, 3);

	// ── Next selection day ──
	const nextSelection = allLitters
		.filter((l) => l.selectionDate && new Date(l.selectionDate).getTime() > Date.now())
		.sort((a, b) => new Date(a.selectionDate).getTime() - new Date(b.selectionDate).getTime())[0];

	// ── Activity ──
	type ActivityEvent = { text: string; ts: number; color: ActivityColor; link: string };
	const events: ActivityEvent[] = [];

	for (const c of allClients) {
		const name = `${c.firstName} ${c.lastName}`;
		const link = `/admin/clients/${c.id}`;
		if (c.stage === 'enquired') {
			events.push({ text: `New enquiry from ${name}`, ts: new Date(c.createdAt).getTime(), color: 'brand', link });
		} else if (c.stage === 'approved') {
			events.push({ text: `${name} approved`, ts: new Date(c.updatedAt).getTime(), color: 'green', link });
		} else if (c.stage === 'waitlisted') {
			events.push({
				text: c.depositStatus === 'paid' ? `${name} waitlisted — deposit paid` : `${name} added to waitlist`,
				ts: new Date(c.updatedAt).getTime(),
				color: c.depositStatus === 'paid' ? 'brown' : 'green',
				link,
			});
		} else if (c.stage === 'puppy_reserved') {
			events.push({ text: `${name} reserved a puppy`, ts: new Date(c.updatedAt).getTime(), color: 'blue', link });
		} else if (c.stage === 'puppy_booked') {
			events.push({ text: `${name} booked a puppy`, ts: new Date(c.updatedAt).getTime(), color: 'blue', link });
		} else if (c.stage === 'puppy_fully_paid') {
			events.push({ text: `${name} — booked & paid`, ts: new Date(c.updatedAt).getTime(), color: 'green', link });
		}
	}

	for (const l of allLitters) {
		events.push({ text: `New litter: ${l.name}`, ts: new Date(l.createdAt).getTime(), color: 'brown', link: `/admin/litters/${l.id}` });
	}

	const recentActivity = events
		.sort((a, b) => b.ts - a.ts)
		.slice(0, 8)
		.map(({ text, ts, color, link }) => ({
			text,
			time: timeAgo(new Date(ts).toISOString()),
			color,
			link,
		}));

	// ── Attention groups ──
	type AttentionItem = { id: string; name: string; link: string };
	type AttentionGroup = {
		key: string;
		items: AttentionItem[];
		label: (n: number) => string;
		tone: string;
	};

	const hoursLeft = (exp: string | null | undefined) =>
		exp ? Math.max(0, Math.ceil((new Date(exp).getTime() - Date.now()) / 3_600_000)) : null;

	const reservationItems = allClients
		.filter((c) => c.stage === 'puppy_reserved')
		.map((c) => {
			const payment = awaitingPayment.find((a) => a.clientId === c.id);
			const h = hoursLeft(payment?.bookingExpiresAt);
			const name = `${c.firstName} ${c.lastName}`;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const puppy = c.puppyId ? allLitters.flatMap((l) => (l as any).puppies ?? []).find((p: any) => p.id === c.puppyId) : null;
			const collar = puppy?.collarColour
				? `${puppy.collarColour[0].toUpperCase()}${puppy.collarColour.slice(1)} collar`
				: null;
			const detail = collar ?? payment?.litterName ?? null;
			const timeSuffix = h !== null ? ` — ${h}h left` : '';
			return {
				id: c.id,
				name: `${name}${detail ? ' · ' + detail : ''}${timeSuffix}`,
				link: `/admin/clients/${c.id}#stage`,
				hoursLeft: h,
				detail,
				clientName: name,
				litterId: payment?.litterId ?? null,
			};
		});

	// Drop the litter-level roll-up when it's fully covered by the merged reservation chip.
	const reservationsByLitter = new Map<string, number>();
	for (const r of reservationItems) {
		if (r.litterId) reservationsByLitter.set(r.litterId, (reservationsByLitter.get(r.litterId) ?? 0) + 1);
	}
	const uncoveredPendingReservations = pendingReservations.filter(
		(l) => (reservationsByLitter.get(l.id) ?? 0) < l.pendingCount
	);

	const attentionGroups: AttentionGroup[] = [
		{
			key: 'review_application',
			items: allClients.filter((c) => c.stage === 'enquired').map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, link: `/admin/clients/${c.id}#stage` })),
			label: (n) => `${n} new ${n === 1 ? 'application' : 'applications'} to review`,
			tone: '#c47420',
		},
		{
			key: 'review_documents',
			items: allClients.filter((c) => docsCompleteIds.has(c.id)).map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, link: `/admin/clients/${c.id}#documents` })),
			label: (n) => `${n} ${n === 1 ? 'client' : 'clients'} with documents to approve`,
			tone: '#1e5b8a',
		},
		{
			key: 'reservations_in_window',
			items: reservationItems.map(({ id, name, link }) => ({ id, name, link })),
			label: (n) => {
				if (n === 1) {
					const item = reservationItems[0];
					const h = item?.hoursLeft;
					const parenthetical = item?.clientName
						? ` (${item.clientName}${item.detail ? ' · ' + item.detail : ''})`
						: '';
					return `1 reservation awaiting payment${h !== null ? ` — ${h}h left` : ''}${parenthetical}`;
				}
				return `${n} reservations awaiting payment`;
			},
			tone: '#8d2a4a',
		},
		{
			key: 'needs_payment_plan',
			items: needsPaymentPlan.map((c) => ({ id: c.clientId, name: c.clientName, link: `/admin/clients/${c.clientId}#payments` })),
			label: (n) => `${n} ${n === 1 ? 'client needs' : 'clients need'} a payment plan`,
			tone: '#7a47a8',
		},
		{
			key: 'pending_reservations',
			items: uncoveredPendingReservations.map((l) => ({ id: l.id, name: `${l.name} (${l.pendingCount} pending)`, link: `/admin/litters/${l.id}` })),
			label: (n) => `${n} ${n === 1 ? 'litter has' : 'litters have'} pending reservations`,
			tone: '#4a6741',
		},
	].filter((g) => g.items.length > 0);

	const attentionTotal = attentionGroups.reduce((s, g) => s + g.items.length, 0);

	return (
		<div className="p-5 md:p-8 max-w-[1600px]">
			<PageHeader
				title={`${getGreeting()}.`}
				subtitle="Your breeding programme at a glance."
			/>

			{/* ── Needs attention band ──────────────────────────────────────── */}
			{attentionGroups.length > 0 && (
				<div
					ref={attentionRef}
					className="mb-7 rounded-[14px] px-5 py-4"
					style={{ background: 'linear-gradient(180deg, #fdf6ee 0%, #f8e8d0 100%)', border: '1px solid #f0cfa0' }}
				>
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<span className="w-1.5 h-4 rounded-full" style={{ background: '#c47420' }} aria-hidden="true" />
							<p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#824614' }}>
								<Zap size={11} className="inline mr-1" aria-hidden="true" />
								Needs your attention
							</p>
						</div>
						<span className="text-[11.5px]" style={{ color: '#a35c17' }}>
							{attentionTotal} item{attentionTotal === 1 ? '' : 's'}
						</span>
					</div>
					<div className="flex flex-wrap gap-2">
						{attentionGroups.map((g) => {
							const isOpen = openDropdown === g.key;
							const isSingle = g.items.length === 1;
							const pillStyle = { borderColor: `${g.tone}55`, color: g.tone } as const;

							if (isSingle) {
								return (
									<Link
										key={g.key}
										to={g.items[0].link}
										className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-white/80 hover:bg-white transition-colors text-[12.5px]"
										style={pillStyle}
									>
										<span className="w-1.5 h-1.5 rounded-full" style={{ background: g.tone }} aria-hidden="true" />
										<span className="font-semibold">1</span>
										<span className="font-medium">{g.label(1).replace(/^1\s/, '')}</span>
									</Link>
								);
							}

							return (
								<div key={g.key} className="relative">
									<button
										onClick={() => setOpenDropdown(isOpen ? null : g.key)}
										className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-white/80 hover:bg-white transition-colors text-[12.5px] cursor-pointer"
										style={pillStyle}
										aria-expanded={isOpen}
									>
										<span className="w-1.5 h-1.5 rounded-full" style={{ background: g.tone }} aria-hidden="true" />
										<span className="font-semibold">{g.items.length}</span>
										<span className="font-medium">{g.label(g.items.length).replace(new RegExp(`^${g.items.length}\\s`), '')}</span>
										{isOpen
											? <ChevronUp size={12} aria-hidden="true" />
											: <ChevronDown size={12} aria-hidden="true" />}
									</button>
									{isOpen && (
										<div className="absolute top-full right-0 mt-1.5 z-50 min-w-52 max-h-60 overflow-y-auto bg-white rounded-xl border border-black/[0.08] shadow-lg">
											{g.items.map((it) => (
												<Link
													key={it.id}
													to={it.link}
													onClick={() => setOpenDropdown(null)}
													className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium first:rounded-t-xl last:rounded-b-xl hover:bg-warm-50 text-warm-800 transition-colors"
												>
													<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.tone }} aria-hidden="true" />
													{it.name}
												</Link>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* ── Stats Grid ────────────────────────────────────────────────── */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
				<StatCard
					label="Active litters"
					value={activeLitters}
					accent="brand"
					sub={`${allLitters.length} total`}
					to="/admin/litters"
				/>
				<StatCard
					label="Clients"
					value={allClients.length}
					accent="green"
					sub={`${waitlisted} on waitlist`}
					to="/admin/clients"
				/>
				<StatCard
					label="New enquiries"
					value={enquiries}
					accent="blue"
					sub="Awaiting review"
					to="/admin/clients"
				/>
				<StatCard
					label={`${new Date().toLocaleDateString('en-ZA', { month: 'long' })} revenue`}
					value={paymentStats ? formatRands(paymentStats.collectedThisMonth) : '—'}
					accent="plum"
					sub="Month-to-date"
					to="/admin/payments"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
				{/* ── Left column ────────────────────────────────────────── */}
				<div className="lg:col-span-2 space-y-5">
					<Card>
						<CardHeader
							title="Client pipeline"
							action={<ViewAllLink to="/admin/clients" />}
						/>
						<div className="px-[22px] pb-5 pt-3">
							<Pipeline counts={pipelineCounts} />
						</div>
					</Card>

					<Card>
						<CardHeader title="Recent activity" action={<ViewAllLink to="/admin/clients" />} />
						<div>
							{loading ? (
								<p className="px-[22px] py-8 text-center text-warm-400 text-sm">Loading…</p>
							) : recentActivity.length === 0 ? (
								<p className="px-[22px] py-8 text-center text-warm-400 text-sm">No recent activity</p>
							) : (
								recentActivity.map((a, i) => (
									<Link
										key={i}
										to={a.link}
										className="w-full flex items-center gap-3 px-[22px] py-3 border-t border-black/[0.05] hover:bg-warm-50 transition-colors text-left"
									>
										<span className="w-2 h-2 rounded-full shrink-0" style={{ background: activityDotColor[a.color] }} aria-hidden="true" />
										<span className="text-[13px] text-warm-800 flex-1">{a.text}</span>
										<span className="text-[11.5px] text-warm-400 tabular-nums">{a.time}</span>
									</Link>
								))
							)}
						</div>
					</Card>
				</div>

				{/* ── Right column ───────────────────────────────────────── */}
				<div className="space-y-5">
					<Card>
						<CardHeader title="Upcoming go-home" />
						<div className="px-[22px] pb-5">
							{upcomingGoHome.length === 0 ? (
								<p className="py-4 text-sm text-warm-400">None scheduled</p>
							) : (
								upcomingGoHome.map((l) => (
									<Link
										key={l.id}
										to={`/admin/litters/${l.id}`}
										className="flex gap-3 py-3 border-b border-black/[0.05] last:border-0 hover:opacity-80 transition-opacity"
									>
										{l.coverImageUrl ? (
											<img src={l.coverImageUrl} alt="" className="w-[56px] h-[56px] rounded-[10px] object-cover shrink-0" />
										) : (
											<div className="w-[56px] h-[56px] rounded-[10px] bg-warm-100 shrink-0" aria-hidden="true" />
										)}
										<div className="min-w-0 flex-1">
											<div className="text-[13px] font-medium text-warm-900 truncate">{l.name}</div>
											<div className="text-[11.5px] text-warm-500 mt-0.5">
												goes home {shortDate(l.goHomeDate!)}
											</div>
										</div>
									</Link>
								))
							)}
						</div>
					</Card>

					<Card>
						<CardHeader title="Revenue — last 8 months" />
						<div className="px-[22px] pb-5">
							<RevenueChart series={revenueSeries} />
							<div className="flex items-baseline justify-between mt-4">
								<div>
									<div className="font-serif text-[22px] text-warm-900">{formatRands(revenueTotal)}</div>
									<div className="text-[11.5px] text-warm-500">
										collected {revenueSeries[0]?.ts.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })} – {revenueSeries[7]?.ts.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })}
									</div>
								</div>
							</div>
						</div>
					</Card>

					{nextSelection && (
						<Card>
							<div className="px-[22px] py-5">
								<div className="text-[11px] uppercase tracking-[0.12em] text-warm-500 mb-2">Next selection day</div>
								<div className="font-serif text-[22px] text-warm-900 leading-tight">
									{shortDate(nextSelection.selectionDate)}
								</div>
								<div className="text-[13px] text-warm-600 mt-1">{nextSelection.name}</div>
								<Link
									to={`/admin/litters/${nextSelection.id}`}
									className="inline-flex items-center mt-3.5 px-3 py-1.5 text-[12.5px] font-medium rounded-[9px] bg-warm-50 hover:bg-warm-200 text-warm-700 border border-warm-200 transition-colors"
								>
									Open litter
								</Link>
							</div>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Pipeline bar chart ─────────────────────────────────────────────────────

function Pipeline({ counts }: { counts: Record<string, number> }) {
	const max = Math.max(1, ...Object.values(counts));
	return (
		<div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
			{PIPELINE_ORDER.map((s) => {
				const style = STAGE_STYLES[s];
				const count = counts[s] ?? 0;
				const pct = (count / max) * 100;
				return (
					<div key={s}>
						<div className="flex items-center gap-1.5 mb-2">
							<span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} aria-hidden="true" />
							<span className="text-[10.5px] uppercase tracking-[0.08em] text-warm-500 font-medium truncate">{style.label}</span>
						</div>
						<div className="font-serif text-[26px] leading-none text-warm-900">{count}</div>
						<div className="mt-2.5 h-1.5 rounded-full bg-warm-100 overflow-hidden">
							<div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.dot }} />
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ─── Revenue sparkline ──────────────────────────────────────────────────────

function RevenueChart({ series }: { series: { label: string; total: number }[] }) {
	const values = series.map((m) => m.total);
	const max = Math.max(1, ...values);
	const W = 300;
	const H = 80;
	const step = W / Math.max(1, values.length - 1);
	const pts = values.map((v, i) => [i * step, H - (v / max) * (H - 10) - 5] as const);
	const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
	const area = `${path} L ${W} ${H} L 0 ${H} Z`;
	return (
		<svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" preserveAspectRatio="none" style={{ height: 100 }}>
			<defs>
				<linearGradient id="rgrad" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stopColor="#c47420" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#c47420" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={area} fill="url(#rgrad)" />
			<path d={path} stroke="#c47420" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
			{pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#c47420" />)}
			{series.map((m, i) => (
				<text
					key={m.label + i}
					x={i * step}
					y={H + 14}
					fontSize="9"
					fill="#9a8871"
					textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}
					fontFamily="ui-monospace,monospace"
				>
					{m.label}
				</text>
			))}
		</svg>
	);
}
