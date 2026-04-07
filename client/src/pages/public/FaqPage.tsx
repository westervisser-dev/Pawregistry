import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';

interface FaqItem {
	question: string;
	answer: string | string[];
}

const waitlistStages = [
	{
		number: '1',
		title: 'Secured Waiting List',
		fee: 'R5,000 deposit',
		description:
			'These families have paid an upfront deposit for unborn puppies. They will be the first to be notified when puppies are born and will choose first from the litter.',
		priority: 'Highest priority',
	},
	{
		number: '2',
		title: 'Standard Waiting List',
		fee: 'R500 list fee',
		description:
			'If there are puppies still unspoken for after Stage 1, they are offered to the R500 waiting list. This is a second priority list, offered after the secured puppy families.',
		priority: 'Second priority',
	},
	{
		number: '3',
		title: 'Free Waiting List',
		fee: 'Free',
		description:
			'If puppies are still available after the first two stages, they are offered to the free waiting list. There is no fee — availability is posted and whoever enquires first gets priority.',
		priority: 'Third priority — first come, first served',
	},
];

const faqs: FaqItem[] = [
	{
		question: 'Who is the breeder?',
		answer: [
			'Our puppies come from carefully selected, small-scale home breeders who raise their dogs with love and intention.',
			'To protect our network and the integrity of Teddy Doodles, we do not disclose breeder details — this is part of our intellectual property and what makes TD unique.',
		],
	},
	{
		question: 'Can I go visit the puppy?',
		answer: [
			'Unfortunately not. Our breeders prioritise raising healthy, well-adjusted puppies in a calm environment.',
			'It\'s not in the puppies\' best interest to have multiple visitors coming in and out handling them, and our breeders also value their privacy.',
		],
	},
	{
		question: 'Where do I fetch the puppy?',
		answer: [
			'KZN: We arrange a controlled handover once your puppy is ready — ensuring they are fed, clean, and settled before you receive your little ball of fluff.',
			'JHB / CT: Collection may differ slightly, and we will guide you through the process and what to expect.',
		],
	},
	{
		question: 'How often do I get updates (photos & videos)?',
		answer: [
			'We pride ourselves on communication. You will receive regular updates as your puppy grows. We do our best to respond promptly even on weekends and public holidays — because we know how exciting this journey is.',
			'Please note: Getting puppies safely to you around 8 weeks involves careful logistics, so we appreciate realistic expectations.',
		],
	},
	{
		question: 'Can I video call the breeder?',
		answer: [
			'We manage all communication to ensure a smooth and protected experience. While direct calls with breeders are not standard, we provide plenty of videos, updates, and support so you always feel connected.',
		],
	},
	{
		question: 'How much does courier cost?',
		answer: [
			'Courier costs vary depending on availability and timing closest to 8 weeks. Transporting a puppy safely is a carefully coordinated process, and pricing differs between couriers.',
			'We charge a standard flat rate of R2,000. Please chat to us should you wish to arrange your own courier.',
		],
	},
	{
		question: 'Are your puppies KUSA registered?',
		answer: [
			'At Teddy Doodle, our focus is on raising exceptional companion dogs with outstanding temperaments, health, and early-life care.',
			'KUSA registration (Kennel Union of Southern Africa) applies specifically to recognised purebred dogs intended for showing or formal breeding programmes. As we specialise in carefully curated, small-scale bred companion puppies (including poodle mixes), KUSA registration is not applicable.',
			'What we prioritise instead: thoughtful pairing of parent dogs, the health and wellbeing of each puppy, early socialisation in a home environment, and matching each puppy to the right family and lifestyle.',
			'For most families, these factors are far more important than pedigree paperwork — as they directly impact your puppy\'s personality, adaptability, and overall experience in your home.',
			'We are always happy to guide you through our process and answer any questions, ensuring you feel completely confident in your decision.',
		],
	},
];

