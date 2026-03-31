import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs, LitterMatchResult, LitterMatchTier, LitterStatus } from '@paw-registry/shared';
import { parseBreedSize, BREEDS, BREED_SIZES } from '@paw-registry/shared';
import { LoadingPage, EmptyState } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

/* ── Match tier config ── */

const tierBarColor: Record<LitterMatchTier, string> = {
	great:   'bg-green-600',
	good:    'bg-[#6B9E6B]',
	partial: 'bg-brand-500',
	low:     'bg-warm-200',
};

const tierBadge: Record<LitterMatchTier, string> = {
	great:   'bg-green-50 text-green-700',
	good:    'bg-[#EEF5EE] text-[#5A8C5A]',
	partial: 'bg-[#FFF3E5] text-brand-600',
	low:     'bg-warm-100 text-warm-500',
};

const tierBadgeDot: Record<LitterMatchTier, string> = {
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

/* ── Availability pill config by tier ── */

// pill background
const availPillBg: Record<LitterMatchTier, string> = {
	great:   'bg-green-50',
	good:    'bg-[#EEF5EE]',
	partial: 'bg-[#FFF3E5]',
	low:     'bg-warm-100',
};

// large number color
const availNumColor: Record<LitterMatchTier, string> = {
	great:   'text-green-700',
	good:    'text-[#5A8C5A]',
	partial: 'text-brand-500',
	low:     'text-warm-400',
};

// label color
const availWordColor: Record<LitterMatchTier, string> = {
	great:   'text-green-700',
	good:    'text-[#5A8C5A]',
	partial: 'text-brand-500',
	low:     'text-warm-400',
};

/* ── Stage chip dot color ── */

const stageDotColor: Record<LitterMatchTier, string> = {
	great:   'bg-green-600',
	good:    'bg-[#5A8C5A]',
	partial: 'bg-brand-500',
	low:     'bg-warm-400',
};

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
	const hasAvailable = availableCount > 0;
	const tier = match?.tier;
	const isGreat = tier === 'great';

	// Breed link color: green for great match, amber otherwise
	const breedColor = isGreat ? 'text-green-700' : 'text-brand-500';

	// Availability pill
	const pillBg = tier ? availPillBg[tier] : 'bg-warm-100';
	const pillNumColor = tier ? availNumColor[tier] : 'text-warm-400';
	const pillWordColor = tier ? availWordColor[tier] : 'text-warm-400';

	// Stage chip dot
	const chipDotColor = tier ? stageDotColor[tier] : 'bg-warm-400';

	// Capitalize stage
	const stageDisplay = (litter.status as string).charAt(0).toUpperCase() + (litter.status as string).slice(1);

	return (
		<Link
			to={`/portal/litters/${litter.id}`}
			className="group bg-white border-[1.5px] border-warm-200 rounded-xl overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.05)] hover:border-brand-500/50 transition-[transform,box-shadow,border-color] duration-[180ms] ease-out"
		>
			{/* Match bar */}
			{tier && <div className={`h-[3px] w-full ${tierBarColor[tier]}`} />}

			{/* Body */}
			<div className="px-5 pt-[18px] pb-4 flex-1 flex flex-col">

				{/* Title + match badge */}
				<div className="flex items-start justify-between gap-2.5 mb-1.5">
					<h3 className="font-serif text-base leading-snug text-warm-900 flex-1">
						{litter.name}
					</h3>
					{tier && (
						<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap flex-shrink-0 ml-2.5 mt-[2px] ${tierBadge[tier]}`}>
							<span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${tierBadgeDot[tier]}`} aria-hidden="true" />
							{tierLabel[tier]}
						</span>
					)}
				</div>

				{/* Breed · Size */}
				{breedLabel && (
					<div className="flex items-center gap-[5px] mb-3.5 flex-wrap">
						<span className={`text-xs font-semibold ${breedColor}`}>{breedLabel}</span>
						{sizeLabel && (
							<>
								<span className="text-[11px] text-warm-300" aria-hidden="true">·</span>
								<span className="text-xs text-warm-400">{sizeLabel}</span>
							</>
						)}
					</div>
				)}

				{/* Parents + availability pill */}
				<div className="flex items-end justify-between gap-3">
					{(litter.sire?.name || litter.dam?.name) && (
						<div>
							<p className="text-[9.5px] font-semibold tracking-[0.07em] uppercase text-warm-400 mb-[3px]">Parents</p>
							<p className="text-[12.5px] text-warm-700">
								{litter.sire?.name} <span className="text-warm-400">×</span> {litter.dam?.name}
							</p>
						</div>
					)}

					{/* Availability pill */}
					<div className={`flex flex-col items-center rounded-[10px] px-3.5 py-[7px] flex-shrink-0 min-w-[66px] ${pillBg}`}>
						<span className={`font-serif leading-none ${hasAvailable ? 'text-2xl' : 'text-lg'} ${pillNumColor}`}>
							{hasAvailable ? availableCount : '—'}
						</span>
						<span className={`text-[9px] mt-[3px] font-semibold tracking-[0.05em] uppercase leading-none ${!hasAvailable ? 'normal-case tracking-normal font-normal text-[9.5px]' : ''} ${pillWordColor}`}>
							{hasAvailable ? 'available' : 'expected soon'}
						</span>
					</div>
				</div>

			</div>

			{/* Footer: stage chip · date · view link */}
			<div className="px-5 py-[11px] border-t border-warm-100 flex items-center gap-2.5 mt-0">
				{/* Stage chip */}
				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-[1.5px] border-warm-200">
					<span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${chipDotColor}`} aria-hidden="true" />
					<span className="text-[11.5px] font-semibold text-warm-800">{stageDisplay}</span>
				</div>

				{/* Date */}
				<span className="text-[11px] text-warm-400 truncate">{formatDate(litter)}</span>

				{/* View link — pushed right */}
				<span className="text-xs font-semibold text-brand-500 inline-flex items-center gap-[3px] group-hover:gap-[7px] transition-[gap] duration-150 ml-auto whitespace-nowrap flex-shrink-0">
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
			<div className="flex items-center gap-3 mb-4">
				<h2 className="text-xs font-semibold uppercase tracking-wider text-warm-600 whitespace-nowrap">{label}</h2>
				<div className="h-px flex-1 bg-warm-300" />
				<span className="text-[10.5px] text-warm-400 bg-warm-100 px-2 py-[1px] rounded-full flex-shrink-0">
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

	const filtered = filter === 'all'
		? litters
		: litters.filter((l) => matches[l.id]?.tier === filter);

	const availableNow = filtered.filter((l) => (l.availableCount ?? 0) > 0);
	const upcoming = filtered.filter((l) => (l.availableCount ?? 0) === 0);

	return (
		<div>
			{/* Header */}
			<div className="mb-7">
				<h1 className="font-serif text-[34px] text-warm-900 leading-[1.05] mb-[5px]">Litters</h1>
				<p className="text-[13.5px] text-warm-500">Our current and upcoming litters, matched to your preferences.</p>
			</div>

			{litters.length === 0 ? (
				<EmptyState icon="🐶" title="No litters listed right now" description="Check back soon — we'll update this page when a new litter is available." />
			) : (
				<>
					{/* Filter bar */}
					{hasMatches && (
						<div className="flex items-center gap-[7px] mb-8 flex-wrap">
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
