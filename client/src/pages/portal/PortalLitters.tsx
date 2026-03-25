import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs } from '@paw-registry/shared';
import { LoadingPage, LitterStatusBadge, EmptyState, BreedBadge } from '@/components/ui';

export function PortalLitters() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		document.title = 'Litters — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		api.litters.get().then(({ data }) => {
			if (data) setLitters(data as LitterWithDogs[]);
			setLoading(false);
		});
	}, []);

	if (loading) return <LoadingPage />;

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-stone-900">Litters</h1>
				<p className="text-stone-500 text-sm mt-1">Our current and upcoming litters.</p>
			</div>

			{litters.length === 0 ? (
				<EmptyState icon="🐶" title="No litters listed right now" description="Check back soon — we'll update this page when a new litter is available." />
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{litters.map((litter) => {
						const hasAvailable = (litter.availableCount ?? 0) > 0;

						return (
							<Link
								key={litter.id}
								to={`/portal/litters/${litter.id}`}
								className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 flex flex-col"
							>
								<div className="p-5 flex flex-col flex-1 relative">
									<div className="flex items-start justify-between gap-3 mb-2">
										<h2 className="font-serif text-lg font-bold text-stone-900 group-hover:text-brand-600 transition-colors leading-snug">
											{litter.name}
										</h2>
										<div className="flex items-center gap-2 flex-shrink-0">
											{litter.breed && <BreedBadge breed={litter.breed} />}
											<LitterStatusBadge status={litter.status} />
										</div>
									</div>

									<div className="flex flex-col gap-1 flex-1">
										{(litter.sire?.name || litter.dam?.name) && (
											<p className="text-sm text-stone-500">
												{litter.sire?.name} × {litter.dam?.name}
											</p>
										)}
										{litter.expectedDate && !litter.whelpDate && (
											<p className="text-xs text-stone-400">
												Expected {new Date(litter.expectedDate).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
											</p>
										)}
										{litter.whelpDate && (
											<p className="text-xs text-stone-400">
												Born {new Date(litter.whelpDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
											</p>
										)}
									</div>

									{hasAvailable && (
										<p className="mt-3 text-sm font-semibold text-brand-600 pr-6">
											{litter.availableCount} {litter.availableCount === 1 ? 'puppy' : 'puppies'} available
										</p>
									)}

									<span className="absolute bottom-4 right-5 text-xs text-stone-300 group-hover:text-stone-400 group-hover:translate-x-0.5 transition-all duration-150">
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
