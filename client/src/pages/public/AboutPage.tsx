import { usePageTitle } from '@/hooks/usePageTitle';
import { APP_NAME } from '@/config/app';
export function AboutPage() {
	usePageTitle('About Us');

	return (
		<div className="max-w-3xl mx-auto px-6 py-12">
			<div className="rounded-2xl overflow-hidden mb-10 h-72 md:h-80 bg-warm-100">
				<img
					src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=900&q=85&auto=format&fit=crop"
					srcSet="https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&q=80&auto=format&fit=crop 600w, https://images.unsplash.com/photo-1552053831-71594a27632d?w=900&q=85&auto=format&fit=crop 900w"
					sizes="(max-width: 768px) 100vw, 720px"
					alt="A doodle puppy sitting on grass"
					loading="lazy"
					decoding="async"
					className="w-full h-full object-cover [object-position:50%_30%]"
				/>
			</div>

			<h1 className="font-serif text-4xl font-bold text-warm-900 mb-6">About Us</h1>

			<div className="space-y-5 text-warm-600 leading-relaxed">
				<p className="text-lg">
					We are a small, family-run breeding programme with a passion for producing
					healthy, well-tempered dogs that enrich the lives of the families they join.
				</p>
				<p>
					Every dog in our programme is health-tested, registered with the relevant
					kennel club, and raised in our home with early neurological stimulation
					and socialisation protocols. From birth, puppies are exposed to a wide
					range of sounds, textures, and experiences to set them up for confident,
					adaptable adult lives.
				</p>
				<p>
					We place puppies with careful consideration — our waitlist exists because
					we believe every puppy deserves the right home, not just the next available one.
					We take time to understand each family's lifestyle, experience, and expectations
					before making a match.
				</p>
				<p>
					Our breeding decisions are guided by health data, temperament, and conformation —
					never trends or demand. We aim to produce dogs that are as healthy as they
					are beautiful, and as gentle as they are resilient.
				</p>
			</div>

			{/* Values strip */}
			<div className="mt-12 grid grid-cols-3 gap-4 text-center">
				{[
					{ stat: 'OFA', label: 'Health tested on all breeding dogs' },
					{ stat: '100%', label: 'Kennel club registered litters' },
					{ stat: '∞', label: 'Lifetime breeder support' },
				].map(({ stat, label }) => (
					<div key={stat} className="bg-white border border-warm-200 rounded-xl p-5">
						<p className="font-serif text-2xl font-bold text-brand-500 mb-1">{stat}</p>
						<p className="text-xs text-warm-500 leading-snug">{label}</p>
					</div>
				))}
			</div>

			{/* Second image + quote */}
			<div className="mt-12 flex flex-col sm:flex-row gap-6 items-center">
				<div className="w-full sm:w-48 h-48 rounded-2xl overflow-hidden flex-shrink-0 bg-warm-100">
					<img
						src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=85&auto=format&fit=crop"
						alt="A happy doodle dog looking at the camera"
						loading="lazy"
						decoding="async"
						className="w-full h-full object-cover object-center"
					/>
				</div>
				<blockquote className="flex-1">
					<p className="font-serif text-xl text-warm-800 leading-relaxed italic mb-3">
						"We don't breed for volume. We breed for the families waiting at the end of the journey."
					</p>
					<cite className="text-sm text-warm-400 not-italic">— {APP_NAME}</cite>
				</blockquote>
			</div>
		</div>
	);
}
