import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, EmptyState, LoadingPage, PageHeader, Segmented } from '@/components/ui';
import { getBreedSizeLabel, type Litter, type LitterStatus } from '@paw-registry/shared';
import { usePageTitle } from '@/hooks/usePageTitle';

type Filter = 'active' | 'planned' | 'available' | 'booked' | 'completed';

const STATUS_STYLE: Record<LitterStatus, { bg: string; fg: string; dot: string; label: string }> = {
	planned:   { bg: '#fef3e7', fg: '#a35c17', dot: '#d98e3a', label: 'Planned' },
	available: { bg: '#e5ecf2', fg: '#1e5b8a', dot: '#2f78a9', label: 'Available' },
	booked:    { bg: '#e8dff0', fg: '#5a2d83', dot: '#7a47a8', label: 'Booked' },
	completed: { bg: '#e4ebe0', fg: '#3e5a2a', dot: '#5a7a3f', label: 'Completed' },
};

function LitterStatusPill({ status }: { status: LitterStatus }) {
	const s = STATUS_STYLE[status];
	return (
		<span
			className="inline-flex items-center gap-1.5 rounded-full font-medium px-2 py-[3px] text-[10.5px]"
			style={{ background: s.bg, color: s.fg }}
		>
			<span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} aria-hidden="true" />
			{s.label}
		</span>
	);
}

function shortDate(iso: string | null): string {
	if (!iso) return 'TBD';
	return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function AdminLitters() {
	const [litters, setLitters] = useState<Litter[]>([]);
	const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<Filter>('active');

	usePageTitle('Litters');

	useEffect(() => {
		api.litters.admin.all.get().then(({ data }) => {
			if (data) setLitters(data as Litter[]);
			setLoading(false);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters.admin as any)['matching-counts'].get().then(({ data }: { data: Record<string, number> | null }) => {
			if (data) setMatchCounts(data);
		});
	}, []);

	const counts = useMemo(() => ({
		active: litters.filter((l) => l.status !== 'completed').length,
		planned: litters.filter((l) => l.status === 'planned').length,
		available: litters.filter((l) => l.status === 'available').length,
		booked: litters.filter((l) => l.status === 'booked').length,
		completed: litters.filter((l) => l.status === 'completed').length,
	}), [litters]);

	const filtered = useMemo(() => {
		const statusOrder: Record<LitterStatus, number> = { available: 0, booked: 1, planned: 2, completed: 3 };
		const list = filter === 'active'
			? litters.filter((l) => l.status !== 'completed')
			: litters.filter((l) => l.status === filter);
		return [...list].sort((a, b) => {
			const sd = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
			return sd !== 0 ? sd : a.name.localeCompare(b.name);
		});
	}, [litters, filter]);

	const options: { value: Filter; label: string; count: number }[] = [
		{ value: 'active', label: 'Active', count: counts.active },
		{ value: 'planned', label: 'Planned', count: counts.planned },
		{ value: 'available', label: 'Available', count: counts.available },
		{ value: 'booked', label: 'Booked', count: counts.booked },
		{ value: 'completed', label: 'Completed', count: counts.completed },
	];

	return (
		<div className="p-5 md:p-8 max-w-[1600px]">
			<PageHeader
				title="Litters"
				subtitle="Past, present and planned — across all breeds."
				action={
					<Link
						to="/admin/litters/new"
						className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-[9px] hover:bg-brand-600 transition-colors"
					>
						<Plus size={14} aria-hidden="true" /> New litter
					</Link>
				}
			/>

			<div className="mb-4">
				<Segmented options={options} value={filter} onChange={setFilter} ariaLabel="Filter litters" />
			</div>

			{loading ? (
				<LoadingPage />
			) : filtered.length === 0 ? (
				<Card>
					<EmptyState title="No litters match this filter" />
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
					{filtered.map((litter) => (
						<LitterCard
							key={litter.id}
							litter={litter}
							matchCount={matchCounts[litter.id]}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function LitterCard({ litter, matchCount }: { litter: Litter; matchCount: number | undefined }) {
	const available = litter.availableCount ?? 0;
	const total = litter.puppyCount ?? 0;
	const placed = Math.max(0, total - available);
	const pct = total > 0 ? (placed / total) * 100 : 0;

	return (
		<Link
			to={`/admin/litters/${litter.id}`}
			className="block text-left bg-white rounded-[14px] border border-black/[0.06] overflow-hidden hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-shadow"
		>
			<div className="aspect-[16/9] bg-warm-100 relative">
				{litter.coverImageUrl ? (
					<img src={litter.coverImageUrl} alt="" className="w-full h-full object-cover" />
				) : (
					<div className="w-full h-full flex items-center justify-center text-warm-300 text-xs uppercase tracking-wider">
						No cover image
					</div>
				)}
				{!litter.isPublic && (
					<span className="absolute top-3 right-3 inline-flex items-center px-2 py-[3px] rounded-full text-[10px] font-medium bg-warm-900/75 text-warm-50 backdrop-blur-sm">
						Private
					</span>
				)}
			</div>
			<div className="p-5">
				<div className="flex items-center justify-between mb-1.5">
					<LitterStatusPill status={litter.status} />
					<span className="text-[11px] text-warm-500 tabular-nums truncate ml-2">
						{getBreedSizeLabel(litter.breed)}
					</span>
				</div>
				<h3 className="font-serif text-[22px] text-warm-900 leading-tight truncate">{litter.name}</h3>

				{total > 0 ? (
					<>
						<div className="flex items-end justify-between mt-4">
							<div>
								<div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Puppies placed</div>
								<div className="font-serif text-[22px] text-warm-900 leading-none">
									{placed}<span className="text-warm-400 text-[16px]"> / {total}</span>
								</div>
							</div>
							<div className="text-right">
								<div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Go home</div>
								<div className="text-[13px] text-warm-800 font-medium">{shortDate(litter.goHomeDate)}</div>
							</div>
						</div>
						<div className="h-1.5 bg-warm-100 rounded-full overflow-hidden mt-2.5">
							<div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#c47420' }} />
						</div>
					</>
				) : (
					<div className="mt-4 flex items-center gap-2 text-[12.5px] text-warm-500">
						<Calendar size={14} aria-hidden="true" /> Selection {shortDate(litter.selectionDate)}
					</div>
				)}

				{matchCount != null && matchCount > 0 && (
					<div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-[3px] rounded-full bg-brand-50 text-brand-700">
						<Users size={11} aria-hidden="true" /> {matchCount} matching
					</div>
				)}
			</div>
		</Link>
	);
}
