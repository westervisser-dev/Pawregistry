import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const adminNav = [
	{ to: '/admin', label: 'Dashboard', icon: '📊', end: true },
	{ to: '/admin/dogs', label: 'Dogs', icon: '🐕' },
	{ to: '/admin/litters', label: 'Litters', icon: '🐶' },
	{ to: '/admin/waitlist', label: 'Waitlist', icon: '📋' },
	{ to: '/admin/clients', label: 'Clients', icon: '👥' },
	{ to: '/admin/updates', label: 'Updates', icon: '📷' },
];

export function AdminLayout() {
	const { user, signOut } = useAuthStore();

	return (
		<div className="min-h-screen bg-stone-100 flex">
			<aside className="w-60 bg-stone-900 flex flex-col fixed h-full">
				<div className="p-5 border-b border-stone-700">
					<Link to="/" className="flex items-center gap-2">
						<span className="text-xl">🐾</span>
						<span className="font-serif font-bold text-white">Paw Registry</span>
					</Link>
					<span className="inline-block mt-1 text-xs px-2 py-0.5 bg-brand-600 text-white rounded-full">
						Admin
					</span>
				</div>

				<nav className="flex-1 p-3 flex flex-col gap-0.5">
					{adminNav.map(({ to, label, icon, end }) => (
						<NavLink
							key={to}
							to={to}
							end={end}
							className={({ isActive }) =>
								`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
									isActive
										? 'bg-white/10 text-white'
										: 'text-stone-400 hover:bg-white/5 hover:text-stone-200'
								}`
							}
						>
							<span className="text-base">{icon}</span>
							{label}
						</NavLink>
					))}
				</nav>

				<div className="p-4 border-t border-stone-700">
					<p className="text-xs text-stone-500 px-3 mb-2 truncate">{user?.email}</p>
					<button
						onClick={signOut}
						className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-400 hover:bg-white/5 hover:text-stone-200 transition-colors"
					>
						<span>↩</span> Sign out
					</button>
				</div>
			</aside>

			<main className="flex-1 ml-60">
				<Outlet />
			</main>
		</div>
	);
}