function FaqAccordion({ items }: { items: FaqItem[] }) {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	return (
		<div className="divide-y divide-warm-200 border border-warm-200 rounded-2xl overflow-hidden">
			{items.map((item, i) => {
				const isOpen = openIndex === i;
				return (
					<div key={i}>
						<button
							onClick={() => setOpenIndex(isOpen ? null : i)}
							className="w-full flex items-center justify-between px-6 py-5 text-left bg-white hover:bg-warm-50 transition-colors"
							aria-expanded={isOpen}
						>
							<span className="font-medium text-warm-900 text-sm pr-4">{item.question}</span>
							<span
								className={`flex-shrink-0 w-5 h-5 text-warm-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
								aria-hidden="true"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="m6 9 6 6 6-6" />
								</svg>
							</span>
						</button>
						<div
							className="overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
							style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr' }}
						>
							<div className="min-h-0">
								<div className="px-6 pb-5 bg-warm-50 border-t border-warm-100">
									{Array.isArray(item.answer) ? (
										<div className="flex flex-col gap-2 pt-4">
											{item.answer.map((para, j) => (
												<p key={j} className="text-sm text-warm-600 leading-relaxed">{para}</p>
											))}
										</div>
									) : (
										<p className="pt-4 text-sm text-warm-600 leading-relaxed">{item.answer}</p>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export function FaqPage() {
	usePageTitle('FAQ');

	return (
		<div>
			{/* Hero */}
			<section className="relative bg-warm-900 text-white py-16 md:py-24 overflow-hidden">
				<img
					src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1400&q=80&auto=format&fit=crop"
					srcSet="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=75&auto=format&fit=crop 800w, https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1400&q=80&auto=format&fit=crop 1400w"
					sizes="100vw"
					alt=""
					aria-hidden="true"
					decoding="async"
					className="absolute inset-0 w-full h-full object-cover object-center opacity-20"
				/>
				<div className="relative max-w-3xl mx-auto px-6 text-center">
					<span className="text-brand-300 text-sm font-medium uppercase tracking-widest">Got questions?</span>
					<h1 className="font-serif text-4xl md:text-5xl font-bold mt-3 mb-4">FAQ</h1>
					<p className="text-warm-300 text-lg leading-relaxed">
						Everything you need to know about our puppies, the process, and how the waiting list works.
					</p>
				</div>
			</section>

			{/* How the waiting list works */}
			<section className="max-w-3xl mx-auto px-6 py-12 md:py-20">
				<div className="mb-10">
					<h2 className="font-serif text-3xl text-warm-900 mb-3">How the Waiting List Works</h2>
					<p className="text-warm-500 text-sm leading-relaxed max-w-xl">
						Puppies are offered in three stages. Here's exactly how it works so you always know where you stand.
					</p>
				</div>

				<div className="flex flex-col gap-4 mb-10">
					{waitlistStages.map((stage) => (
						<div key={stage.number} className="bg-white border border-warm-200 rounded-2xl p-6 flex gap-5">
							<div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-serif font-bold text-lg flex items-center justify-center">
								{stage.number}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex flex-wrap items-center gap-2 mb-1">
									<h3 className="font-serif text-lg text-warm-900">{stage.title}</h3>
									<span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
										{stage.fee}
									</span>
								</div>
								<p className="text-sm text-warm-500 leading-relaxed mb-2">{stage.description}</p>
								<p className="text-xs font-medium text-warm-400 uppercase tracking-wide">{stage.priority}</p>
							</div>
						</div>
					))}
				</div>

				{/* Free list clarification callout */}
				<div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
					<h3 className="font-serif text-lg text-warm-900 mb-2">How the Free List Works</h3>
					<p className="text-sm text-warm-600 leading-relaxed mb-3">
						Being on the free list does <strong>not</strong> mean everyone ahead of you must say no first.
					</p>
					<p className="text-sm text-warm-600 leading-relaxed">
						Once availability is posted, whoever enquires first gets priority — it's based on <strong>response time</strong>, not your position on the list.
					</p>
				</div>
			</section>

			{/* General FAQ */}
			<section className="bg-warm-50 border-t border-warm-200 py-12 md:py-20">
				<div className="max-w-3xl mx-auto px-6">
					<div className="mb-10">
						<h2 className="font-serif text-3xl text-warm-900 mb-3">General Questions</h2>
						<p className="text-warm-500 text-sm leading-relaxed">
							Everything else you might want to know before you get started.
						</p>
					</div>
					<FaqAccordion items={faqs} />
					<div className="mt-8 text-center">
						<p className="text-sm text-warm-500">
							Still have questions?{' '}
							<a href="/apply" className="text-brand-600 hover:underline font-medium">
								Send us a message
							</a>{' '}
							and we'll get back to you.
						</p>
					</div>
				</div>
			</section>

			{/* Footer tagline */}
			<section className="bg-white border-t border-warm-200 py-10 text-center">
				<p className="text-warm-500 text-sm font-medium tracking-wide uppercase">
					Ethical · Personal · Premium — The Teddy Doodles Promise
				</p>
			</section>
		</div>
	);
}
