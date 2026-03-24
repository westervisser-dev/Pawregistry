import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const portalNav = [
	{ to: '/portal', label: 'Dashboard', icon: '🏠', end: true },
	{ to: '/portal/updates', label: 'Updates', icon: '📷' },
	{ to: '/portal/documents', label: 'Documents', icon: '📄' },
	{ to: '/portal/checklist', label: 'Checklist', icon: '✅' },
];

// ─── Sidebar content extracted so it never remounts on parent re-renders ──────

interface SidebarProps {
	email?: string;
	signOut: () => void;
	onLinkClick: () => void;
}

function PortalSidebar({ email, signOut, onLinkClick }: SidebarProps) {
	return (
		<>
			<div className="p-6 border-b border-stone-200">
				<Link to="/" className="flex items-center gap-2" onClick={onLinkClick}>
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
						onClick={onLinkClick}
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
					<p className="text-xs font-medium text-stone-900 truncate">{email}</p>
				</div>
				<button
					onClick={signOut}
					className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
				>
					<span>↩</span> Sign out
				</button>
			</div>
		</>
	);
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function PortalLayout() {
	const { user, signOut } = useAuthStore();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const closeSidebar = () => setSidebarOpen(false);

	return (
		<div className="min-h-screen bg-stone-50 flex">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-stone-900 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-medium"
			>
				Skip to content
			</a>
			{/* Mobile backdrop */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/30 md:hidden"
					onClick={closeSidebar}
				/>
			)}

			{/* Sidebar — off-canvas on mobile, always visible on md+ */}
			<aside className={`
				fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 flex flex-col
				transform transition-transform duration-200
				${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
				md:translate-x-0 md:static md:z-auto
			`}>
				<PortalSidebar email={user?.email} signOut={signOut} onLinkClick={closeSidebar} />
			</aside>

			{/* Main */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Mobile top bar */}
				<div className="md:hidden sticky top-0 z-30 bg-white border-b border-stone-200 h-14 flex items-center px-4 gap-3">
					<button
						onClick={() => setSidebarOpen(true)}
						className="flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-lg hover:bg-stone-100 transition-colors"
						aria-label="Open menu"
					>
						<span className="block h-0.5 w-5 bg-stone-700" />
						<span className="block h-0.5 w-5 bg-stone-700" />
						<span className="block h-0.5 w-5 bg-stone-700" />
					</button>
					<Link to="/" className="flex items-center gap-2">
						<span className="text-lg">🐾</span>
						<span className="font-serif font-bold text-stone-900 text-sm">Paw Registry</span>
					</Link>
					<span className="text-xs text-stone-500">Client Portal</span>
				</div>

				{/* Page content — extra bottom padding on mobile for the bottom nav */}
				<main id="main-content" className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
					<Outlet />
				</main>
			</div>

			{/* Mobile bottom navigation — thumb-first for clients on the go */}
			<nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200">
				<div className="grid grid-cols-5 h-16">
					{portalNav.map(({ to, label, icon, end }) => (
						<NavLink
							key={to}
							to={to}
							end={end}
							className={({ isActive }) =>
								`flex flex-col items-center justify-center gap-0.5 text-center transition-colors ${
									isActive ? 'text-brand-600' : 'text-stone-400'
								}`
							}
						>
							<span className="text-xl leading-none">{icon}</span>
							<span className="text-[10px] font-medium leading-tight">{label}</span>
						</NavLink>
					))}
				</div>
			</nav>
		</div>
	);
}
