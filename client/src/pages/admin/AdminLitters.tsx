import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Megaphone } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, EmptyState, LoadingPage, PageHeader, Segmented } from '@/components/ui';
import { parseBreedSize, BREEDS, BREED_SIZES, type LitterWithDogs, type LitterStatus } from '@paw-registry/shared';
import { usePageTitle } from '@/hooks/usePageTitle';

type Filter = 'active' | 'planned' | 'available' | 'booked' | 'completed';

const statusPillBg: Record<LitterStatus, string> = {
	available: 'bg-green-50',
	booked:    'bg-[#FFF3E5]',
	planned:   'bg-warm-100',
	completed: 'bg-warm-100',
};

const statusPillColor: Record<LitterStatus, string> = {
	available: 'text-green-700',
	booked:    'text-brand-500',
	planned:   'text-warm-400',
	completed: 'text-warm-400',
};

const statusDotColor: Record<LitterStatus, string> = {
	available: 'bg-green-600',
	booked:    'bg-brand-500',
	planned:   'bg-warm-400',
	completed: 'bg-warm-400',
};

const statusBarColor: Record<LitterStatus, string> = {
	available: 'bg-green-600',
	booked:    'bg-brand-500',
	planned:   'bg-warm-200',
	completed: 'bg-warm-200',
};

function getBreedLabel(raw: string | null | undefined): string | null {
	const parsed = parseBreedSize(raw);
	if (!parsed) return null;
	return BREEDS.find((b) => b.value === parsed.breed)?.label ?? parsed.breed;
}

function getSizeLabel(raw: string | null | undefined): string | null {
	const parsed = parseBreedSize(raw);
	if (!parsed?.size) return null;
	return BREED_SIZES[parsed.breed]?.find((s) => s.value === parsed.size)?.label ?? parsed.size;
}

function formatDate(litter: LitterWithDogs): string {
	const fmt = (d: string) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
	if (litter.goHomeDate) return `Go home ${fmt(litter.goHomeDate)}`;
	return `Selection ${fmt(litter.selectionDate)}`;
}

export function AdminLitters() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);
	const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<Filter>('active');

	usePageTitle('Litters');

	useEffect(() => {
		api.litters.admin.all.get().then(({ data }) => {
			if (data) setLitters(data as LitterWithDogs[]);
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

function LitterCard({ litter, matchCount }: { litter: LitterWithDogs; matchCount: number | undefined }) {
	const breedLabel = getBreedLabel(litter.breed);
	const sizeLabel = getSizeLabel(litter.breed);
	const availableCount = litter.puppies?.filter((p) => p.status === 'available').length ?? 0;
	const hasAvailable = availableCount > 0;
	const isPlanned = litter.status === 'planned';
	const needsLaunch = litter.status === 'available' && !litter.launchedAt;

	const stageDisplay = litter.status.charAt(0).toUpperCase() + litter.status.slice(1);

	const pillBg = hasAvailable ? statusPillBg[litter.status] : 'bg-warm-100';
	const pillNumColor = hasAvailable ? statusPillColor[litter.status] : 'text-warm-400';
	const pillWordColor = hasAvailable ? statusPillColor[litter.status] : 'text-warm-400';

	return (
		<Link
			to={`/admin/litters/${litter.id}`}
			className="group bg-white border-[1.5px] border-warm-200 rounded-xl overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.05)] hover:border-brand-500/50 transition-[transform,box-shadow,border-color] duration-[180ms] ease-out"
		>
			<div className={`h-[3px] w-full ${statusBarColor[litter.status]}`} />

			{litter.coverImageUrl && (
				<div className="aspect-[16/9] relative">
					<img src={litter.coverImageUrl} alt="" className="w-full h-full object-cover" />
				</div>
			)}

			{/* Body */}
			<div className="px-5 pt-[18px] pb-4 flex-1 flex flex-col">

				{/* Title + badges */}
				<div className="flex items-start justify-between gap-2.5 mb-1.5">
					<h3 className="font-serif text-base leading-snug text-warm-900 flex-1">
						{litter.name}
					</h3>
					<div className="flex items-center gap-1.5 flex-shrink-0 ml-2.5 mt-[2px]">
						{needsLaunch && (
							<span
								className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap bg-brand-500 text-white"
								title="This litter is available but clients haven't been notified yet. Open it to allow reservations."
							>
								<Megaphone size={11} aria-hidden="true" /> Ready to launch
							</span>
						)}
						{!litter.isPublic && (
							<span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap bg-warm-900/10 text-warm-700">
								Private
							</span>
						)}
						{matchCount != null && matchCount > 0 && (
							<span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap bg-brand-50 text-brand-600">
								<Users size={11} aria-hidden="true" /> {matchCount}
							</span>
						)}
					</div>
				</div>

				{/* Breed · Size */}
				{breedLabel && (
					<div className="flex items-center gap-[5px] mb-3.5 flex-wrap">
						<span className="text-xs font-semibold text-brand-500">{breedLabel}</span>
						{sizeLabel && (
							<>
								<span className="text-[11px] text-warm-300" aria-hidden="true">·</span>
								<span className="text-xs text-warm-400">{sizeLabel}</span>
							</>
						)}
					</div>
				)}

				{/* Availability pill */}
				<div className="flex items-end justify-start gap-3">
					<div className={`flex flex-col items-center rounded-[10px] px-3.5 py-[7px] flex-shrink-0 min-w-[66px] ${pillBg}`}>
						<span className={`font-serif leading-none ${hasAvailable ? 'text-2xl' : 'text-lg'} ${pillNumColor}`}>
							{hasAvailable ? availableCount : '—'}
						</span>
						<span className={`mt-[3px] leading-none ${pillWordColor} ${hasAvailable ? 'text-[9px] font-semibold tracking-[0.05em] uppercase' : 'text-[9.5px] normal-case tracking-normal font-normal'}`}>
							{hasAvailable ? 'available' : isPlanned ? 'expected soon' : 'fully reserved'}
						</span>
					</div>
				</div>

			</div>

			{/* Footer: stage chip · date · view link */}
			<div className="px-5 py-[11px] border-t border-warm-100 flex items-center gap-2.5 mt-0">
				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-[1.5px] border-warm-200">
					<span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${statusDotColor[litter.status]}`} aria-hidden="true" />
					<span className="text-[11.5px] font-semibold text-warm-800">{stageDisplay}</span>
				</div>

				<span className="text-[11px] text-warm-400 truncate">{formatDate(litter)}</span>

				<span className="text-xs font-semibold text-brand-500 inline-flex items-center gap-[3px] group-hover:gap-[7px] transition-[gap] duration-150 ml-auto whitespace-nowrap flex-shrink-0">
					View litter <span aria-hidden="true">→</span>
				</span>
			</div>
		</Link>
	);
}
