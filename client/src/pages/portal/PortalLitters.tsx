import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs, LitterMatchResult, LitterMatchTier, LitterStatus } from '@paw-registry/shared';
import { parseBreedSize, BREEDS, BREED_SIZES } from '@paw-registry/shared';
import { LoadingPage, EmptyState } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

/* ── Match tier styling ── */

const tierBarColor: Record<LitterMatchTier, string> = {
	great:   'bg-green-600',
	good:    'bg-[#6B9E6B]',
	partial: 'bg-brand-500',
	low:     'bg-warm-300',
};

const tierBadgeBg: Record<LitterMatchTier, string> = {
	great:   'bg-green-50 text-green-700',
	good:    'bg-[#EEF5EE] text-[#5A8C5A]',
	partial: 'bg-amber-50 text-brand-600',
	low:     'bg-warm-100 text-warm-500',
};

const tierDotColor: Record<LitterMatchTier, string> = {
	great:   'bg-green-600',
	good:    'bg-[#5A8C5A]',
	partial: 'bg-brand-500',
	low:     'bg-warm-400',
};

const tierLabel: Record<LitterMatchTier, string> = {
	great:   'Great match',
	good:    'Good match',
	partial: 'Partial match',
	low:     'Low match',
};

const tierFilterOrder: LitterMatchTier[] = ['great', 'good', 'partial', 'low'];

/* ── Stage timeline ── */

const STAGES: LitterStatus[] = ['planned', 'confirmed', 'born', 'weaning', 'available', 'completed'];

