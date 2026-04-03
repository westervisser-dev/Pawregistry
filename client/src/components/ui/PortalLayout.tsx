import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { APP_NAME } from '@/config/app';

const portalNav = [
	{ to: '/portal', label: 'Dashboard', icon: '▪', end: true },
	{ to: '/portal/litters', label: 'Litters', icon: '🐾', iconFilter: 'brightness(0) invert(1)' },
	{ to: '/portal/updates', label: 'Updates', icon: '📋' },
	{ to: '/portal/documents', label: 'Documents', icon: '📁', requiresApproval: true },
];

// ─── Sidebar content extracted so it never remounts on parent re-renders ──────

interface SidebarProps {
	email?: string;
	clientStage: string | null;
	signOut: () => void;
	onLinkClick: () => void;
}

function PortalSidebar({ email, clientStage, signOut, onLinkClick }: SidebarProps) {
	const initials = (email ?? '')
		.split('@')[0]
		.slice(0, 2)
		.toUpperCase();

	return (
		<>
			{/* Logo area */}
			<div className="px-5 pt-7 pb-6 border-b border-white/10">
				<Link to="/" className="flex items-center gap-3" onClick={onLinkClick}>
					<div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 p-0.5">
						<span className="text-lg leading-none">🐾</span>
					</div>
					<div>
						<div className="font-serif text-[16px] text-[#F0EDEA] tracking-[0.01em]">{APP_NAME}</div>
						<div className="text-[10.5px] text-[rgba(240,237,234,0.4)] mt-0.5 tracking-[0.06em] uppercase">Client Portal</div>
					</div>
				</Link>
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
				{portalNav.map(({ to, label, icon, end, iconFilter, requiresApproval }) => {
					const locked = requiresApproval && clientStage === 'enquired';
					if (locked) {
						return (
							<span
								key={to}
								title="Available once your application is approved"
								className="flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] text-[rgba(240,237,234,0.3)] cursor-not-allowed select-none"
							>
								<span className="w-4 text-center text-sm opacity-40" style={iconFilter ? { filter: iconFilter } : undefined}>{icon}</span>
								{label}
							</span>
						);
					}
					return (
						<NavLink
							key={to}
							to={to}
							end={end}
							onClick={onLinkClick}
							className={({ isActive }) =>
								`flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] transition-colors ${
									isActive
										? 'bg-brand-500 text-white font-medium'
										: 'text-[rgba(240,237,234,0.75)] hover:bg-white/[0.06] hover:text-[rgba(240,237,234,1)]'
								}`
							}
						>
							<span className="w-4 text-center text-sm" style={iconFilter ? { filter: iconFilter } : undefined}>{icon}</span>
							{label}
						</NavLink>
					);
				})}
			</nav>

			{/* Footer */}
			<div className="px-5 pt-4 pb-5 border-t border-white/10">
				<div className="flex items-center gap-2.5">
					<div className="w-[30px] h-[30px] rounded-full bg-brand-500 flex items-center justify-center text-xs font-medium text-white shrink-0">
						{initials}
					</div>
					<p className="text-[11.5px] text-[rgba(240,237,234,0.6)] truncate">{email}</p>
				</div>
				<button
					onClick={signOut}
					className="flex items-center gap-1.5 mt-2.5 text-xs text-[rgba(240,237,234,0.5)] hover:text-[rgba(240,237,234,0.8)] transition-colors cursor-pointer py-1.5"
				>
					↩ Sign out
				</button>
			</div>
		</>
	);
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function PortalLayout() {
	const { user, signOut, clientStage } = useAuthStore();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const closeSidebar = () => setSidebarOpen(false);

	return (
		<div className="min-h-screen bg-warm-100 flex">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-warm-900 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-medium"
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

			{/* Sidebar — dark charcoal, off-canvas on mobile, always visible on md+ */}
			<aside className={`
				fixed inset-y-0 left-0 z-50 w-[220px] bg-sidebar-bg flex flex-col
				transform transition-transform duration-200
				${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
				md:translate-x-0 md:static md:z-auto
			`}>
				<PortalSidebar email={user?.email} clientStage={clientStage} signOut={signOut} onLinkClick={closeSidebar} />
			</aside>

			{/* Main */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Mobile top bar */}
				<div className="md:hidden sticky top-0 z-30 bg-sidebar-bg h-14 flex items-center px-4 gap-3">
					<button
						onClick={() => setSidebarOpen(true)}
						className="flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
						aria-label="Open menu"
					>
						<span className="block h-0.5 w-5 bg-[rgba(240,237,234,0.5)]" />
						<span className="block h-0.5 w-5 bg-[rgba(240,237,234,0.5)]" />
						<span className="block h-0.5 w-5 bg-[rgba(240,237,234,0.5)]" />
					</button>
					<Link to="/" className="flex items-center gap-2">
						<span className="text-lg">🐾</span>
						<span className="font-serif text-[#F0EDEA] text-sm">{APP_NAME}</span>
					</Link>
					<span className="text-[10.5px] text-[rgba(240,237,234,0.4)] uppercase tracking-wider">Client Portal</span>
				</div>

				{/* Page content */}
				<main id="main-content" className="flex-1 p-5 md:p-8 lg:p-9">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
