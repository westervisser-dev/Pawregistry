import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

export function FounderPage() {
	usePageTitle('Meet the Founder');

	return (
		<div>
			{/* Hero — image with text overlay */}
			<section className="relative overflow-hidden min-h-[85vh] flex items-end">
				<img
					src="/founder/rox-4.jpg"
					alt="Rox, founder of Teddy Doodles"
					loading="eager"
					decoding="async"
					className="absolute inset-0 w-full h-full object-cover object-center"
				/>
				{/* Gradient: dark at bottom-left, fades toward top-right */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/5" />

				<div className="relative w-full max-w-6xl mx-auto px-6 pb-12 md:pb-16">
					<div className="max-w-xl flex flex-col gap-5">
						<span className="text-white/60 text-xs font-medium uppercase tracking-[0.2em]">
							Meet the Founder
						</span>
						<h1 className="font-serif text-4xl md:text-5xl text-white leading-tight">
							The Heart Behind<br /> Teddy Doodles
						</h1>
						<p className="text-white/80 text-lg leading-relaxed">
							Hi, I'm Rox — the founder of Teddy Doodles, a mom of two, an interiors
							enthusiast, and a lifelong animal lover with a deep passion for matching
							the right puppies with the right families.
						</p>
						<div className="flex flex-col sm:flex-row gap-3 pt-1">
							<Link
								to="/apply"
								className="px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-400 transition-colors text-center"
							>
								Enquire Now
							</Link>
							<Link
								to="/litters"
								className="px-6 py-3 bg-white/15 text-white font-medium rounded-xl hover:bg-white/25 transition-colors text-center border border-white/20"
							>
								View Available Puppies
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Body copy + inline image */}
			<section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
				<div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10 md:gap-14 items-start">
					<div className="flex-1 space-y-5 text-warm-600 leading-relaxed">
						<p className="text-lg">
							"At Teddy Doodles, my approach has always been personal, honest, and
							welfare-led. I've always believed dogs make happy homes even happier,
							and creating this platform allowed me to combine that love with
							something meaningful.
						</p>
						<p className="text-lg">
							What matters most to me is doing things the right way — with no
							shortcuts, no pressure, and absolutely no support for unethical
							breeding. Teddy Doodles was built to offer families a more thoughtful,
							transparent, and special experience from first enquiry to homecoming.
						</p>
						<p className="text-lg">
							I work closely with carefully selected breeders and guide each family
							with care, honesty, and intention. It has never been about "selling
							puppies" — it has always been about creating the right match for both
							the family and the dog."
						</p>
						<p className="font-serif text-warm-500 text-xl italic pt-2">
							Real conversations. Real transparency. Real joy.
						</p>
					</div>
					<div className="rounded-2xl overflow-hidden bg-warm-100 aspect-[3/4]">
						<img
							src="/founder/rox-2.jpg"
							alt="Rox laughing with her dog"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover object-center"
						/>
					</div>
				</div>
			</section>

			{/* Photo mosaic */}
			<section className="max-w-6xl mx-auto px-6 pb-10 md:pb-14">
				{/* Desktop: 3-column mosaic */}
				<div className="hidden md:grid grid-cols-3 gap-4">
					{/* Full-width landscape — garden */}
					<div className="col-span-3 rounded-2xl overflow-hidden bg-warm-100 aspect-[21/9]">
						<img
							src="/founder/rox-3.jpg"
							alt="Rox relaxing in the garden with her dogs"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover object-center"
						/>
					</div>
					{/* Col 1: portrait — armchair, stretches to match right cell height */}
					<div className="rounded-2xl overflow-hidden bg-warm-100">
						<img
							src="/founder/rox-1.jpg"
							alt="Rox at home with her dogs"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover object-[50%_30%]"
						/>
					</div>
					{/* Col 2-3: garden with dogs */}
					<div className="col-span-2 rounded-2xl overflow-hidden bg-warm-100 aspect-[4/3]">
						<img
							src="/founder/rox-5.jpg"
							alt="Rox with her three dogs in the garden"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover object-[50%_70%]"
						/>
					</div>
				</div>

				{/* Mobile: simple stacked grid */}
				<div className="md:hidden grid grid-cols-2 gap-3">
					<div className="rounded-xl overflow-hidden aspect-[4/5] bg-warm-100 col-span-2">
						<img
							src="/founder/rox-3.jpg"
							alt="Rox relaxing in the garden with her dogs"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover object-center"
						/>
					</div>
					<div className="rounded-xl overflow-hidden aspect-square bg-warm-100">
						<img
							src="/founder/rox-1.jpg"
							alt="Rox at home with her dogs"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover object-[50%_30%]"
						/>
					</div>
					<div className="rounded-xl overflow-hidden aspect-square bg-warm-100">
						<img
							src="/founder/rox-5.jpg"
							alt="Rox with her three dogs in the garden"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover object-center"
						/>
					</div>
					<div className="rounded-xl overflow-hidden aspect-[4/5] bg-warm-100 col-span-2">
						<img
							src="/founder/rox-1.jpg"
							alt="Rox at home with her dogs"
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover object-[50%_30%]"
						/>
					</div>
				</div>
			</section>

			{/* Pullquote */}
			<section className="bg-warm-100/60 border-y border-warm-200/60">
				<div className="max-w-3xl mx-auto px-6 py-6 md:py-8 flex flex-col items-center text-center gap-3">
					<span className="text-brand-400 font-serif text-4xl leading-none select-none">"</span>
					<blockquote className="font-serif text-xl md:text-2xl text-warm-800 leading-snug max-w-xl">
						Dogs make happy homes even happier.
					</blockquote>
					<cite className="not-italic text-warm-400 text-xs uppercase tracking-[0.2em]">
						Rox, Founder
					</cite>
				</div>
			</section>

			<div className="h-8 bg-white" />

		</div>
	);
}
