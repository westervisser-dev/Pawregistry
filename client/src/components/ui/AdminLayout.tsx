import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { APP_NAME } from '@/config/app';

const adminNav = [
	{ to: '/admin', label: 'Dashboard', icon: '▪', end: true },
	{ to: '/admin/litters', label: 'Litters', icon: '🐾', iconFilter: 'brightness(0) invert(1)' },
	{ to: '/admin/clients', label: 'Clients', icon: '👥' },
	{ divider: true },
	{ to: '/admin/updates', label: 'Updates', icon: '📋' },
	{ to: '/admin/documents', label: 'Documents', icon: '📁' },
	{ to: '/admin/admins', label: 'Admins', icon: '🔑' },
	{ to: '/admin/emails', label: 'Emails', icon: '✉' },
] as const;

// ─── Sidebar content ─────────────────────────────────────────────────────────

interface AdminSidebarProps {
	email?: string;
	signOut: () => void;
	onLinkClick: () => void;
}

function AdminSidebar({ email, signOut, onLinkClick }: AdminSidebarProps) {
	const initials = email
		? email.split('@')[0].slice(0, 2).toUpperCase()
		: '??';

	return (
		<>
			{/* Logo area */}
			<div className="px-5 pb-6 pt-7 border-b border-white/10">
				<Link to="/" className="flex items-center gap-3" onClick={onLinkClick}>
					<div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 p-0.5">
						<img src="/logo-icon.png" alt="Teddydoodles" className="w-full h-full object-contain" />
					</div>
					<div>
						<span className="font-serif text-[16px] text-[#F0EDEA] block leading-tight">{APP_NAME}</span>
						<span className="text-[10.5px] text-white/40 uppercase tracking-[0.06em] mt-0.5 block">Admin Portal</span>
					</div>
				</Link>
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
				{adminNav.map((item, i) => {
					if ('divider' in item) {
						return <div key={`div-${i}`} className="h-px bg-white/10 mx-3 my-2.5" />;
					}
					return (
						<NavLink
							key={item.to}
							to={item.to}
							end={'end' in item ? item.end : undefined}
							onClick={onLinkClick}
							className={({ isActive }) =>
								`flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] transition-colors ${
									isActive
										? 'bg-brand-500 text-white font-medium'
										: 'text-white/75 hover:bg-white/[0.06] hover:text-white'
								}`
							}
						>
							<span className="w-4 text-center text-sm" style={'iconFilter' in item ? { filter: item.iconFilter } : undefined}>{item.icon}</span>
							{item.label}
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
					<p className="text-[11.5px] text-white/60 truncate">{email}</p>
				</div>
				<button
					onClick={signOut}
					className="flex items-center gap-1.5 mt-2.5 text-xs text-white/50 hover:text-white/80 transition-colors py-1.5"
				>
					<span>↩</span> Sign out
				</button>
			</div>
		</>
	);
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export function AdminLayout() {
	const { user, signOut } = useAuthStore();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const location = useLocation();

	useEffect(() => {
		setSidebarOpen(false);
	}, [location.pathname]);

	const closeSidebar = () => setSidebarOpen(false);

	return (
		<div className="min-h-screen bg-warm-100 flex">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-warm-900 focus:text-white focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-brand-400 focus:outline-none text-sm font-medium"
			>
				Skip to content
			</a>

			{/* Sidebar — desktop only */}
			<aside className="hidden md:flex flex-col w-[220px] bg-sidebar-bg shrink-0">
				<AdminSidebar email={user?.email} signOut={signOut} onLinkClick={closeSidebar} />
			</aside>

			{/* Main */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Mobile header — public style */}
				<div className="md:hidden sticky top-0 z-30 bg-white border-b border-warm-200">
					<div className="h-16 flex items-center justify-between px-6">
						<Link to="/" className="flex items-center gap-3" onClick={closeSidebar}>
							<img src="/logo-icon.png" alt="" className="h-10 w-auto" aria-hidden="true" />
							<div>
								<span className="font-sans font-light uppercase tracking-[0.22em] text-sm text-warm-800 block">{APP_NAME}</span>
								<span className="text-[10px] text-warm-400 uppercase tracking-wider">Admin</span>
							</div>
						</Link>
						<button
							onClick={() => setSidebarOpen((o) => !o)}
							className="flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-lg hover:bg-warm-100 transition-colors"
							aria-label="Toggle menu"
							aria-expanded={sidebarOpen}
						>
							<span className={`block h-0.5 w-5 bg-warm-700 transition-transform duration-200 origin-center ${sidebarOpen ? 'rotate-45 translate-y-2' : ''}`} />
							<span className={`block h-0.5 w-5 bg-warm-700 transition-opacity duration-200 ${sidebarOpen ? 'opacity-0' : ''}`} />
							<span className={`block h-0.5 w-5 bg-warm-700 transition-transform duration-200 origin-center ${sidebarOpen ? '-rotate-45 -translate-y-2' : ''}`} />
						</button>
					</div>
					<div
						className="overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
						style={{ display: 'grid', gridTemplateRows: sidebarOpen ? '1fr' : '0fr' }}
					>
						<div className="min-h-0 border-t border-warm-100">
							<div className="px-6 py-4 flex flex-col gap-1">
								{adminNav.map((item, i) => {
									if ('divider' in item) return <div key={`div-${i}`} className="h-px bg-warm-100 my-1" />;
									return (
										<NavLink
											key={item.to}
											to={item.to}
											end={'end' in item ? item.end : undefined}
											onClick={closeSidebar}
											className={({ isActive }) =>
												`py-3 text-sm font-medium border-b border-warm-50 last:border-0 transition-colors ${
													isActive ? 'text-brand-600' : 'text-warm-700'
												}`
											}
										>
											{item.label}
										</NavLink>
									);
								})}
								<div className="pt-3 mt-1 border-t border-warm-100 flex items-center justify-between">
									<p className="text-xs text-warm-400 truncate">{user?.email}</p>
									<button onClick={signOut} className="text-sm text-warm-500 hover:text-warm-700 transition-colors shrink-0 ml-4">
										Sign out
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<main id="main-content" className="flex-1 bg-warm-100">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
