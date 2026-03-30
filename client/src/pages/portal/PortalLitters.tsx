import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs, LitterMatchResult, LitterMatchTier } from '@paw-registry/shared';
import { LoadingPage, LitterStatusBadge, EmptyState, BreedBadge } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

const tierDot: Record<LitterMatchTier, string> = {
	great:   'bg-green-500',
	good:    'bg-teal-500',
	partial: 'bg-amber-400',
	low:     'bg-warm-300',
};

const tierText: Record<LitterMatchTier, string> = {
	great:   'text-green-700',
	good:    'text-teal-700',
	partial: 'text-amber-700',
	low:     'text-warm-400',
};

const tierLabel: Record<LitterMatchTier, string> = {
	great:   'Great match',
	good:    'Good match',
	partial: 'Partial match',
	low:     'Low match',
};

export function PortalLitters() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);
	const [matches, setMatches] = useState<Record<string, LitterMatchResult>>({});
	const [loading, setLoading] = useState(true);
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

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-warm-900">Litters</h1>
				<p className="text-warm-500 text-sm mt-1">Our current and upcoming litters.</p>
			</div>

			{litters.length === 0 ? (
				<EmptyState icon="🐶" title="No litters listed right now" description="Check back soon — we'll update this page when a new litter is available." />
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{litters.map((litter) => {
						const hasAvailable = (litter.availableCount ?? 0) > 0;
						const match = matches[litter.id] as LitterMatchResult | undefined;

						return (
							<Link
								key={litter.id}
								to={`/portal/litters/${litter.id}`}
								className="group bg-white rounded-2xl border border-warm-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 flex flex-col"
							>
								<div className="p-5 flex flex-col flex-1 relative">
									<div className="flex items-start justify-between gap-3 mb-2">
										<h2 className="font-serif text-lg font-bold text-warm-900 group-hover:text-brand-600 transition-colors leading-snug">
											{litter.name}
										</h2>
										<div className="flex items-center gap-2 flex-shrink-0">
											{litter.breed && <BreedBadge breed={litter.breed} />}
											<LitterStatusBadge status={litter.status} />
										</div>
									</div>

									<div className="flex flex-col gap-1 flex-1">
										{(litter.sire?.name || litter.dam?.name) && (
											<p className="text-sm text-warm-500">
												{litter.sire?.name} × {litter.dam?.name}
											</p>
										)}
										{litter.expectedDate && !litter.whelpDate && (
											<p className="text-xs text-warm-400">
												Expected {new Date(litter.expectedDate).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
											</p>
										)}
										{litter.whelpDate && (
											<p className="text-xs text-warm-400">
												Born {new Date(litter.whelpDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
											</p>
										)}
									</div>

									<div className="flex items-end justify-between mt-3 pr-6">
										{hasAvailable ? (
											<p className="text-sm font-semibold text-brand-600">
												{litter.availableCount} {litter.availableCount === 1 ? 'puppy' : 'puppies'} available
											</p>
										) : <span />}

										{hasMatches && match && (
											<div className="flex items-center gap-1.5">
												<div
													aria-hidden="true"
													className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tierDot[match.tier]}`}
												/>
												<span className={`text-xs font-medium ${tierText[match.tier]}`}>
													{tierLabel[match.tier]}
												</span>
											</div>
										)}
									</div>

									<span className="absolute bottom-4 right-5 text-xs text-warm-300 group-hover:text-warm-400 group-hover:translate-x-0.5 transition-all duration-150">
										→
									</span>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}
