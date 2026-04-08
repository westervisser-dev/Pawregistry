import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { APP_NAME } from '@/config/app';

const reviews = [
	{
		name: 'Sarah & James T.',
		location: 'London',
		rating: 5,
		date: 'March 2025',
		body: "From the very first conversation we knew we were in the right hands. The team was patient, incredibly knowledgeable, and never once made us feel rushed. Our Cockapoo, Milo, has been the most wonderful addition to our family. We still get check-in messages months later — that kind of care is rare.",
		puppy: 'Cockapoo',
	},
	{
		name: 'Emily R.',
		location: 'Manchester',
		rating: 5,
		date: 'January 2025',
		body: "I was nervous about the whole process but the team made it so smooth. We received regular photo and video updates as our puppy grew, which was magical. She matched us with exactly the right puppy for our lifestyle. Our little Bonnie is now 5 months old and absolutely perfect.",
		puppy: 'Cavapoo',
	},
	{
		name: 'The Morrison Family',
		location: 'Edinburgh',
		rating: 5,
		date: 'November 2024',
		body: "What sets Teddy Doodles apart is the honesty. We were told upfront what to expect — the good and the challenging — which helped us prepare properly. The breeder was vetted, the puppy was healthy, and the support didn't end at collection. We couldn't be happier.",
		puppy: 'Labradoodle',
	},
	{
		name: 'Daniel & Priya K.',
		location: 'Bristol',
		rating: 5,
		date: 'October 2024',
		body: "We had tried another route before and had a terrible experience. Coming to Teddy Doodles was a breath of fresh air. Every question was answered thoroughly, every concern was taken seriously. Our boy Archie is now 8 months old, healthy, and impossibly happy.",
		puppy: 'Goldendoodle',
	},
	{
		name: 'Louise H.',
		location: 'Birmingham',
		rating: 5,
		date: 'August 2024',
		body: "The personalised matching process is unlike anything I expected. They really listened to my living situation and recommended a breed that suited me perfectly — not just what was available. Luna has transformed my life. I tell everyone about Teddy Doodles.",
		puppy: 'Miniature Poodle',
	},
	{
		name: 'Tom & Claire B.',
		location: 'Leeds',
		rating: 5,
		date: 'June 2024',
		body: "From application to collection, every step was transparent and stress-free. The updates we received while waiting were so thoughtful — we fell in love with our puppy weeks before we even met him. The ongoing support has been brilliant. Highly, highly recommend.",
		puppy: 'Spoodle',
	},
];

function StarRating({ count }: { count: number }) {
	return (
		<div className="flex items-center gap-0.5" aria-label={`${count} out of 5 stars`}>
			{Array.from({ length: 5 }).map((_, i) => (
				<svg
					key={i}
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill={i < count ? 'currentColor' : 'none'}
					stroke="currentColor"
					strokeWidth="1.5"
					className={i < count ? 'text-amber-400' : 'text-warm-300'}
					aria-hidden="true"
				>
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
			))}
		</div>
	);
}

export function ReviewsPage() {
	usePageTitle('Our Reviews');

	return (
		<div>
			{/* Hero */}
			<section className="relative bg-warm-900 text-white overflow-hidden">
				<img
					src="/reviews-hero.avif"
					alt=""
					aria-hidden="true"
					decoding="async"
					className="absolute inset-0 w-full h-full object-cover [object-position:50%_40%] scale-105"
				/>
				<div className="absolute inset-0 bg-gradient-to-br from-warm-900/69 via-warm-800/62 to-brand-900/58" />
				<div className="relative max-w-6xl mx-auto px-6 py-20 md:py-36 flex flex-col items-start gap-5">
					<span className="text-brand-300 text-sm font-medium uppercase tracking-widest">
						What Families Say
					</span>
					<h1 className="font-serif text-5xl md:text-6xl font-bold leading-tight max-w-2xl">
						Stories from our families.
					</h1>
					<p className="text-warm-300 text-lg max-w-xl leading-relaxed">
						Every puppy we place becomes part of a family. Here is what some of those families have shared about their {APP_NAME} experience.
					</p>
					{/* Rating summary */}
					<div className="flex items-center gap-4 mt-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4">
						<div className="text-center">
							<p className="font-serif text-4xl font-bold text-white">5.0</p>
							<div className="flex justify-center mt-1">
								<StarRating count={5} />
							</div>
						</div>
						<div className="w-px h-10 bg-white/20" />
						<div>
							<p className="text-white font-medium text-sm">Consistently 5-star rated</p>
							<p className="text-warm-300 text-sm mt-0.5">Across all families we've placed</p>
						</div>
					</div>
				</div>
			</section>

			{/* Reviews grid */}
			<section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{reviews.map((review) => (
						<article
							key={review.name}
							className="bg-white border border-warm-200 rounded-2xl p-6 flex flex-col gap-4"
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium text-warm-900 text-sm">{review.name}</p>
									<p className="text-warm-400 text-xs mt-0.5">{review.location}</p>
								</div>
								<span className="text-xs text-warm-400 flex-shrink-0">{review.date}</span>
							</div>

							<StarRating count={review.rating} />

							<blockquote className="text-warm-600 text-sm leading-relaxed flex-1">
								"{review.body}"
							</blockquote>

							<div className="border-t border-warm-100 pt-3">
								<span className="inline-flex items-center gap-1.5 text-xs text-brand-600 font-medium bg-brand-50 px-2.5 py-1 rounded-full">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
										<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
									</svg>
									{review.puppy}
								</span>
							</div>
						</article>
					))}
				</div>
			</section>

			{/* CTA */}
			<section className="bg-warm-50 border-t border-warm-100">
				<div className="max-w-6xl mx-auto px-6 py-14 md:py-20 text-center">
					<h2 className="font-serif text-3xl md:text-4xl text-warm-900 mb-4">
						Ready to start your journey?
					</h2>
					<p className="text-warm-500 max-w-md mx-auto mb-8 leading-relaxed">
						Join the families who have found their perfect puppy through {APP_NAME}. We would love to guide you through the process.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							to="/apply"
							className="px-6 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-400 transition-colors"
						>
							Start Your Application
						</Link>
						<Link
							to="/contact"
							className="px-6 py-3 bg-warm-100 text-warm-800 font-medium rounded-lg hover:bg-warm-200 transition-colors"
						>
							Get in Touch
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
