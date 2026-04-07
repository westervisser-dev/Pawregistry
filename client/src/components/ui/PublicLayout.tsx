import { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { CONTACT_EMAIL } from '@/config/app';

const navLinks = [
	{ to: '/litters', label: 'Litters' },
	{ to: '/apply', label: 'Apply' },
	{ to: '/faq', label: 'FAQ' },
	{ to: '/about', label: 'Why Teddy Doodles' },
	{ to: '/founder', label: 'Meet the Founder' },
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
<Link to="/litters" className="hover:text-white transition-colors">Available Litters</Link>
							<Link to="/apply" className="hover:text-white transition-colors">Apply for a Puppy</Link>
							<Link to="/faq" className="hover:text-white transition-colors">FAQ</Link>
							<Link to="/about" className="hover:text-white transition-colors">Why Teddy Doodles</Link>
							<Link to="/founder" className="hover:text-white transition-colors">Meet the Founder</Link>
						</div>
					</div>
					<div>
						<h4 className="text-white font-medium mb-3 text-sm uppercase tracking-wider">Contact</h4>
						{CONTACT_EMAIL && <p className="text-sm">{CONTACT_EMAIL}</p>}
					</div>
				</div>
			</footer>
		</div>
	);
}
