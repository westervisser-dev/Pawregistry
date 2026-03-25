import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const adminNav = [
	{ to: '/admin', label: 'Dashboard', icon: '📊', end: true },
	{ to: '/admin/dogs', label: 'Dogs', icon: '🐕' },
	{ to: '/admin/litters', label: 'Litters', icon: '🐶' },
	{ to: '/admin/clients', label: 'Clients', icon: '👥' },
	{ to: '/admin/updates', label: 'Updates', icon: '📷' },
	{ to: '/admin/documents', label: 'Documents', icon: '📁' },
	{ to: '/admin/admins', label: 'Admins', icon: '🔑' },
	{ to: '/admin/emails', label: 'Emails', icon: '✉️' },
];

// ─── Sidebar content extracted so it never remounts on parent re-renders ──────

interface AdminSidebarProps {
	email?: string;
	signOut: () => void;
	onLinkClick: () => void;
}

function AdminSidebar({ email, signOut, onLinkClick }: AdminSidebarProps) {
	return (
		<>
			<div className="p-5 border-b border-stone-700">
				<Link to="/" className="flex items-center gap-2" onClick={onLinkClick}>
					<span style={{ fontSize: '1.375rem' }}>🐾</span>
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
						onClick={onLinkClick}
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
				<p className="text-xs text-stone-500 px-3 mb-2 truncate">{email}</p>
				<button
					onClick={signOut}
					className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-400 hover:bg-white/5 hover:text-stone-200 transition-colors"
				>
					<span>↩</span> Sign out
				</button>
			</div>
		</>
	);
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function AdminLayout() {
	const { user, signOut } = useAuthStore();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const closeSidebar = () => setSidebarOpen(false);

	return (
		<div className="min-h-screen bg-stone-100 flex">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-stone-900 focus:text-white focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-brand-400 focus:outline-none text-sm font-medium"
			>
				Skip to content
			</a>
			{/* Mobile backdrop */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/50 md:hidden"
					onClick={closeSidebar}
				/>
			)}

			{/* Sidebar — off-canvas on mobile, always visible on md+ */}
			<aside className={`
				fixed inset-y-0 left-0 z-50 w-60 bg-stone-900 flex flex-col
				transform transition-transform duration-200
				${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
				md:translate-x-0 md:static md:z-auto
			`}>
				<AdminSidebar email={user?.email} signOut={signOut} onLinkClick={closeSidebar} />
			</aside>

			{/* Main */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Mobile top bar */}
				<div className="md:hidden sticky top-0 z-30 bg-stone-900 h-14 flex items-center px-4 gap-3 border-b border-stone-700">
					<button
						onClick={() => setSidebarOpen(true)}
						className="flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-lg hover:bg-white/10 transition-colors"
						aria-label="Open menu"
					>
						<span className="block h-0.5 w-5 bg-stone-300" />
						<span className="block h-0.5 w-5 bg-stone-300" />
						<span className="block h-0.5 w-5 bg-stone-300" />
					</button>
					<Link to="/" className="flex items-center gap-2">
						<span style={{ fontSize: '1.238rem' }}>🐾</span>
						<span className="font-serif font-bold text-white text-sm">Paw Registry</span>
					</Link>
					<span className="text-xs px-2 py-0.5 bg-brand-600 text-white rounded-full">Admin</span>
				</div>

				<main id="main-content" className="flex-1">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
