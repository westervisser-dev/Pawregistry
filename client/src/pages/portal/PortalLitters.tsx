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
	good:    'bg-teal-500',
	partial: 'bg-amber-500',
	low:     'bg-warm-300',
};

const tierBadgeBg: Record<LitterMatchTier, string> = {
	great:   'bg-green-50 text-green-800',
	good:    'bg-teal-50 text-teal-800',
	partial: 'bg-amber-50 text-amber-800',
	low:     'bg-warm-100 text-warm-500',
};

const tierDotColor: Record<LitterMatchTier, string> = {
	great:   'bg-green-600',
	good:    'bg-teal-500',
	partial: 'bg-amber-500',
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

function StageStrip({ status }: { status: LitterStatus }) {
	const current = STAGES.indexOf(status);

	return (
		<div className="flex items-start mt-1.5">
			{STAGES.map((stage, i) => {
				const isDone = i < current;
				const isCurrent = i === current;
				return (
					<div key={stage} className="flex-1 flex flex-col items-center relative">
						{i < STAGES.length - 1 && (
							<div
								className={`absolute top-[4.5px] left-[calc(50%+5.5px)] right-[calc(-50%+5.5px)] h-[1.5px] ${
									isDone ? 'bg-warm-400' : 'bg-warm-200'
								}`}
							/>
						)}
						<div
							className={`w-[11px] h-[11px] rounded-full border-[1.5px] relative z-[1] flex-shrink-0 ${
								isCurrent
									? 'bg-brand-600 border-brand-600 shadow-[0_0_0_3px_rgba(196,114,31,0.18)]'
									: isDone
										? 'bg-warm-400 border-warm-400'
										: 'bg-white border-warm-300'
							}`}
						/>
						<span
							className={`text-[9.5px] mt-[5px] text-center whitespace-nowrap leading-tight ${
								isCurrent
									? 'text-brand-600 font-semibold'
									: isDone
										? 'text-warm-500'
										: 'text-warm-400'
							}`}
						>
							{stage}
						</span>
					</div>
				);
			})}
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
	const hasAvailable = (litter.availableCount ?? 0) > 0;

	return (
		<Link
			to={`/portal/litters/${litter.id}`}
			className="group bg-white border border-black/[0.09] rounded-xl overflow-hidden flex flex-col hover:border-black/[0.16] hover:shadow-[0_2px_14px_rgba(0,0,0,0.055)] transition-[border-color,box-shadow] duration-150"
		>
			{/* Match bar */}
			{match && <div className={`h-[3px] w-full ${tierBarColor[match.tier]}`} />}

			{/* Body */}
			<div className="p-4 px-[18px] flex-1 flex flex-col gap-2">
				{/* Header: name + match badge */}
				<div className="flex items-start justify-between gap-2.5">
					<h3 className="text-sm font-semibold text-warm-900 leading-snug flex-1">
						{litter.name}
					</h3>
					{match && (
						<span className={`inline-flex items-center gap-[5px] text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap flex-shrink-0 leading-normal ${tierBadgeBg[match.tier]}`}>
							<span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tierDotColor[match.tier]}`} aria-hidden="true" />
							{tierLabel[match.tier]}
						</span>
					)}
				</div>

				{/* Breed · Size */}
				{breedLabel && (
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11.5px] font-semibold text-blue-700">{breedLabel}</span>
						{sizeLabel && (
							<>
								<span className="text-[11px] text-warm-400">·</span>
								<span className="text-[11.5px] text-warm-500">{sizeLabel}</span>
							</>
						)}
					</div>
				)}

				{/* Parents */}
				{(litter.sire?.name || litter.dam?.name) && (
					<p className="text-[12.5px] text-warm-500">
						{litter.sire?.name} <span className="text-warm-400">×</span> {litter.dam?.name}
					</p>
				)}

				{/* Availability */}
				{hasAvailable && (
					<p className="text-[12.5px] font-semibold text-brand-600">
						{litter.availableCount} {litter.availableCount === 1 ? 'puppy' : 'puppies'} available
					</p>
				)}

				{/* Stage timeline */}
				<StageStrip status={litter.status} />
			</div>

			{/* Footer */}
			<div className="px-[18px] py-2.5 border-t border-black/[0.09] flex items-center justify-between">
				<span className="text-[11.5px] text-warm-400">{formatDate(litter)}</span>
				<span className="text-xs font-semibold text-brand-600 group-hover:opacity-65 transition-opacity inline-flex items-center gap-1">
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
		<div className="mb-6">
			<h2 className="text-[10.5px] font-semibold tracking-[0.09em] uppercase text-warm-400 mb-3">{label}</h2>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
			<div className="mb-6">
				<h1 className="font-serif text-[28px] text-warm-900 leading-tight">Litters</h1>
				<p className="text-[13px] text-warm-500 mt-1">Our current and upcoming litters.</p>
			</div>

			{litters.length === 0 ? (
				<EmptyState icon="🐶" title="No litters listed right now" description="Check back soon — we'll update this page when a new litter is available." />
			) : (
				<>
					{/* Filter bar */}
					{hasMatches && (
						<div className="flex items-center gap-2 mb-7 flex-wrap">
							<span className="text-xs text-warm-500 mr-0.5">Filter by match:</span>
							<button
								onClick={() => setFilter('all')}
								className={`text-xs font-medium px-3.5 py-[5px] rounded-full border transition-all leading-snug cursor-pointer ${
									filter === 'all'
										? 'bg-brand-600 text-white border-brand-600'
										: 'bg-white text-warm-500 border-black/[0.09] hover:border-black/[0.16] hover:text-warm-700'
								}`}
							>
								All litters
							</button>
							{tierFilterOrder.map((tier) => (
								<button
									key={tier}
									onClick={() => setFilter(tier)}
									className={`text-xs font-medium px-3.5 py-[5px] rounded-full border transition-all leading-snug cursor-pointer ${
										filter === tier
											? 'bg-brand-600 text-white border-brand-600'
											: 'bg-white text-warm-500 border-black/[0.09] hover:border-black/[0.16] hover:text-warm-700'
									}`}
								>
									{tierLabel[tier]}
								</button>
							))}
						</div>
					)}

					{/* Sections */}
					<Section label="Available now" litters={availableNow} matches={matches} />
					<Section label="Upcoming litters" litters={upcoming} matches={matches} />

					{filtered.length === 0 && (
						<p className="text-sm text-warm-400 text-center py-12">No litters match this filter.</p>
					)}
				</>
			)}
		</div>
	);
}
