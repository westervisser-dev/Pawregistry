import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LitterStatusBadge } from '@/components/ui';
import type { LitterWithDogs } from '@paw-registry/shared';

export function HomePage() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);
	const [littersLoading, setLittersLoading] = useState(true);

	useEffect(() => {
		api.litters.get().then(({ data }) => {
			if (data) setLitters(data as LitterWithDogs[]);
			setLittersLoading(false);
		});
	}, []);

	useEffect(() => {
		document.title = 'Paw Registry — Thoughtful Dog Breeding';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	return (
		<div>
			{/* Hero */}
			<section className="relative bg-warm-900 text-white overflow-hidden">
				<img
					src="https://images.unsplash.com/photo-1575859431774-2e57ed632664?w=1600&q=85&auto=format&fit=crop"
					srcSet="https://images.unsplash.com/photo-1575859431774-2e57ed632664?w=768&q=80&auto=format&fit=crop 768w, https://images.unsplash.com/photo-1575859431774-2e57ed632664?w=1200&q=85&auto=format&fit=crop 1200w, https://images.unsplash.com/photo-1575859431774-2e57ed632664?w=1600&q=85&auto=format&fit=crop 1600w"
					sizes="100vw"
					alt=""
					aria-hidden="true"
					decoding="async"
					className="absolute inset-0 w-full h-full object-cover object-center scale-105"
				/>
				<div className="absolute inset-0 bg-gradient-to-br from-warm-900/90 via-warm-800/80 to-brand-900/75" />
				<div className="relative max-w-6xl mx-auto px-6 py-16 md:py-32 flex flex-col items-start gap-6">
					<span className="text-brand-300 text-sm font-medium uppercase tracking-widest">
						Thoughtful Breeding
					</span>
					<h1 className="font-serif text-5xl md:text-6xl font-bold leading-tight max-w-2xl">
						Raised with love.<br />Placed with care.
					</h1>
					<p className="text-warm-300 text-lg max-w-xl leading-relaxed">
						We breed healthy, well-socialised dogs from health-tested parents with
						verified pedigrees. Every puppy comes with lifetime breeder support.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 mt-2">
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
				<h2 className="font-serif text-3xl text-warm-900 mb-14">
					Our Commitment
				</h2>
				<div>
					{[
						{
							num: '01',
							icon: '🔬',
							title: 'Health Tested',
							body: 'All breeding dogs undergo comprehensive health screening including OFA hips, elbows, eyes, heart, and DNA panels.',
						},
						{
							num: '02',
							icon: '🌳',
							title: 'Verified Pedigrees',
							body: 'Multi-generation pedigrees documented and verifiable. Every dog registered with the relevant kennel club.',
						},
						{
							num: '03',
							icon: '🤝',
							title: 'Lifetime Support',
							body: 'We remain available to every family throughout the life of your dog. Our relationship doesn\'t end at placement.',
						},
					].map(({ num, icon, title, body }) => (
						<div key={title} className="flex gap-6 md:gap-12 py-10 border-t border-warm-200 last:border-b items-start">
							<span className="font-serif text-[42px] leading-none text-warm-300 shrink-0 w-14 select-none" aria-hidden="true">{num}</span>
							<div className="flex-1 flex flex-col md:flex-row md:items-start md:gap-12">
								<div className="flex items-center gap-3 mb-3 md:mb-0 md:w-52 shrink-0">
									<span className="text-xl" aria-hidden="true">{icon}</span>
									<h3 className="font-serif text-xl text-warm-900">{title}</h3>
								</div>
								<p className="text-warm-500 text-sm leading-relaxed">{body}</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Dogs teaser */}
			<section className="bg-warm-50 border-t border-warm-100">
				<div className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row gap-10 items-center">
					<div className="w-full md:w-1/2 rounded-2xl overflow-hidden aspect-[4/3] flex-shrink-0">
						<img
							src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=85&auto=format&fit=crop"
							srcSet="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80&auto=format&fit=crop 600w, https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=85&auto=format&fit=crop 800w"
							sizes="(max-width: 768px) 100vw, 50vw"
							alt="A happy doodle dog"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover"
						/>
					</div>
					<div>
						<span className="text-brand-400 text-xs font-semibold uppercase tracking-widest mb-3 block">Our dogs</span>
						<h2 className="font-serif text-3xl font-bold text-warm-900 mb-3 leading-tight">
							Health-tested.<br />Temperament-first.
						</h2>
						<p className="text-warm-500 leading-relaxed mb-6 text-sm max-w-sm">
							Every dog in our programme is OFA-screened and registered. Browse our breeding dogs and learn about the lines behind every litter.
						</p>
						<Link
							to="/dogs"
							className="inline-block px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium text-sm"
						>
							Meet our dogs
						</Link>
					</div>
				</div>
			</section>

			{/* Current litters */}
			{(littersLoading || litters.length > 0) && (
				<section className="bg-brand-50 py-20">
					<div className="max-w-6xl mx-auto px-6">
						<div className="flex items-center justify-between mb-10">
							<h2 className="font-serif text-3xl font-bold text-warm-900">Current Litters</h2>
							<Link to="/litters" className="text-brand-600 text-sm font-medium hover:underline">
								View all →
							</Link>
						</div>
						{littersLoading ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{[1, 2, 3].map((n) => (
									<div key={n} className="bg-white rounded-xl border border-warm-200 p-5 animate-pulse">
										<div className="flex items-start justify-between mb-3">
											<div className="h-4 bg-warm-200 rounded w-2/3" />
											<div className="h-5 bg-warm-100 rounded-full w-16" />
										</div>
										<div className="h-3 bg-warm-100 rounded w-1/2" />
									</div>
								))}
							</div>
						) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{litters.slice(0, 3).map((litter) => (
								<Link
									key={litter.id}
									to={`/litters/${litter.id}`}
									className="bg-white rounded-xl border border-warm-200 overflow-hidden hover:shadow-md transition-shadow"
								>
										<div className="p-5">
										<div className="flex items-start justify-between mb-2">
											<h3 className="font-medium text-warm-900">{litter.name}</h3>
											<LitterStatusBadge status={litter.status} />
										</div>
										<p className="text-sm text-warm-500">
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
						)}
					</div>
				</section>
			)}

			{/* CTA */}
			<section className="relative overflow-hidden bg-brand-50 border-t border-brand-100">
				<img
					src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400&q=80&auto=format&fit=crop"
					srcSet="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=75&auto=format&fit=crop 800w, https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400&q=80&auto=format&fit=crop 1400w"
					sizes="100vw"
					alt=""
					aria-hidden="true"
					loading="lazy"
					decoding="async"
					className="absolute inset-0 w-full h-full object-cover object-center opacity-10"
				/>
				<div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
					<h2 className="font-serif text-3xl md:text-4xl font-bold text-warm-900 mb-4">
						Ready to apply?
					</h2>
					<p className="text-warm-500 mb-8 max-w-md mx-auto leading-relaxed">
						Fill in our puppy application and we'll be in touch to discuss
						which litter might be a good fit.
					</p>
					<Link
						to="/apply"
						className="inline-block px-8 py-4 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors"
					>
						Submit an Application
					</Link>
				</div>
			</section>
		</div>
	);
}
