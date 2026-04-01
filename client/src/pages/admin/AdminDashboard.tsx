import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
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
import type { Dog, Litter, Client } from '@paw-registry/shared';

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

interface AttentionCounts {
	enquiries: number;
	docsToReview: number;
	pendingDeposits: number;
	awaitingPayment: number;
}

export function AdminDashboard() {
	const [counts, setCounts] = useState({ dogs: 0, litters: 0, clients: 0, enquiries: 0 });
	const [attention, setAttention] = useState<AttentionCounts>({ enquiries: 0, docsToReview: 0, pendingDeposits: 0, awaitingPayment: 0 });
	const [recentEnquiries, setRecentEnquiries] = useState<Pick<Client, 'id' | 'firstName' | 'lastName' | 'email' | 'createdAt'>[]>([]);
	const [allClients, setAllClients] = useState<Client[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		document.title = 'Dashboard — Paw Registry';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		Promise.all([
			api.dogs.get({ query: {} }),
			api.litters.admin.all.get(),
			api.clients.admin.get({ query: {} }),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.clients.admin as any).attention.get(),
		]).then(([dogsRes, littersRes, clientsRes, attentionRes]) => {
			const dogs = (dogsRes.data as Dog[] | null) ?? [];
			const litters = (littersRes.data as Litter[] | null) ?? [];
			const clients = (clientsRes.data as Client[] | null) ?? [];
			const attentionData = (attentionRes as { data: { docsCompleteIds: string[] } | null }).data;

			const enquired = clients.filter((c) => c.stage === 'enquired');

			setCounts({
				dogs: dogs.length,
				litters: litters.length,
				clients: clients.length,
				enquiries: enquired.length,
			});

			setAttention({
				enquiries: enquired.length,
				docsToReview: attentionData?.docsCompleteIds.length ?? 0,
				pendingDeposits: clients.filter((c) => c.depositStatus === 'pending').length,
				awaitingPayment: clients.filter((c) => c.stage === 'matched').length,
			});

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
		<div className="p-8 max-w-[1200px]">
			<PageHeader
				title="Dashboard"
				subtitle={`${getGreeting()} — here's your breeding programme overview.`}
			/>

			{/* ── Stats Grid ──────────────────────────────────────── */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
				<StatCard
					icon="🐕"
					value={counts.dogs}
					label="Active Dogs"
					accent="brand"
					to="/admin/dogs"
				/>
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
			{(attention.enquiries > 0 || attention.docsToReview > 0 || attention.pendingDeposits > 0 || attention.awaitingPayment > 0) && (
				<div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
					<p className="text-xs font-semibold text-amber-700 uppercase tracking-[0.06em] mb-3">
						⚡ Needs your attention
					</p>
					<div className="flex flex-wrap gap-2">
						{attention.enquiries > 0 && (
							<Link
								to="/admin/clients?stage=enquired"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 text-xs font-medium transition-colors"
							>
								<span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
								{attention.enquiries} new {attention.enquiries === 1 ? 'application' : 'applications'} to review
							</Link>
						)}
						{attention.docsToReview > 0 && (
							<Link
								to="/admin/clients?stage=approved"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-800 text-xs font-medium transition-colors"
							>
								<span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
								{attention.docsToReview} {attention.docsToReview === 1 ? 'client has' : 'clients have'} uploaded all documents
							</Link>
						)}
						{attention.pendingDeposits > 0 && (
							<Link
								to="/admin/clients?stage=waitlisted"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 hover:bg-green-200 border border-green-300 text-green-800 text-xs font-medium transition-colors"
							>
								<span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
								{attention.pendingDeposits} {attention.pendingDeposits === 1 ? 'deposit' : 'deposits'} to confirm
							</Link>
						)}
						{attention.awaitingPayment > 0 && (
							<Link
								to="/admin/clients?stage=matched"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 hover:bg-violet-200 border border-violet-300 text-violet-800 text-xs font-medium transition-colors"
							>
								<span className="w-1.5 h-1.5 rounded-full bg-violet-500" aria-hidden="true" />
								{attention.awaitingPayment} {attention.awaitingPayment === 1 ? 'client' : 'clients'} awaiting payment confirmation
							</Link>
						)}
					</div>
				</div>
			)}

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
									<th className="text-[10.5px] uppercase tracking-[0.06em] text-warm-400 font-medium px-[22px] pb-2.5 text-left border-b border-black/[0.06]">Email</th>
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
											<td className="px-[22px] py-[13px] text-[12.5px] text-warm-500">
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
							<ActionButton icon="+" label="Add Dog" to="/admin/dogs/new" variant="primary" />
							<ActionButton icon="+" label="Create Litter" to="/admin/litters/new" />
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
