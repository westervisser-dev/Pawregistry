import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs } from '@paw-registry/shared';
import { LoadingPage, LitterStatusBadge, EmptyState, BreedBadge } from '@/components/ui';

export function LittersPage() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.litters.get().then(({ data }) => {
			if (data) setLitters(data as LitterWithDogs[]);
			setLoading(false);
		});
	}, []);

	useEffect(() => {
		document.title = 'Available Litters — Paw Registry';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	if (loading) return <LoadingPage />;

	return (
		<div className="max-w-6xl mx-auto px-6 py-16">

			{/* Left-aligned header */}
			<div className="mb-12">
				<h1 className="font-serif text-4xl font-bold text-stone-900 mb-2">Our litters</h1>
				<p className="text-stone-500 max-w-lg">
					Planned and current litters from our health-tested breeding programme.
				</p>
			</div>

			{litters.length === 0 ? (
				<EmptyState icon="🐶" title="No litters listed right now" description="Check back soon, or apply to join our waitlist." />
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
					{litters.map((litter) => {
						const hasAvailable = (litter.availableCount ?? 0) > 0;

						return (
							<Link
								key={litter.id}
								to={`/litters/${litter.id}`}
								className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 flex flex-col"
							>
								{/* Card body */}
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

									{/* Available count — inline, no heavy row */}
									{hasAvailable && (
										<p className="mt-3 text-sm font-semibold text-brand-600 pr-6">
											{litter.availableCount} {litter.availableCount === 1 ? 'puppy' : 'puppies'} available
										</p>
									)}

									{/* Subtle corner arrow */}
									<span className="absolute bottom-4 right-5 text-xs text-stone-300 group-hover:text-stone-400 group-hover:translate-x-0.5 transition-all duration-150">
										→
									</span>
								</div>
							</Link>
						);
					})}
				</div>
			)}

			{/* Waitlist CTA */}
			<div className="mt-16 bg-brand-50 border border-brand-100 rounded-2xl p-8 md:p-12">
				<div className="max-w-md">
					<h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">Join our waitlist</h2>
					<p className="text-stone-500 mb-6 text-sm leading-relaxed">
						Litters fill quickly. Submit an application and we'll be in touch when a suitable match becomes available.
					</p>
					<Link to="/apply" className="inline-block px-7 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors text-sm">
						Apply now
					</Link>
				</div>
			</div>
		</div>
	);
}
