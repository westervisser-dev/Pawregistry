import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import {
	Avatar,
	Card,
	DepositPill,
	LoadingPage,
	PageHeader,
	Segmented,
	StageBadge,
} from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Client, ClientStage } from '@paw-registry/shared';

type Filter = 'all' | 'approved' | 'waitlisted' | 'rejected';

// Stage order: new work at top → finished → rejected last
const STAGE_RANK: Record<ClientStage, number> = {
	enquired: 0,
	approved: 1,
	waitlisted: 2,
	puppy_reserved: 3,
	puppy_booked: 4,
	puppy_fully_paid: 5,
	rejected: 6,
};

const WAITLIST_STAGES: ClientStage[] = ['waitlisted', 'puppy_reserved', 'puppy_booked'];

export function AdminClients() {
	const [clients, setClients] = useState<Client[]>([]);
	const [filter, setFilter] = useState<Filter>('all');
	const [loading, setLoading] = useState(true);

	usePageTitle('Clients');

	useEffect(() => {
		api.clients.admin.get({ query: {} }).then(({ data }) => {
			if (data) setClients(data as Client[]);
			setLoading(false);
		});
	}, []);

	const counts = useMemo(() => ({
		all: clients.length,
		approved: clients.filter((c) => c.stage === 'approved').length,
		waitlisted: clients.filter((c) => c.stage === 'waitlisted').length,
		rejected: clients.filter((c) => c.stage === 'rejected').length,
	}), [clients]);

	const sorted = useMemo(() => {
		const filtered = filter === 'all'
			? clients
			: clients.filter((c) => c.stage === filter);
		return [...filtered].sort((a, b) => {
			const rankDiff = (STAGE_RANK[a.stage] ?? 99) - (STAGE_RANK[b.stage] ?? 99);
			if (rankDiff !== 0) return rankDiff;
			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		});
	}, [clients, filter]);

	const options: { value: Filter; label: string; count: number }[] = [
		{ value: 'all', label: 'All', count: counts.all },
		{ value: 'approved', label: 'Approved', count: counts.approved },
		{ value: 'waitlisted', label: 'Waitlisted', count: counts.waitlisted },
		{ value: 'rejected', label: 'Rejected', count: counts.rejected },
	];

	return (
		<div className="p-5 md:p-8 max-w-[1600px]">
			<PageHeader title="Clients" subtitle="All enquiries, applicants, and placed families." />

			<div className="mb-4">
				<Segmented options={options} value={filter} onChange={setFilter} ariaLabel="Filter clients by stage" />
			</div>

			{loading ? (
				<LoadingPage />
			) : sorted.length === 0 ? (
				<Card>
					<p className="px-[22px] py-10 text-center text-sm text-warm-400">No clients match this filter.</p>
				</Card>
			) : (
				<Card>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr>
									{['Client', 'Stage', 'Deposit', 'City', 'Applied', 'Priority', ''].map((h, i) => (
										<th
											key={i}
											className={`text-[10.5px] uppercase tracking-[0.08em] text-warm-400 font-medium px-4 py-3 text-left border-b border-black/[0.06] whitespace-nowrap ${i >= 2 && i <= 5 ? 'hidden md:table-cell' : ''}`}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{sorted.map((c) => (
									<ClientRow key={c.id} client={c} />
								))}
							</tbody>
						</table>
					</div>
				</Card>
			)}
		</div>
	);
}

function ClientRow({ client: c }: { client: Client }) {
	const isWaitlist = (WAITLIST_STAGES as string[]).includes(c.stage);
	const name = `${c.firstName} ${c.lastName}`;
	return (
		<tr className="border-b border-black/[0.04] last:border-0 hover:bg-warm-50 transition-colors">
			<td className="px-4 py-3">
				<Link to={`/admin/clients/${c.id}`} className="flex items-center gap-3">
					<Avatar name={name} size={34} />
					<div className="min-w-0">
						<div className="text-[13.5px] font-medium text-warm-900 truncate">{name}</div>
						<div className="text-[11.5px] text-warm-500 truncate">{c.email}</div>
					</div>
				</Link>
			</td>
			<td className="px-4 py-3"><StageBadge stage={c.stage} size="sm" /></td>
			<td className="hidden md:table-cell px-4 py-3">
				<DepositPill status={c.depositStatus} tier={c.depositTier} />
			</td>
			<td className="hidden md:table-cell px-4 py-3 text-[12.5px] text-warm-700">
				{c.city ?? <span className="text-warm-300">—</span>}
			</td>
			<td className="hidden md:table-cell px-4 py-3 text-[12.5px] text-warm-500 tabular-nums whitespace-nowrap">
				{new Date(c.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })}
			</td>
			<td className="hidden md:table-cell px-4 py-3">
				{isWaitlist ? (
					<span className="inline-block text-[11.5px] font-mono text-warm-600 bg-warm-100 rounded px-2 py-1 tabular-nums">
						#{String(c.priority).padStart(2, '0')}
					</span>
				) : (
					<span className="text-warm-300">—</span>
				)}
			</td>
			<td className="px-4 py-3 text-right">
				<Link to={`/admin/clients/${c.id}`} className="inline-flex items-center text-[12px] font-medium" style={{ color: '#c47420' }}>
					Open <ChevronRight size={14} aria-hidden="true" />
				</Link>
			</td>
		</tr>
	);
}