function StageStrip({ status, tier }: { status: LitterStatus; tier?: LitterMatchTier }) {
	const currentIdx = STAGES.indexOf(status);
	const fillPct = currentIdx <= 0 ? 0 : Math.round((currentIdx / (STAGES.length - 1)) * 100);
	const isGreat = tier === 'great';

	return (
		<div className="relative">
			{/* Track */}
			<div
				className="absolute top-[4px] h-[2px] bg-warm-200 rounded-full overflow-hidden"
				style={{ left: `calc(100% / 12)`, right: `calc(100% / 12)` }}
			>
				<div
					className="h-full bg-warm-700 rounded-full"
					style={{ width: `${fillPct}%` }}
				/>
			</div>
			{/* Dots */}
			<div className="relative flex z-[1]">
				{STAGES.map((stage, i) => {
					const isDone = i < currentIdx;
					const isCurrent = i === currentIdx;
					return (
						<div key={stage} className="flex-1 flex flex-col items-center gap-[5px]">
							<div
								className={`w-[10px] h-[10px] rounded-full border-2 flex-shrink-0 ${
									isCurrent
										? isGreat
											? 'bg-green-600 border-green-600 shadow-[0_0_0_3px_rgba(45,122,79,0.18)]'
											: 'bg-brand-500 border-brand-500 shadow-[0_0_0_3px_rgba(196,114,31,0.18)]'
										: isDone
											? 'bg-warm-700 border-warm-700'
											: 'bg-warm-100 border-warm-300'
								}`}
							/>
							<span
								className={`text-[9.5px] font-medium text-center whitespace-nowrap capitalize ${
									isCurrent ? 'text-warm-900 font-semibold' : isDone ? 'text-warm-500' : 'text-warm-400'
								}`}
							>
								{stage}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

/* ── Helpers ── */

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
	if (litter.whelpDate) {
		return `Born ${new Date(litter.whelpDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`;
	}
	if (litter.expectedDate) {
		return `Expected ${new Date(litter.expectedDate).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`;
	}
	return '';
}

/* ── Litter card ── */

function LitterCard({ litter, match }: { litter: LitterWithDogs; match?: LitterMatchResult }) {
	const breedLabel = getBreedLabel(litter.breed);
	const sizeLabel = getSizeLabel(litter.breed);
	const availableCount = litter.availableCount ?? 0;

	return (
		<Link
			to={`/portal/litters/${litter.id}`}
			className="group bg-white border-[1.5px] border-warm-200 rounded-xl overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.05)] hover:border-brand-500/50 transition-[transform,box-shadow,border-color] duration-200"
		>
			{/* Match bar */}
			{match && <div className={`h-[3px] w-full ${tierBarColor[match.tier]}`} />}

			{/* Body */}
			<div className="px-5 pt-[18px] pb-3.5 flex-1 flex flex-col">
				{/* Header: name + match badge */}
				<div className="flex items-start justify-between gap-2.5 mb-2.5">
					<h3 className="font-serif text-base leading-snug text-warm-900 flex-1">
						{litter.name}
					</h3>
					{match && (
						<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ml-2.5 mt-[1px] ${tierBadgeBg[match.tier]}`}>
							<span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${tierDotColor[match.tier]}`} aria-hidden="true" />
							{tierLabel[match.tier]}
						</span>
					)}
				</div>

				{/* Breed + size pill */}
				{breedLabel && (
					<div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
						<span className="text-xs font-semibold text-brand-500">{breedLabel}</span>
						{sizeLabel && (
							<>
								<span className="w-[3px] h-[3px] rounded-full bg-warm-300 flex-shrink-0" aria-hidden="true" />
								<span className="text-[11.5px] text-warm-500 bg-warm-100 px-2 py-[1px] rounded-full font-medium">{sizeLabel}</span>
							</>
						)}
					</div>
				)}

				{/* Parents + puppy count side by side */}
				<div className="flex items-end justify-between mb-4">
					{(litter.sire?.name || litter.dam?.name) && (
						<div>
							<p className="text-[10px] font-semibold tracking-[0.06em] uppercase text-warm-400 mb-0.5">Parents</p>
							<p className="text-[12.5px] text-warm-600">
								{litter.sire?.name} <span className="text-warm-400">×</span> {litter.dam?.name}
							</p>
						</div>
					)}
					<div className="flex items-baseline gap-1 flex-shrink-0">
						<span className="font-serif text-[18px] text-brand-500 leading-none">
							{availableCount > 0 ? availableCount : '—'}
						</span>
						<span className="text-[11px] text-warm-400 font-normal">
							{availableCount > 0
								? (availableCount === 1 ? 'puppy available' : 'puppies available')
								: 'expected soon'}
						</span>
					</div>
				</div>

				{/* Stage timeline */}
				<StageStrip status={litter.status} tier={match?.tier} />
			</div>

			{/* Footer */}
			<div className="px-5 py-2.5 border-t border-warm-100 flex items-center justify-between">
				<span className="text-[11.5px] text-warm-400">
					<span className="font-semibold text-warm-600">{formatDate(litter)}</span>
				</span>
				<span className="text-xs font-semibold text-brand-500 inline-flex items-center gap-[3px] group-hover:gap-[7px] transition-[gap] duration-150">
					View litter <span aria-hidden="true">→</span>
				</span>
			</div>
		</Link>
	);
}

/* ── Section ── */

function Section({ label, litters, matches }: { label: string; litters: LitterWithDogs[]; matches: Record<string, LitterMatchResult> }) {
	if (litters.length === 0) return null;
	return (
		<div className="mb-10">
			{/* Section header with line + count */}
			<div className="flex items-center gap-2.5 mb-4">
				<h2 className="text-[10px] font-semibold tracking-[0.14em] uppercase text-warm-400 whitespace-nowrap">{label}</h2>
				<div className="flex-1 h-px bg-warm-200" />
				<span className="text-[10.5px] text-warm-400 bg-warm-100 px-2 py-[1px] rounded-full">
					{litters.length} {litters.length === 1 ? 'litter' : 'litters'}
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{litters.map((l) => <LitterCard key={l.id} litter={l} match={matches[l.id]} />)}
			</div>
		</div>
	);
}

/* ── Main page ── */

export function PortalLitters() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);
	const [matches, setMatches] = useState<Record<string, LitterMatchResult>>({});
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<LitterMatchTier | 'all'>('all');
	const { user } = useAuthStore();

	useEffect(() => {
		document.title = 'Litters — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		const fetchAll = async () => {
			const [littersRes, matchesRes] = await Promise.all([
				api.litters.get(),
				user
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					? (api.litters.portal as any)['my-matches'].get()
					: Promise.resolve({ data: null }),
			]);

			if (littersRes.data) setLitters(littersRes.data as LitterWithDogs[]);

			if (matchesRes.data) {
				const map: Record<string, LitterMatchResult> = {};
				(matchesRes.data as LitterMatchResult[]).forEach((m) => { map[m.litterId] = m; });
				setMatches(map);
			}

			setLoading(false);
		};
		fetchAll();
	}, [user]);

	if (loading) return <LoadingPage />;

	const hasMatches = Object.keys(matches).length > 0;

	/* Apply filter */
	const filtered = filter === 'all'
		? litters
		: litters.filter((l) => matches[l.id]?.tier === filter);

	/* Group into sections */
	const availableNow = filtered.filter((l) => (l.availableCount ?? 0) > 0);
	const upcoming = filtered.filter((l) => (l.availableCount ?? 0) === 0);

	return (
		<div>
			{/* Header */}
			<div className="mb-7">
				<h1 className="font-serif text-[34px] text-warm-900 leading-[1.05] mb-1">Litters</h1>
				<p className="text-[13.5px] text-warm-500">Our current and upcoming litters, matched to your preferences.</p>
			</div>

			{litters.length === 0 ? (
				<EmptyState icon="🐶" title="No litters listed right now" description="Check back soon — we'll update this page when a new litter is available." />
			) : (
				<>
					{/* Filter bar */}
					{hasMatches && (
						<div className="flex items-center gap-2 mb-8 flex-wrap">
							<span className="text-[12.5px] font-medium text-warm-400 mr-[3px]">Filter by match</span>
							<button
								onClick={() => setFilter('all')}
								className={`text-[12.5px] font-medium px-[15px] py-[6px] rounded-full border-[1.5px] transition-all leading-snug cursor-pointer ${
									filter === 'all'
										? 'bg-brand-500 text-white border-brand-500'
										: 'bg-transparent text-warm-500 border-warm-200 hover:border-brand-500 hover:text-brand-500'
								}`}
							>
								All litters
							</button>
							{tierFilterOrder.map((tier) => (
								<button
									key={tier}
									onClick={() => setFilter(tier)}
									className={`text-[12.5px] font-medium px-[15px] py-[6px] rounded-full border-[1.5px] transition-all leading-snug cursor-pointer ${
										filter === tier
											? 'bg-brand-500 text-white border-brand-500'
											: 'bg-transparent text-warm-500 border-warm-200 hover:border-brand-500 hover:text-brand-500'
									}`}
								>
									{tierLabel[tier]}
								</button>
							))}
						</div>
					)}

					{/* Sections */}
					<Section label="Available Now" litters={availableNow} matches={matches} />
					<Section label="Upcoming Litters" litters={upcoming} matches={matches} />

					{filtered.length === 0 && (
						<p className="text-sm text-warm-400 text-center py-12">No litters match this filter.</p>
					)}
				</>
			)}
		</div>
	);
}
