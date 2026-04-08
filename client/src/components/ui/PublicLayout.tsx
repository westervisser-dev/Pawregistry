import { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_WHATSAPP, CONTACT_INSTAGRAM, CONTACT_FACEBOOK } from '@/config/app';

const navLinks = [
	// { to: '/dogs', label: 'Our Dogs' }, // TODO: restore when breed pages are ready
	{ to: '/litters', label: 'Litters' },
	{ to: '/apply', label: 'Apply' },
	{ to: '/faq', label: 'FAQ' },
	{ to: '/about', label: 'Why Teddy Doodles' },
	{ to: '/founder', label: 'Meet the Founder' },
	{ to: '/contact', label: 'Contact Us' },
];

export function PublicLayout() {
	const { user, isAdmin } = useAuthStore();
	const [menuOpen, setMenuOpen] = useState(false);

	const closeMenu = () => setMenuOpen(false);

	return (
		<div className="min-h-screen flex flex-col bg-warm-50">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-warm-900 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-medium"
			>
				Skip to content
			</a>
			<header className="bg-white border-b border-warm-200 sticky top-0 z-50">
				<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
					<Link to="/" onClick={closeMenu} className="flex items-center gap-3">
						<img src="/logo-icon.png" alt="" className="h-13 w-auto" aria-hidden="true" />
						<span className="font-sans font-light uppercase tracking-[0.22em] text-sm text-warm-800">Teddy Doodles</span>
					</Link>

					{/* Desktop nav */}
					<nav className="hidden md:flex items-center gap-8">
						{navLinks.map(({ to, label }) => (
							<NavLink
								key={to}
								to={to}
								className={({ isActive }) =>
									`text-sm font-medium transition-colors ${
										isActive
											? 'text-brand-600'
											: 'text-warm-600 hover:text-warm-900'
									}`
								}
							>
								{label}
							</NavLink>
						))}
					</nav>

					<div className="flex items-center gap-2">
						{/* Desktop auth buttons */}
						<div className="hidden md:flex items-center gap-3">
							{user ? (
								<>
									{isAdmin && (
										<Link
											to="/admin"
											className="text-sm font-medium text-brand-600 hover:text-brand-700"
										>
											Admin
										</Link>
									)}
									<Link
										to="/portal"
										className="text-sm px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
									>
										My Portal
									</Link>
								</>
							) : (
								<Link
									to="/login"
									className="text-sm px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
								>
									Client Login
								</Link>
							)}
						</div>

						{/* Mobile hamburger */}
						<button
							onClick={() => setMenuOpen((o) => !o)}
							className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-lg hover:bg-warm-100 transition-colors"
							aria-label="Toggle menu"
							aria-expanded={menuOpen}
						>
							<span className={`block h-0.5 w-5 bg-warm-700 transition-transform duration-200 origin-center ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
							<span className={`block h-0.5 w-5 bg-warm-700 transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
							<span className={`block h-0.5 w-5 bg-warm-700 transition-transform duration-200 origin-center ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
						</button>
					</div>
				</div>

				{/* Mobile menu — CSS grid transition for smooth open/close */}
				<div
					className="md:hidden overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
					style={{ display: 'grid', gridTemplateRows: menuOpen ? '1fr' : '0fr' }}
				>
					<div className="min-h-0 border-t border-black/[0.05] bg-white">
						<div className="px-6 py-4 flex flex-col gap-1">
							{navLinks.map(({ to, label }) => (
								<NavLink
									key={to}
									to={to}
									onClick={closeMenu}
									className={({ isActive }) =>
										`py-3 text-sm font-medium border-b border-warm-50 last:border-0 transition-colors ${
											isActive ? 'text-brand-600' : 'text-warm-700'
										}`
									}
								>
									{label}
								</NavLink>
							))}
							<div className="pt-3">
								{user ? (
									<div className="flex flex-col gap-2">
										{isAdmin && (
											<Link
												to="/admin"
												onClick={closeMenu}
												className="text-sm font-medium text-brand-600"
											>
												Admin Panel
											</Link>
										)}
										<Link
											to="/portal"
											onClick={closeMenu}
											className="text-sm px-4 py-2.5 bg-brand-500 text-white rounded-lg text-center font-medium hover:bg-brand-600 transition-colors"
										>
											My Portal
										</Link>
									</div>
								) : (
									<Link
										to="/login"
										onClick={closeMenu}
										className="block text-sm px-4 py-2.5 bg-brand-500 text-white rounded-lg text-center font-medium hover:bg-brand-600 transition-colors"
									>
										Client Login
									</Link>
								)}
							</div>
						</div>
					</div>
				</div>
			</header>

			<main id="main-content" className="flex-1">
				<Outlet />
			</main>

			<footer className="bg-warm-900 text-warm-400 py-12">
				<div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
					<div>
						<div className="mb-4">
							<span className="font-sans font-light uppercase tracking-[0.22em] text-xl text-white">Teddy Doodles</span>
						</div>
						<p className="text-sm leading-relaxed">
							Thoughtful, ethical breeding with a lifelong commitment to every puppy we place.
						</p>
					</div>
					<div>
						<h4 className="text-white font-medium mb-3 text-sm uppercase tracking-wider">Links</h4>
						<div className="flex flex-col gap-2 text-sm">
							{/* <Link to="/dogs" className="hover:text-white transition-colors">Our Dogs</Link> */}
							<Link to="/litters" className="hover:text-white transition-colors">Available Litters</Link>
							<Link to="/apply" className="hover:text-white transition-colors">Apply for a Puppy</Link>
							<Link to="/faq" className="hover:text-white transition-colors">FAQ</Link>
							<Link to="/about" className="hover:text-white transition-colors">Why Teddy Doodles</Link>
							<Link to="/founder" className="hover:text-white transition-colors">Meet the Founder</Link>
							<Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
						</div>
					</div>
					<div>
						<h4 className="text-white font-medium mb-3 text-sm uppercase tracking-wider">Contact</h4>
						<div className="flex flex-col gap-2 text-sm">
							{CONTACT_EMAIL && (
								<a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white transition-colors">{CONTACT_EMAIL}</a>
							)}
							{CONTACT_PHONE && (
								<a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="hover:text-white transition-colors">{CONTACT_PHONE}</a>
							)}
						</div>
						{(CONTACT_WHATSAPP || CONTACT_INSTAGRAM || CONTACT_FACEBOOK) && (
							<div className="flex items-center gap-3 mt-4">
								{CONTACT_WHATSAPP && (
									<a
										href={`https://wa.me/${CONTACT_WHATSAPP.replace(/\D/g, '')}`}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="WhatsApp"
										className="text-warm-400 hover:text-white transition-colors"
									>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
											<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.374 0 0 5.373 0 12c0 2.116.554 4.103 1.523 5.828L.057 23.428a.75.75 0 0 0 .915.915l5.67-1.47A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.713 9.713 0 0 1-4.953-1.355l-.355-.21-3.664.95.974-3.58-.23-.368A9.713 9.713 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
										</svg>
									</a>
								)}
								{CONTACT_INSTAGRAM && (
									<a
										href={`https://instagram.com/${CONTACT_INSTAGRAM.replace('@', '')}`}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Instagram"
										className="text-warm-400 hover:text-white transition-colors"
									>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
											<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
										</svg>
									</a>
								)}
								{CONTACT_FACEBOOK && (
									<a
										href={CONTACT_FACEBOOK.startsWith('http') ? CONTACT_FACEBOOK : `https://facebook.com/${CONTACT_FACEBOOK}`}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Facebook"
										className="text-warm-400 hover:text-white transition-colors"
									>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
											<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
										</svg>
									</a>
								)}
							</div>
						)}
					</div>
				</div>
			</footer>
		</div>
	);
}
