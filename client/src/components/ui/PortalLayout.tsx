import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { APP_NAME } from '@/config/app';
import { Glyph, type GlyphShape, Avatar } from '@/components/ui';

type PortalTab = {
	to: string;
	label: string;
	shortLabel?: string;
	glyph: GlyphShape;
	end?: boolean;
	requiresApproval?: boolean;
};

const PORTAL_TABS: PortalTab[] = [
	{ to: '/portal',           label: 'Home',      glyph: 'home',     end: true },
	{ to: '/portal/litters',   label: 'Litters',   glyph: 'paw' },
	{ to: '/portal/updates',   label: 'Updates',   glyph: 'bell' },
	{ to: '/portal/payments',  label: 'Payments',  glyph: 'coin' },
	{ to: '/portal/documents', label: 'Documents', shortLabel: 'Docs', glyph: 'doc', requiresApproval: true },
];

// ─── Account menu (avatar dropdown, shared mobile + desktop) ─────────────────

function AccountMenu({ email, signOut, size = 32 }: { email: string; signOut: () => void; size?: number }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function onClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') setOpen(false);
		}
		document.addEventListener('mousedown', onClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onClick);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label="Account menu"
				className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
			>
				<Avatar name={email} size={size} />
			</button>
			{open && (
				<div
					role="menu"
					className="absolute right-0 mt-2 w-[220px] bg-white rounded-[12px] border border-black/[0.06] shadow-[0_6px_20px_rgba(0,0,0,0.08)] py-1.5 z-40"
				>
					<div className="px-3.5 py-2 border-b border-black/[0.05]">
						<p className="text-[11px] text-warm-500">Signed in as</p>
						<p className="text-[12.5px] text-warm-900 truncate">{email}</p>
					</div>
					<Link
						to="/portal/preferences"
						role="menuitem"
						onClick={() => setOpen(false)}
						className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-warm-700 hover:bg-warm-50"
					>
						Puppy preferences
					</Link>
					<button
						role="menuitem"
						onClick={() => { setOpen(false); signOut(); }}
						className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[13px] text-warm-700 hover:bg-warm-50"
					>
						Sign out
					</button>
				</div>
			)}
		</div>
	);
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export function PortalLayout() {
	const { user, signOut, clientStage } = useAuthStore();
	const location = useLocation();
	const email = user?.email ?? '';
	const isLocked = (tab: PortalTab) => tab.requiresApproval && clientStage === 'enquired';

	return (
		<div className="min-h-screen bg-warm-100 pb-20 md:pb-0">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-warm-900 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-medium"
			>
				Skip to content
			</a>

			{/* ── Desktop topbar ── */}
			<div className="hidden md:block sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-black/[0.05]">
				<div className="max-w-[1280px] mx-auto h-[62px] flex items-center justify-between px-6 lg:px-8">
					<Link to="/portal" className="flex items-center gap-3 shrink-0">
						<div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-0.5 border border-warm-200">
							<img src="/logo-icon.png" alt="" className="w-full h-full object-contain" aria-hidden="true" />
						</div>
						<div>
							<div className="font-serif text-[18px] text-warm-900 leading-tight">{APP_NAME}</div>
							<div className="text-[10px] uppercase tracking-[0.14em] text-warm-500">Client portal</div>
						</div>
					</Link>
					<nav className="flex items-center gap-1" aria-label="Portal">
						{PORTAL_TABS.map((tab) => {
							const locked = isLocked(tab);
							if (locked) {
								return (
									<span
										key={tab.to}
										title="Available once your application is approved"
										aria-disabled="true"
										className="px-3 h-9 inline-flex items-center rounded-[9px] text-[13px] text-warm-300 cursor-not-allowed select-none"
									>
										{tab.label}
									</span>
								);
							}
							return (
								<NavLink
									key={tab.to}
									to={tab.to}
									end={tab.end}
									className={({ isActive }) =>
										`px-3 h-9 inline-flex items-center rounded-[9px] text-[13px] transition-colors ${
											isActive
												? 'text-warm-900 font-medium bg-warm-100'
												: 'text-warm-500 hover:text-warm-800 hover:bg-warm-50'
										}`
									}
								>
									{tab.label}
								</NavLink>
							);
						})}
						<div className="w-px h-5 bg-warm-200 mx-2" aria-hidden="true" />
						<AccountMenu email={email} signOut={signOut} size={32} />
					</nav>
				</div>
			</div>

			{/* ── Mobile header ── */}
			<div className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-black/[0.05]">
				<div className="h-14 flex items-center justify-between px-5">
					<Link to="/portal" className="flex items-center gap-2.5">
						<div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-0.5 border border-warm-200">
							<img src="/logo-icon.png" alt="" className="w-full h-full object-contain" aria-hidden="true" />
						</div>
						<span className="font-serif text-[16px] text-warm-900">{APP_NAME}</span>
					</Link>
					<AccountMenu email={email} signOut={signOut} size={30} />
				</div>
			</div>

			{/* ── Main ── */}
			<main id="main-content">
				<Outlet />
			</main>

			{/* ── Mobile bottom tabs ── */}
			<div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-black/[0.06]">
				<nav className="grid grid-cols-5 h-16" aria-label="Portal">
					{PORTAL_TABS.map((tab) => {
						const locked = isLocked(tab);
						const active = tab.end
							? location.pathname === tab.to
							: location.pathname === tab.to || location.pathname.startsWith(tab.to + '/');
						const label = tab.shortLabel ?? tab.label;

						if (locked) {
							return (
								<span
									key={tab.to}
									title="Available once your application is approved"
									aria-disabled="true"
									className="flex flex-col items-center justify-center gap-1 text-warm-300 cursor-not-allowed select-none"
								>
									<Glyph shape={tab.glyph} color="#d6c9b8" size={18} />
									<span className="text-[10.5px]">{label}</span>
								</span>
							);
						}

						return (
							<NavLink
								key={tab.to}
								to={tab.to}
								end={tab.end}
								className="flex flex-col items-center justify-center gap-1"
								aria-current={active ? 'page' : undefined}
							>
								<Glyph shape={tab.glyph} color={active ? '#c47420' : '#9e8b78'} size={18} />
								<span
									className="text-[10.5px]"
									style={{ color: active ? '#c47420' : '#9e8b78', fontWeight: active ? 600 : 400 }}
								>
									{label}
								</span>
							</NavLink>
						);
					})}
				</nav>
			</div>
		</div>
	);
}
