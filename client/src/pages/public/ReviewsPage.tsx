import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { APP_NAME } from '@/config/app';

const reviews = [
	{
		name: 'Keilah',
		location: 'Cape Town',
		rating: 5,
		date: 'April 2026',
		avatar: '/avatars/keilah.png',
		body: "We are so happy with our adorable Maltipoo from Teddy Doodles. She arrived healthy, happy, and confident. Roxzee stayed in touch with us during the whole process, and her love for dogs was evident in every update she sent. It's clear she pours her heart into raising well-adjusted puppies, and we couldn't have asked for a better experience.",
		puppy: 'Maltipoo',
	},
	{
		name: 'Clerissa',
		location: 'Cape Town',
		rating: 5,
		date: 'April 2026',
		avatar: '/avatars/clerissa.png',
		body: "An absolutely wonderful experience with Teddy Doodles. Rox was incredible from start to finish — her communication was excellent and she kept us updated every step of the way. We received so many photos and updates as our puppy grew, which made the whole process feel really special and reassuring. You can truly see how much love and care goes into raising these puppies. We couldn't be happier with our little Aussie and would highly recommend Teddy Doodles to anyone looking for a well raised, happy pup.",
		puppy: 'Aussiedoodle',
	},
	{
		name: 'Liezel',
		location: 'Nelspruit',
		rating: 5,
		date: 'April 2026',
		avatar: '/avatars/liezel.png',
		body: "After hearing so many scam stories, I was nervous but Teddy Doodles came highly recommended. The whole process was smooth, with constant updates and amazing care throughout. Gigi is a beautiful little girl who has brought so much joy into our home. Thank you, Teddy Doodles!",
		puppy: null,
	},
	{
		name: 'Renne Augustus',
		location: null,
		rating: 5,
		date: 'January 2026',
		avatar: '/avatars/renne.png',
		body: "I just had to share how amazing Roxy from Teddy Doodles is! As a first-time pet owner, I had a million questions (and some were pretty silly, haha), and she answered them all with so much patience and care. She kept us updated with pics and vids of Milo (our adorable Shih Tzu ball of fluff!) before we even brought him home. Roxy's recommendations for the vet and groomer were spot on, and Milo's settled in like he's been with us forever. He's the feistiest, most intelligent little guy, and we ADORE him. If you're looking for a breeder who truly cares, Teddy Doodles is the way to go — our experience was stress-free and so joyful!",
		puppy: 'Shih Tzu',
	},
	{
		name: 'Victoria',
		location: null,
		rating: 5,
		date: 'September 2025',
		avatar: '/avatars/victoria.png',
		body: "I got my little Bella from Teddy Doodles and the whole experience was just wonderful. Everything was so easy, and I couldn't be happier with my sweet, healthy pup. Highly recommend Teddy Doodles!",
		puppy: null,
	},
	{
		name: 'Georgie',
		location: null,
		rating: 5,
		date: 'September 2025',
		avatar: '/avatars/georgie.png',
		body: "I can't say enough good things about Teddy Doodles! I got my gorgeous Cavalier boy, Tommy, from them and the whole experience was honestly a dream. Everything was made so simple — no stress, no hassle — just an exciting and smooth process from start to finish. Tommy is the sweetest little boy, healthy, playful, and already such a big part of our family. It was clear from the beginning how much care and love goes into raising these puppies. I felt so comfortable the whole way through, and I'd happily recommend Teddy Doodles to anyone looking for their perfect pup. Thank you for giving me my best little companion!",
		puppy: 'Cavalier Spaniel',
	},
	{
		name: '@paiegyy_babe',
		location: null,
		rating: 5,
		date: 'September 2025',
		avatar: '/avatars/paiegyyBabe.png',
		body: "I had such a wonderful experience with Teddy Doodles when buying my Cavalier Spaniel puppy. The whole process was so easy and stress-free. From the very first message, communication was clear and friendly, and I always felt reassured that my puppy was in the best hands. My little Cavalier is healthy, happy, and has the sweetest temperament — you can tell he was raised with so much love and care. I truly appreciate the honesty and professionalism throughout the process. I would 100% recommend Teddy Doodles to anyone looking for a well-bred, beautiful puppy. Thank you for making this such a positive and exciting experience!",
		puppy: 'Cavalier Spaniel',
	},
	{
		name: 'Tash',
		location: null,
		rating: 5,
		date: 'September 2025',
		avatar: '/avatars/tash.png',
		body: "I'm over the moon with my Cavalier boy, Kingston, from Teddy Doodles! From the very beginning, everything was so easy and straightforward — no confusion, no stress, just clear communication and such a friendly experience. Kingston is absolutely perfect — healthy, full of personality, and already so loved. You can tell he's come from a breeder who puts genuine care and heart into raising their puppies. I'm so grateful for the smooth process and for the beautiful boy I now get to call mine. I'll definitely recommend Teddy Doodles to anyone looking for their forever puppy!",
		puppy: 'Cavalier Spaniel',
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
			<section className="max-w-6xl mx-auto px-6 pt-14 pb-10 md:pt-20 md:pb-12">
				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{reviews.map((review) => (
						<article
							key={review.name}
							className="bg-white border border-warm-200 rounded-2xl p-6 flex flex-col gap-4"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-center gap-3">
									<img
										src={review.avatar}
										alt={review.name}
										className="w-10 h-10 rounded-full object-cover flex-shrink-0"
										loading="lazy"
										decoding="async"
									/>
									<div>
										<p className="font-medium text-warm-900 text-sm">{review.name}</p>
										{review.location && <p className="text-warm-400 text-xs mt-0.5">{review.location}</p>}
									</div>
								</div>
								<span className="text-xs text-warm-400 flex-shrink-0">{review.date}</span>
							</div>

							<StarRating count={review.rating} />

							<blockquote className="text-warm-600 text-sm leading-relaxed flex-1">
								"{review.body}"
							</blockquote>

							{review.puppy && (
								<div className="border-t border-warm-100 pt-3">
									<span className="inline-flex items-center gap-1.5 text-xs text-brand-600 font-medium bg-brand-50 px-2.5 py-1 rounded-full">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
											<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
										</svg>
										{review.puppy}
									</span>
								</div>
							)}
						</article>
					))}
				</div>
			</section>

			{/* CTA */}
			<section className="bg-warm-50 border-t border-warm-100">
				<div className="max-w-6xl mx-auto px-6 pt-8 pb-14 md:pt-10 md:pb-20 text-center">
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
