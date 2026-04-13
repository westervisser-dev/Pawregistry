import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
	Card,
	CardHeader,
	PageHeader,
	StatCard,
	ActionButton,
	ViewAllLink,
} from '@/components/ui';
import type { Litter, Client } from '@paw-registry/shared';

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

type ActivityColor = 'brand' | 'green' | 'blue' | 'brown';

const dotColorMap: Record<ActivityColor, string> = {
	brand: 'bg-brand-500',
	green: 'bg-[#4A6741]',
	blue: 'bg-[#1E5B8A]',
	brown: 'bg-[#8B5E3C]',
};

export function AdminDashboard() {
	const [counts, setCounts] = useState({ litters: 0, clients: 0, enquiries: 0 });
	const [allClients, setAllClients] = useState<Client[]>([]);
	const [allLitters, setAllLitters] = useState<Litter[]>([]);
	const [docsCompleteIds, setDocsCompleteIds] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);
	const [openDropdown, setOpenDropdown] = useState<string | null>(null);
	const attentionRef = useRef<HTMLDivElement>(null);

	usePageTitle('Dashboard');

	// Close dropdown on outside click
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
		]).then(([littersRes, clientsRes, attentionRes]) => {
			const litters = (littersRes.data as Litter[] | null) ?? [];
			const clients = (clientsRes.data as Client[] | null) ?? [];
			const attentionData = (attentionRes as { data: { docsCompleteIds: string[] } | null }).data;

			const enquired = clients.filter((c) => c.stage === 'enquired');

			setCounts({
				litters: litters.length,
				clients: clients.length,
				enquiries: enquired.length,
			});

			setDocsCompleteIds(new Set(attentionData?.docsCompleteIds ?? []));
			setAllClients(clients);
			setAllLitters(litters);
			setLoading(false);
		});
	}, []);

	// Build unified activity feed from multiple event sources
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
			if (c.depositStatus === 'paid') {
				events.push({ text: `${name} waitlisted — deposit paid`, ts: new Date(c.updatedAt).getTime(), color: 'brown', link });
			} else {
				events.push({ text: `${name} added to waitlist`, ts: new Date(c.updatedAt).getTime(), color: 'green', link });
			}
		} else if (c.stage === 'match_requested') {
			events.push({ text: `${name} requested a match`, ts: new Date(c.updatedAt).getTime(), color: 'blue', link });
		} else if (c.stage === 'matched') {
			events.push({ text: `${name} matched to litter`, ts: new Date(c.updatedAt).getTime(), color: 'blue', link });
		} else if (c.stage === 'matched_paid') {
			events.push({ text: `${name} — placement complete`, ts: new Date(c.updatedAt).getTime(), color: 'green', link });
		}
	}

	for (const l of allLitters) {
		events.push({ text: `New litter: ${l.name}`, ts: new Date(l.createdAt).getTime(), color: 'brown', link: `/admin/litters/${l.id}` });
	}

	const recentActivity = events
		.sort((a, b) => b.ts - a.ts)
		.slice(0, 10)
		.map(({ text, ts, color, link }) => ({
			text,
			time: timeAgo(new Date(ts).toISOString()),
			color,
			link,
		}));

	return (
		<div className="p-5 md:p-8 max-w-[1600px]">
			<PageHeader
				title="Dashboard"
				subtitle={`${getGreeting()} — here's your breeding programme overview.`}
			/>

			{/* ── Stats Grid ──────────────────────────────────────── */}
			<div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 mb-7">
				<StatCard
					icon="🐶"
					value={counts.litters}
					label="Litters"
					accent="brown"
					to="/admin/litters"
				/>
				<StatCard
					icon="👥"
					value={counts.clients}
					label="Total Clients"
					accent="green"
					to="/admin/clients"
				/>
				<StatCard
					icon="📬"
					value={counts.enquiries}
					label="New Enquiries"
					accent="blue"
					trend={counts.enquiries > 0 ? { text: 'needs review', variant: 'alert' } : undefined}
					to="/admin/clients?stage=enquired"
				/>
			</div>

			{/* ── Needs Attention ─────────────────────────────────── */}
			{(() => {
				const groups = [
					{
						key: 'review_application',
						clients: allClients.filter((c) => c.stage === 'enquired'),
						label: (n: number) => `${n} new ${n === 1 ? 'application' : 'applications'} to review`,
						hash: 'stage',
						pill: 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800',
						dot: 'bg-amber-500',
						dropdown: 'border-amber-200',
						item: 'hover:bg-amber-50 text-amber-900',
					},
					{
						key: 'review_documents',
						clients: allClients.filter((c) => docsCompleteIds.has(c.id)),
						label: (n: number) => `${n} ${n === 1 ? 'client' : 'clients'} document review required`,
						hash: 'documents',
						pill: 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800',
						dot: 'bg-blue-500',
						dropdown: 'border-blue-200',
						item: 'hover:bg-blue-50 text-blue-900',
					},
					{
						key: 'confirm_match',
						clients: allClients.filter((c) => c.stage === 'match_requested'),
						label: (n: number) => `${n} ${n === 1 ? 'client has' : 'clients have'} requested a match`,
						hash: 'stage',
						pill: 'bg-pink-100 hover:bg-pink-200 border-pink-300 text-pink-800',
						dot: 'bg-pink-500',
						dropdown: 'border-pink-200',
						item: 'hover:bg-pink-50 text-pink-900',
					},
				].filter((g) => g.clients.length > 0);

				if (groups.length === 0) return null;

				return (
					<div ref={attentionRef} className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
						<p className="text-xs font-semibold text-amber-700 uppercase tracking-[0.06em] mb-3">
							⚡ Needs your attention
						</p>
						<div className="flex flex-wrap gap-2">
							{groups.map((g) => {
								const isOpen = openDropdown === g.key;
								const isSingle = g.clients.length === 1;
								const pillClass = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${g.pill}`;

								if (isSingle) {
									return (
										<Link
											key={g.key}
											to={`/admin/clients/${g.clients[0].id}#${g.hash}`}
											className={pillClass}
										>
											<span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} aria-hidden="true" />
											{g.label(1)}
										</Link>
									);
								}

								return (
									<div key={g.key} className="relative">
										<button
											onClick={() => setOpenDropdown(isOpen ? null : g.key)}
											className={`${pillClass} cursor-pointer`}
											aria-expanded={isOpen}
										>
											<span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} aria-hidden="true" />
											{g.label(g.clients.length)}
											<span className="ml-0.5 opacity-60" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
										</button>
										{isOpen && (
											<div className={`absolute top-full right-0 mt-1.5 z-50 min-w-48 max-h-60 overflow-y-auto bg-white rounded-xl border shadow-lg ${g.dropdown}`}>
												{g.clients.map((c) => (
													<Link
														key={c.id}
														to={`/admin/clients/${c.id}#${g.hash}`}
														onClick={() => setOpenDropdown(null)}
														className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium first:rounded-t-xl last:rounded-b-xl transition-colors ${g.item}`}
													>
														<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.dot}`} aria-hidden="true" />
														{c.firstName} {c.lastName}
													</Link>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				);
			})()}

			{/* ── Lower Grid: Table + Actions Panel ───────────────── */}
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
				{/* Recent Activity Table */}
				<Card>
					<CardHeader
						title="Recent Activity"
						action={<ViewAllLink to="/admin/clients" />}
					/>
					<div className="overflow-x-auto">
						<table className="w-full mt-3.5">
							<thead>
								<tr>
									<th className="text-[10.5px] uppercase tracking-[0.06em] text-warm-400 font-medium px-[22px] pb-2.5 text-left border-b border-black/[0.06]">Activity</th>
									<th className="text-[10.5px] uppercase tracking-[0.06em] text-warm-400 font-medium px-[22px] pb-2.5 text-left border-b border-black/[0.06]">When</th>
									<th className="px-[22px] pb-2.5 border-b border-black/[0.06]" />
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={3} className="px-[22px] py-8 text-center text-warm-400 text-sm">
											Loading…
										</td>
									</tr>
								) : recentActivity.length === 0 ? (
									<tr>
										<td colSpan={3} className="px-[22px] py-8 text-center text-warm-400 text-sm">
											No recent activity
										</td>
									</tr>
								) : (
									recentActivity.map((item, i) => (
										<tr key={i} className="border-b border-black/[0.05] last:border-0 hover:bg-warm-50 transition-colors">
											<td className="px-[22px] py-[13px]">
												<div className="flex items-center gap-2.5">
													<div className={`w-2 h-2 rounded-full shrink-0 ${dotColorMap[item.color]}`} aria-hidden="true" />
													<span className="text-[13px] text-warm-800 font-medium">{item.text}</span>
												</div>
											</td>
											<td className="px-[22px] py-[13px] text-xs text-warm-400 whitespace-nowrap">
												{item.time}
											</td>
											<td className="px-[22px] py-[13px]">
												<Link
													to={item.link}
													className="text-xs text-brand-500 font-medium hover:underline whitespace-nowrap"
												>
													View →
												</Link>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</Card>

				{/* Actions Panel */}
				<div className="flex flex-col gap-3.5">
					<Card className="p-5">
						<h3 className="font-serif text-[15px] text-warm-900 mb-3.5">Quick Actions</h3>
						<div className="flex flex-col gap-2">
							<ActionButton icon="+" label="Create Litter" to="/admin/litters/new" variant="primary" />
							<ActionButton icon="📋" label="Waiting List" to="/admin/clients" />
							<ActionButton icon="📢" label="Post Update" to="/admin/updates" />
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
