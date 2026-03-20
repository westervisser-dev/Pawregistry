import { useState } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const navLinks = [
	{ to: '/dogs', label: 'Our Dogs' },
	{ to: '/litters', label: 'Litters' },
	{ to: '/apply', label: 'Apply' },
	{ to: '/about', label: 'About' },
];

export function PublicLayout() {
	const { user, isAdmin } = useAuthStore();
	const [menuOpen, setMenuOpen] = useState(false);
	const location = useLocation();

	// Close menu on route change
	const closeMenu = () => setMenuOpen(false);

	return (
		<div className="min-h-screen flex flex-col">
			<header className="bg-white border-b border-stone-200 sticky top-0 z-50">
				<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
					<Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
						<span className="text-2xl">🐾</span>
						<span className="font-serif text-xl font-bold text-stone-900">Paw Registry</span>
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
											: 'text-stone-600 hover:text-stone-900'
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
							className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-lg hover:bg-stone-100 transition-colors"
							aria-label="Toggle menu"
						>
							<span className={`block h-0.5 w-5 bg-stone-700 transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
							<span className={`block h-0.5 w-5 bg-stone-700 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
							<span className={`block h-0.5 w-5 bg-stone-700 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
						</button>
					</div>
				</div>

				{/* Mobile menu dropdown */}
				{menuOpen && (
					<div className="md:hidden border-t border-stone-100 bg-white px-6 py-4 flex flex-col gap-1">
						{navLinks.map(({ to, label }) => (
							<NavLink
								key={to}
								to={to}
								onClick={closeMenu}
								className={({ isActive }) =>
									`py-3 text-sm font-medium border-b border-stone-50 last:border-0 transition-colors ${
										isActive ? 'text-brand-600' : 'text-stone-700'
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
				)}
			</header>

			<main className="flex-1">
				<Outlet />
			</main>

			<footer className="bg-stone-900 text-stone-400 py-12 mt-20">
				<div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
					<div>
						<div className="flex items-center gap-2 mb-4">
							<span className="text-xl">🐾</span>
							<span className="font-serif text-white font-bold">Paw Registry</span>
						</div>
						<p className="text-sm leading-relaxed">
							Thoughtful, ethical breeding with a lifelong commitment to every puppy we place.
						</p>
					</div>
					<div>
						<h4 className="text-white font-medium mb-3 text-sm uppercase tracking-wider">Links</h4>
						<div className="flex flex-col gap-2 text-sm">
							<Link to="/dogs" className="hover:text-white transition-colors">Our Dogs</Link>
							<Link to="/litters" className="hover:text-white transition-colors">Available Litters</Link>
							<Link to="/apply" className="hover:text-white transition-colors">Apply for a Puppy</Link>
							<Link to="/about" className="hover:text-white transition-colors">About Us</Link>
						</div>
					</div>
					<div>
						<h4 className="text-white font-medium mb-3 text-sm uppercase tracking-wider">Contact</h4>
						<p className="text-sm">info@pawregistry.co.za</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
