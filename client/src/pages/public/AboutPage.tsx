import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { APP_NAME } from '@/config/app';

export function AboutPage() {
	usePageTitle('About Us');

	return (
		<div>
			{/* Hero */}
			<section className="relative bg-warm-900 text-white overflow-hidden">
				<img
					src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=1600&q=85&auto=format&fit=crop"
					srcSet="https://images.unsplash.com/photo-1552053831-71594a27632d?w=768&q=80&auto=format&fit=crop 768w, https://images.unsplash.com/photo-1552053831-71594a27632d?w=1200&q=85&auto=format&fit=crop 1200w, https://images.unsplash.com/photo-1552053831-71594a27632d?w=1600&q=85&auto=format&fit=crop 1600w"
					sizes="100vw"
					alt=""
					aria-hidden="true"
					decoding="async"
					className="absolute inset-0 w-full h-full object-cover [object-position:50%_30%] scale-105"
				/>
				<div className="absolute inset-0 bg-gradient-to-br from-warm-900/90 via-warm-800/80 to-brand-900/75" />
				<div className="relative max-w-6xl mx-auto px-6 py-20 md:py-36 flex flex-col items-start gap-5">
					<span className="text-brand-300 text-sm font-medium uppercase tracking-widest">
						Our Story
					</span>
					<h1 className="font-serif text-5xl md:text-6xl font-bold leading-tight max-w-2xl">
						More than a breeder.<br />A lifelong partner.
					</h1>
					<p className="text-warm-300 text-lg max-w-xl leading-relaxed">
						We connect families with the right puppy, in the right way — guided by ethics,
						transparency, and genuine care for every dog we place.
					</p>
				</div>
			</section>

			{/* Intro */}
			<section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
				<div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
					<div>
						<h2 className="font-serif text-3xl text-warm-900 mb-4">Why {APP_NAME}?</h2>
						<div className="space-y-4 text-warm-600 leading-relaxed">
							<p className="text-lg">
								At {APP_NAME}, we are more than just dog lovers — we are deeply committed
								to connecting families with the right puppy, in the right way.
							</p>
							<p className="text-lg">
								We specialise in Spaniels, Poodles, and Doodles — breeds known for their
								intelligence, gentle nature, and exceptional companionship. But what truly
								sets us apart is not just the puppies we place… it's how we do it.
							</p>
						</div>
					</div>
					<div className="rounded-2xl overflow-hidden h-72 md:h-80 bg-warm-100">
						<img
							src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=85&auto=format&fit=crop"
							alt="A happy doodle dog looking at the camera"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover object-center"
						/>
					</div>
				</div>
			</section>

			{/* A Different Approach */}
			<section className="bg-warm-50 border-y border-warm-100">
				<div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
					<div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
						<div>
							<span className="text-brand-500 text-sm font-medium uppercase tracking-widest">Our Approach</span>
							<h2 className="font-serif text-3xl text-warm-900 mt-2 mb-5">A Different Approach</h2>
							<div className="space-y-4 text-warm-600 leading-relaxed">
								<p className="text-lg font-medium text-warm-800">Teddy Doodles is not a marketplace.</p>
								<p className="text-lg">
									We offer a curated, guided experience, working exclusively with a carefully
									vetted network of ethical, small-scale breeders who raise their puppies in
									loving home environments.
								</p>
							</div>
						</div>
						<div>
							<div className="bg-white border border-warm-200 rounded-2xl p-6 flex flex-col gap-5">
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0 mt-0.5">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
											<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
										</svg>
									</div>
									<div>
										<p className="font-semibold text-warm-900">We do not support puppy mills. Ever.</p>
										<p className="text-warm-500 text-sm mt-1 leading-relaxed">
											If we come across unethical breeding practices, we report them — full stop.
										</p>
									</div>
								</div>
								<div className="border-t border-warm-100 pt-5 flex items-start gap-4">
									<div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0 mt-0.5">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
											<circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
										</svg>
									</div>
									<div>
										<p className="font-semibold text-warm-900">Rigorously vetted breeders</p>
										<p className="text-warm-500 text-sm mt-1 leading-relaxed">
											Every breeder in our network is assessed for health testing, living conditions, and genuine care.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Mission */}
			<section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
				<div className="grid md:grid-cols-2 gap-10 md:gap-20 items-start">
					<div className="bg-warm-900 text-white rounded-2xl p-6 order-2 md:order-1">
						<p className="text-warm-300 text-xs uppercase tracking-widest font-medium mb-3">Honest Matching, Not Selling</p>
						<div className="space-y-2 text-warm-300 text-sm leading-relaxed mb-5">
							<p>We are not here to "sell puppies." Because of that, we can be completely transparent.</p>
							<p>If a puppy is not the right fit for your home, lifestyle, or expectations — we will tell you.</p>
						</div>
						<div className="border-t border-warm-700 pt-4">
							<p className="text-warm-400 text-xs uppercase tracking-widest mb-3">Our priority is simple</p>
							<div className="flex flex-col gap-2">
								<div className="flex items-center gap-3">
									<span className="text-brand-400 text-xl font-bold leading-none">→</span>
									<span className="font-serif text-lg text-white">The wellbeing of the dog</span>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-brand-400 text-xl font-bold leading-none">→</span>
									<span className="font-serif text-lg text-white">The happiness of the family</span>
								</div>
							</div>
						</div>
					</div>

					<div className="order-1 md:order-2">
						<h2 className="font-serif text-3xl text-warm-900 mb-3">Welfare First. Always.</h2>
						<p className="text-warm-500 leading-relaxed mb-6">Our mission goes far beyond puppies. We are passionate about:</p>
						<ul className="space-y-3 mb-6">
							{[
								'Responsible, ethical breeding practices',
								'Protecting dogs from exploitation and abuse',
								'Supporting retired moms and dogs needing homes',
								'Educating families to make informed, responsible choices',
							].map((item) => (
								<li key={item} className="flex items-start gap-3 text-warm-600">
									<span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-400 flex-shrink-0" />
									<span>{item}</span>
								</li>
							))}
						</ul>
						<p className="font-medium text-warm-800">We believe in welfare over profit — always.</p>
					</div>
				</div>
			</section>

			{/* Experience */}
			<section className="bg-warm-50 border-y border-warm-100">
				<div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
					<div className="mb-6">
						<h2 className="font-serif text-3xl text-warm-900 mb-3">The {APP_NAME} Experience</h2>
						<p className="text-warm-500 text-sm max-w-md leading-relaxed">
							From the very first conversation to the day your puppy comes home, we walk the journey with you.
						</p>
					</div>
					<div className="grid sm:grid-cols-2 gap-4">
						{[
							{
								icon: (
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
										<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
									</svg>
								),
								title: 'Personalised Guidance',
								body: 'We get to know you, your lifestyle, and your expectations before recommending any puppy.',
							},
							{
								icon: (
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
										<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3L14.5 4z" /><circle cx="12" cy="13" r="3" />
									</svg>
								),
								title: 'Regular Updates',
								body: 'Receive photos, videos, and milestone updates as your puppy grows — so the bond begins before you even meet.',
							},
							{
								icon: (
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
										<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
									</svg>
								),
								title: 'Practical Advice',
								body: 'Expert guidance on nutrition, sleep routines, potty training, and settling your puppy into their new home.',
							},
							{
								icon: (
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
										<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
									</svg>
								),
								title: 'Ongoing Support',
								body: "We are here whenever you need reassurance — whether it's week one or year three.",
							},
						].map((item) => (
							<div key={item.title} className="bg-white border border-warm-200 rounded-2xl p-6">
								<div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-4">
									{item.icon}
								</div>
								<h3 className="font-medium text-warm-900 mb-2">{item.title}</h3>
								<p className="text-warm-500 text-sm leading-relaxed">{item.body}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="max-w-6xl mx-auto px-6 pt-8 pb-16 md:pt-10 md:pb-24">
				<div className="text-center max-w-2xl mx-auto">
					<blockquote className="mb-8">
						<p className="font-serif text-2xl md:text-3xl text-warm-800 leading-relaxed italic mb-4">
							"We are here for the entire journey — and beyond."
						</p>
						<cite className="text-sm text-warm-400 not-italic">— {APP_NAME}</cite>
					</blockquote>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							to="/apply"
							className="px-6 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-400 transition-colors"
						>
							Start Your Application
						</Link>
						<Link
							to="/litters"
							className="px-6 py-3 bg-warm-100 text-warm-800 font-medium rounded-lg hover:bg-warm-200 transition-colors"
						>
							View Available Litters
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
