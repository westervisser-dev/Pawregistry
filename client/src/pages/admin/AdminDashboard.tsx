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
	CountBadge,
	ActivityFeed,
	Avatar,
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

export function AdminDashboard() {
	const [counts, setCounts] = useState({ litters: 0, clients: 0, enquiries: 0 });
	const [recentEnquiries, setRecentEnquiries] = useState<Pick<Client, 'id' | 'firstName' | 'lastName' | 'email' | 'createdAt'>[]>([]);
	const [allClients, setAllClients] = useState<Client[]>([]);
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

			setRecentEnquiries(
				enquired
					.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
					.slice(0, 5),
			);

			setAllClients(clients);
			setLoading(false);
		});
	}, []);

	// Build activity feed from recent client events
	const recentActivity = allClients
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 4)
		.map((c) => ({
			text: `New enquiry from ${c.firstName} ${c.lastName}`,
			time: timeAgo(c.createdAt),
			color: 'brand' as const,
		}));

	const newCount = recentEnquiries.length;

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
						label: (n: number) => `${n} ${n === 1 ? 'client' : 'clients'} ready to review`,
						hash: 'documents',
						pill: 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800',
						dot: 'bg-blue-500',
						dropdown: 'border-blue-200',
						item: 'hover:bg-blue-50 text-blue-900',
					},
					{
						key: 'confirm_deposit',
						clients: allClients.filter((c) => c.depositStatus === 'pending'),
						label: (n: number) => `${n} ${n === 1 ? 'deposit' : 'deposits'} to confirm`,
						hash: 'deposit',
						pill: 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800',
						dot: 'bg-green-500',
						dropdown: 'border-green-200',
						item: 'hover:bg-green-50 text-green-900',
					},
					{
						key: 'confirm_payment',
						clients: allClients.filter((c) => c.stage === 'matched'),
						label: (n: number) => `${n} ${n === 1 ? 'client' : 'clients'} awaiting payment confirmation`,
						hash: 'stage',
						pill: 'bg-violet-100 hover:bg-violet-200 border-violet-300 text-violet-800',
						dot: 'bg-violet-500',
						dropdown: 'border-violet-200',
						item: 'hover:bg-violet-50 text-violet-900',
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
				{/* Recent Enquiries Table */}
				<Card>
					<CardHeader
						title="Recent Enquiries"
						badge={newCount > 0 ? <CountBadge count={newCount} /> : undefined}
						action={<ViewAllLink to="/admin/clients?stage=enquired" />}
					/>
					<div className="overflow-x-auto">
						<table className="w-full mt-3.5">
							<thead>
								<tr>
									<th className="text-[10.5px] uppercase tracking-[0.06em] text-warm-400 font-medium px-[22px] pb-2.5 text-left border-b border-black/[0.06]">Name</th>
									<th className="hidden md:table-cell text-[10.5px] uppercase tracking-[0.06em] text-warm-400 font-medium px-[22px] pb-2.5 text-left border-b border-black/[0.06]">Email</th>
									<th className="text-[10.5px] uppercase tracking-[0.06em] text-warm-400 font-medium px-[22px] pb-2.5 text-left border-b border-black/[0.06]">Applied</th>
									<th className="px-[22px] pb-2.5 border-b border-black/[0.06]" />
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={4} className="px-[22px] py-8 text-center text-warm-400 text-sm">
											Loading…
										</td>
									</tr>
								) : recentEnquiries.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-[22px] py-8 text-center text-warm-400 text-sm">
											No pending enquiries
										</td>
									</tr>
								) : (
									recentEnquiries.map((client) => (
										<tr key={client.id} className="border-b border-black/[0.05] last:border-0 hover:bg-warm-50 transition-colors">
											<td className="px-[22px] py-[13px]">
												<div className="flex items-center gap-2.5">
													<Avatar name={`${client.firstName} ${client.lastName}`} />
													<span className="text-[13px] text-warm-800 font-medium">
														{client.firstName} {client.lastName}
													</span>
												</div>
											</td>
											<td className="hidden md:table-cell px-[22px] py-[13px] text-[12.5px] text-warm-500">
												{client.email}
											</td>
											<td className="px-[22px] py-[13px] text-xs text-warm-400">
												{new Date(client.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
											</td>
											<td className="px-[22px] py-[13px]">
												<Link
													to={`/admin/clients/${client.id}`}
													className="text-xs text-brand-500 font-medium hover:underline whitespace-nowrap"
												>
													Review →
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
					{/* Quick Actions */}
					<Card className="p-5">
						<h3 className="font-serif text-[15px] text-warm-900 mb-3.5">Quick Actions</h3>
						<div className="flex flex-col gap-2">
							<ActionButton icon="+" label="Create Litter" to="/admin/litters/new" variant="primary" />
							<ActionButton icon="📋" label="Waiting List" to="/admin/clients" />
							<ActionButton icon="📢" label="Post Update" to="/admin/updates" />
						</div>
					</Card>

					{/* Recent Activity */}
					<Card className="p-5">
						<h3 className="font-serif text-[15px] text-warm-900 mb-3.5">Recent Activity</h3>
						{recentActivity.length > 0 ? (
							<ActivityFeed items={recentActivity} />
						) : (
							<p className="text-xs text-warm-400">No recent activity</p>
						)}
					</Card>
				</div>
			</div>
		</div>
	);
}
