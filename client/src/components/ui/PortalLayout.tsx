import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const portalNav = [
	{ to: '/portal', label: 'Dashboard', icon: '🏠', end: true },
	{ to: '/portal/updates', label: 'Updates', icon: '📷' },
	{ to: '/portal/messages', label: 'Messages', icon: '💬' },
	{ to: '/portal/documents', label: 'Documents', icon: '📄' },
	{ to: '/portal/checklist', label: 'Go-Home Checklist', icon: '✅' },
];

export function PortalLayout() {
	const { user, signOut } = useAuthStore();

	return (
		<div className="min-h-screen bg-stone-50 flex">
			{/* Sidebar */}
			<aside className="w-64 bg-white border-r border-stone-200 flex flex-col fixed h-full">
				<div className="p-6 border-b border-stone-200">
					<Link to="/" className="flex items-center gap-2">
						<span className="text-xl">🐾</span>
						<span className="font-serif font-bold text-stone-900">Paw Registry</span>
					</Link>
					<p className="text-xs text-stone-500 mt-1">Client Portal</p>
				</div>

				<nav className="flex-1 p-4 flex flex-col gap-1">
					{portalNav.map(({ to, label, icon, end }) => (
						<NavLink
							key={to}
							to={to}
							end={end}
							className={({ isActive }) =>
								`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
									isActive
										? 'bg-brand-50 text-brand-700'
										: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
								}`
							}
						>
							<span>{icon}</span>
							{label}
						</NavLink>
					))}
				</nav>

				<div className="p-4 border-t border-stone-200">
					<div className="px-3 py-2 mb-2">
						<p className="text-xs font-medium text-stone-900 truncate">{user?.email}</p>
					</div>
					<button
						onClick={signOut}
						className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
					>
						<span>↩</span> Sign out
					</button>
				</div>
			</aside>

			{/* Main content */}
			<main className="flex-1 ml-64 p-8">
				<Outlet />
			</main>
		</div>
	);
}
