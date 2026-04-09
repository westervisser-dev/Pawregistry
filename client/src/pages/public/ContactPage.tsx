import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_WHATSAPP, CONTACT_INSTAGRAM } from '@/config/app';

function WhatsAppIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
			<path d="M12 0C5.374 0 0 5.373 0 12c0 2.116.554 4.103 1.523 5.828L.057 23.428a.75.75 0 0 0 .915.915l5.67-1.47A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.713 9.713 0 0 1-4.953-1.355l-.355-.21-3.664.95.974-3.58-.23-.368A9.713 9.713 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
		</svg>
	);
}

function InstagramIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
		</svg>
	);
}

function EmailIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
			<rect width="20" height="16" x="2" y="4" rx="2" />
			<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
		</svg>
	);
}

function PhoneIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
			<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.76 16l.16.92z" />
		</svg>
	);
}

interface ContactCardProps {
	icon: React.ReactNode;
	platform: string;
	description: string;
	value: string;
	href: string;
	buttonLabel: string;
	iconBg: string;
	iconColor: string;
	buttonBg: string;
	buttonText: string;
	buttonHover: string;
	accentBorder: string;
}

function ContactCard({ icon, platform, description, value, href, buttonLabel, iconBg, iconColor, buttonBg, buttonText, buttonHover, accentBorder }: ContactCardProps) {
	return (
		<div className={`bg-white rounded-2xl border border-warm-200 overflow-hidden flex flex-col`}>
			<div className={`h-1 ${accentBorder}`} />
			<div className="p-6 flex flex-col flex-1">
				<div className={`w-12 h-12 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center mb-4`}>
					{icon}
				</div>
				<h3 className="font-semibold text-warm-900 text-base mb-1">{platform}</h3>
				<p className="text-warm-500 text-sm leading-relaxed mb-4 flex-1">{description}</p>
				{value ? (
					<>
						<p className="text-warm-700 text-sm font-medium mb-3 break-all">{value}</p>
						<a
							href={href}
							target={href.startsWith('http') ? '_blank' : undefined}
							rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
							className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${buttonBg} ${buttonText} ${buttonHover}`}
						>
							{buttonLabel}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
								<path d="M5 12h14M12 5l7 7-7 7" />
							</svg>
						</a>
					</>
				) : (
					<span className="text-warm-400 text-sm italic">Coming soon</span>
				)}
			</div>
		</div>
	);
}

export function ContactPage() {
	usePageTitle('Contact Us');

	const whatsappHref = CONTACT_WHATSAPP
		? `https://wa.me/${CONTACT_WHATSAPP.replace(/\D/g, '')}`
		: '';
	const instagramHref = CONTACT_INSTAGRAM
		? `https://instagram.com/${CONTACT_INSTAGRAM.replace('@', '')}`
		: '';

	return (
		<div>
			{/* Hero */}
			<section className="relative bg-warm-900 text-white py-20 md:py-28 overflow-hidden">
				<img
					src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400&q=80&auto=format&fit=crop"
					srcSet="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=75&auto=format&fit=crop 800w, https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400&q=80&auto=format&fit=crop 1400w"
					sizes="100vw"
					alt=""
					aria-hidden="true"
					decoding="async"
					className="absolute inset-0 w-full h-full object-cover object-center opacity-20"
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-warm-900/40 to-warm-900/80" aria-hidden="true" />
				<div className="relative max-w-3xl mx-auto px-6 text-center">
					<span className="inline-block text-brand-300 text-xs font-semibold uppercase tracking-[0.2em] mb-4">We'd love to hear from you</span>
					<h1 className="font-serif text-4xl md:text-6xl font-bold mt-2 mb-5 leading-tight">Get in Touch</h1>
					<p className="text-warm-300 text-lg leading-relaxed max-w-xl mx-auto">
						Whether you have questions, need guidance, or just want to say hello — reach us on any of the channels below.
					</p>
				</div>
			</section>

			{/* Contact cards */}
			<section className="max-w-5xl mx-auto px-6 py-14 md:py-20">
				<div className="text-center mb-10">
					<h2 className="font-serif text-2xl md:text-3xl text-warm-900 mb-2">How to reach us</h2>
					<p className="text-warm-500 text-sm">Pick whichever channel works best for you — we're quick to respond on all of them.</p>
				</div>

				{/* Top row: social platforms */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
					<ContactCard
						platform="WhatsApp"
						description="Chat with us directly for quick questions and updates. We're usually very responsive."
						icon={<WhatsAppIcon />}
						value={CONTACT_WHATSAPP}
						href={whatsappHref}
						buttonLabel="Chat on WhatsApp"
						iconBg="bg-emerald-50"
						iconColor="text-emerald-600"
						buttonBg="bg-emerald-500"
						buttonText="text-white"
						buttonHover="hover:bg-emerald-600"
						accentBorder="bg-emerald-500"
					/>
					<ContactCard
						platform="Instagram"
						description="Follow us for puppy photos, litter updates, and a look at everyday life at our home."
						icon={<InstagramIcon />}
						value={CONTACT_INSTAGRAM}
						href={instagramHref}
						buttonLabel="Follow on Instagram"
						iconBg="bg-pink-50"
						iconColor="text-pink-600"
						buttonBg="bg-gradient-to-r from-pink-500 to-rose-500"
						buttonText="text-white"
						buttonHover="hover:from-pink-600 hover:to-rose-600"
						accentBorder="bg-gradient-to-r from-pink-500 to-rose-500"
					/>
				</div>

				{/* Bottom row: direct contact */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
					<ContactCard
						platform="Email"
						description="Drop us an email and we'll get back to you as soon as possible — usually the same day."
						icon={<EmailIcon />}
						value={CONTACT_EMAIL}
						href={CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : ''}
						buttonLabel="Send an Email"
						iconBg="bg-brand-50"
						iconColor="text-brand-600"
						buttonBg="bg-brand-500"
						buttonText="text-white"
						buttonHover="hover:bg-brand-600"
						accentBorder="bg-brand-500"
					/>
					<ContactCard
						platform="Phone"
						description="Prefer to talk? Give us a call during the day and we'll be happy to chat."
						icon={<PhoneIcon />}
						value={CONTACT_PHONE}
						href={CONTACT_PHONE ? `tel:${CONTACT_PHONE.replace(/\s/g, '')}` : ''}
						buttonLabel="Call Us"
						iconBg="bg-amber-50"
						iconColor="text-amber-600"
						buttonBg="bg-amber-500"
						buttonText="text-white"
						buttonHover="hover:bg-amber-600"
						accentBorder="bg-amber-500"
					/>
				</div>
			</section>

			{/* Response time banner */}
			<section className="bg-brand-500 text-white">
				<div className="max-w-5xl mx-auto px-6 py-8 md:py-10 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
					<div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
					</div>
					<div>
						<h3 className="font-semibold text-lg mb-1">We aim to respond promptly</h3>
						<p className="text-brand-100 text-sm leading-relaxed">
							Even on weekends and public holidays — we know how exciting this journey is and we don't want to keep you waiting.
						</p>
					</div>
				</div>
			</section>

			{/* What to include */}
			<section className="bg-warm-50 border-y border-warm-100">
				<div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
					<div className="text-center mb-10">
						<h2 className="font-serif text-2xl md:text-3xl text-warm-900 mb-2">What to include in your message</h2>
						<p className="text-warm-500 text-sm leading-relaxed max-w-md mx-auto">
							To help us assist you quickly, it helps to share a little context upfront.
						</p>
					</div>
					<ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{[
							{ num: '01', title: 'Your name and location', detail: "Province helps us know what's nearby." },
							{ num: '02', title: 'Breed or type of puppy', detail: "Let us know which breed you're interested in." },
							{ num: '03', title: 'Your timeline', detail: 'When are you hoping to bring a puppy home?' },
							{ num: '04', title: 'Any questions or concerns', detail: "No question is too small — we're here to help." },
						].map((item) => (
							<li key={item.title} className="bg-white border border-warm-200 rounded-xl p-5 flex items-start gap-4">
								<span className="text-brand-300 font-serif text-xl font-bold leading-none flex-shrink-0 mt-0.5">{item.num}</span>
								<div>
									<p className="text-warm-800 text-sm font-semibold mb-0.5">{item.title}</p>
									<p className="text-warm-500 text-sm leading-relaxed">{item.detail}</p>
								</div>
							</li>
						))}
					</ul>
				</div>
			</section>

			{/* CTA */}
			<section className="max-w-3xl mx-auto px-6 pt-10 pb-16 md:pt-14 md:pb-20 text-center">
				<h2 className="font-serif text-2xl md:text-3xl text-warm-900 mb-3">Ready to get started?</h2>
				<p className="text-warm-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
					If you already know you'd like to apply, you can go straight to our application — we'll be in touch from there.
				</p>
				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<Link
						to="/apply"
						className="px-7 py-3.5 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-400 transition-colors text-sm"
					>
						Start Your Application
					</Link>
					<Link
						to="/faq"
						className="px-7 py-3.5 bg-warm-100 text-warm-800 font-medium rounded-xl hover:bg-warm-200 transition-colors text-sm"
					>
						Read the FAQ
					</Link>
				</div>
				<p className="mt-10 text-warm-400 text-xs">
					{APP_NAME} · Thoughtful, ethical breeding with a lifelong commitment to every puppy we place.
				</p>
			</section>
		</div>
	);
}
