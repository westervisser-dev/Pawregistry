// Re-export from combined file
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs } from '@paw-registry/shared';
import { LoadingPage, LitterStatusBadge, EmptyState } from '@/components/ui';

export function LittersPage() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.litters.get().then(({ data }) => {
			if (data) setLitters(data as LitterWithDogs[]);
			setLoading(false);
		});
	}, []);

	if (loading) return <LoadingPage />;

	return (
		<div className="max-w-6xl mx-auto px-6 py-16">
			<div className="text-center mb-14">
				<h1 className="font-serif text-4xl font-bold text-stone-900 mb-3">Our litters</h1>
				<p className="text-stone-500 max-w-lg mx-auto">
					Planned and current litters from our health-tested breeding programme.
				</p>
			</div>

			{litters.length === 0 ? (
				<EmptyState icon="🐶" title="No litters listed right now" description="Check back soon, or apply to join our waitlist." />
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{litters.map((litter) => (
						<Link
							key={litter.id}
							to={`/litters/${litter.id}`}
							className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition-shadow"
						>
							<div className="h-48 bg-stone-100 flex items-center justify-center text-6xl">🐶</div>
							<div className="p-6">
								<div className="flex items-start justify-between mb-2">
									<h2 className="font-serif text-xl font-bold text-stone-900 group-hover:text-brand-600 transition-colors">
										{litter.name}
									</h2>
									<LitterStatusBadge status={litter.status} />
								</div>
								<p className="text-sm text-stone-500">
									{litter.sire?.name} × {litter.dam?.name}
								</p>
								{litter.expectedDate && !litter.whelpDate && (
									<p className="text-xs text-stone-400 mt-1">
										Expected {new Date(litter.expectedDate).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
									</p>
								)}
								{(litter.availableCount ?? 0) > 0 && (
									<p className="mt-3 text-sm font-medium text-brand-600">
										{litter.availableCount} available →
									</p>
								)}
							</div>
						</Link>
					))}
				</div>
			)}

			<div className="mt-16 bg-brand-50 border border-brand-200 rounded-2xl p-10 text-center">
				<h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">Join our waitlist</h2>
				<p className="text-stone-500 mb-6 text-sm max-w-md mx-auto">
					Litters fill quickly. Submit an application and we'll contact you when a suitable match becomes available.
				</p>
				<Link to="/apply" className="inline-block px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors">
					Apply now
				</Link>
			</div>
		</div>
	);
}
