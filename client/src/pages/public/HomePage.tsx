import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LitterStatusBadge } from '@/components/ui';
import type { LitterWithDogs } from '@paw-registry/shared';

export function HomePage() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);

	useEffect(() => {
		api.litters.get().then(({ data }) => {
			if (data) setLitters(data as LitterWithDogs[]);
		});
	}, []);

	return (
		<div>
			{/* Hero */}
			<section className="relative bg-stone-900 text-white overflow-hidden">
				<img
					src="https://images.unsplash.com/photo-1575859431774-2e57ed632664?w=1600&q=85&auto=format&fit=crop"
					alt=""
					aria-hidden="true"
					className="absolute inset-0 w-full h-full object-cover object-center scale-105"
				/>
				<div className="absolute inset-0 bg-gradient-to-br from-stone-900/90 via-stone-800/80 to-brand-900/75" />
				<div className="relative max-w-6xl mx-auto px-6 py-32 flex flex-col items-start gap-6">
					<span className="text-brand-300 text-sm font-medium uppercase tracking-widest">
						Thoughtful Breeding
					</span>
					<h1 className="font-serif text-5xl md:text-6xl font-bold leading-tight max-w-2xl">
						Raised with love.<br />Placed with care.
					</h1>
					<p className="text-stone-300 text-lg max-w-xl leading-relaxed">
						We breed healthy, well-socialised dogs from health-tested parents with
						verified pedigrees. Every puppy comes with lifetime breeder support.
					</p>
					<div className="flex gap-4 mt-2">
						<Link
							to="/litters"
							className="px-6 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-400 transition-colors"
						>
							View Litters
						</Link>
						<Link
							to="/apply"
							className="px-6 py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/20"
						>
							Apply for a Puppy
						</Link>
					</div>
				</div>
			</section>


			{/* Why us */}
			<section className="max-w-6xl mx-auto px-6 py-20">
				<h2 className="font-serif text-3xl font-bold text-stone-900 text-center mb-12">
					Our Commitment
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{[
						{
							icon: '🔬',
							title: 'Health Tested',
							body: 'All breeding dogs undergo comprehensive health screening including OFA hips, elbows, eyes, heart, and DNA panels.',
						},
						{
							icon: '🌳',
							title: 'Verified Pedigrees',
							body: 'Multi-generation pedigrees documented and verifiable. Every dog registered with the relevant kennel club.',
						},
						{
							icon: '🤝',
							title: 'Lifetime Support',
							body: 'We remain available to every family throughout the life of your dog. Our relationship doesn\'t end at placement.',
						},
					].map(({ icon, title, body }) => (
						<div key={title} className="flex flex-col items-start gap-4 p-6 bg-white rounded-xl border border-stone-200">
							<span className="text-3xl">{icon}</span>
							<h3 className="font-serif text-lg font-bold text-stone-900">{title}</h3>
							<p className="text-stone-600 text-sm leading-relaxed">{body}</p>
						</div>
					))}
				</div>
			</section>

			{/* Current litters */}
			{litters.length > 0 && (
				<section className="bg-brand-50 py-20">
					<div className="max-w-6xl mx-auto px-6">
						<div className="flex items-center justify-between mb-10">
							<h2 className="font-serif text-3xl font-bold text-stone-900">Current Litters</h2>
							<Link to="/litters" className="text-brand-600 text-sm font-medium hover:underline">
								View all →
							</Link>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{litters.slice(0, 3).map((litter) => (
								<Link
									key={litter.id}
									to={`/litters/${litter.id}`}
									className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
								>
									<div className="h-40 bg-stone-100 flex items-center justify-center text-4xl">
										🐶
									</div>
									<div className="p-5">
										<div className="flex items-start justify-between mb-2">
											<h3 className="font-medium text-stone-900">{litter.name}</h3>
											<LitterStatusBadge status={litter.status} />
										</div>
										<p className="text-sm text-stone-500">
											{litter.sire?.name} × {litter.dam?.name}
										</p>
										{litter.availableCount != null && litter.availableCount > 0 && (
											<p className="text-sm text-brand-600 font-medium mt-2">
												{litter.availableCount} puppy{litter.availableCount !== 1 ? 'ies' : ''} available
											</p>
										)}
									</div>
								</Link>
							))}
						</div>
					</div>
				</section>
			)}

			{/* CTA */}
			<section className="max-w-6xl mx-auto px-6 py-20 text-center">
				<h2 className="font-serif text-3xl font-bold text-stone-900 mb-4">
					Ready to apply?
				</h2>
				<p className="text-stone-500 mb-8 max-w-md mx-auto">
					Fill in our puppy application and we'll be in touch to discuss
					which litter might be a good fit.
				</p>
				<Link
					to="/apply"
					className="inline-block px-8 py-4 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors"
				>
					Submit an Application
				</Link>
			</section>
		</div>
	);
}
