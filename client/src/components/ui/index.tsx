import { type ReactNode, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBreedSizeLabel } from '@paw-registry/shared';

// ─── Focus Trap Hook ──────────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR =
	'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside a modal container when open.
 * - Moves focus to the first focusable element on open.
 * - Cycles Tab/Shift+Tab within the container.
 * - Calls onClose on Escape.
 * - Restores focus to the previously focused element on close.
 */
export function useFocusTrap(isOpen: boolean, onClose?: () => void) {
	const containerRef = useRef<HTMLDivElement>(null);
	const savedFocusRef = useRef<HTMLElement | null>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		if (!isOpen) return;

		savedFocusRef.current = document.activeElement as HTMLElement;

		const container = containerRef.current;
		if (!container) return;

		const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
		firstFocusable?.focus();

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onCloseRef.current?.();
				return;
			}
			if (e.key !== 'Tab') return;

			const focusables = Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
			if (focusables.length === 0) return;

			const first = focusables[0];
			const last = focusables[focusables.length - 1];

			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			savedFocusRef.current?.focus();
		};
	}, [isOpen]);

	return containerRef;
}

// ─── Glyph (inline SVG icon set) ─────────────────────────────────────────────

export type GlyphShape =
	| 'paw' | 'people' | 'coin' | 'inbox' | 'doc' | 'home'
	| 'calendar' | 'arrow' | 'grip' | 'search' | 'plus' | 'check' | 'bell' | 'dot';

interface GlyphProps {
	shape?: GlyphShape;
	color?: string;
	size?: number;
	className?: string;
}

export function Glyph({ shape = 'dot', color = '#c47420', size = 16, className }: GlyphProps) {
	const stroke = {
		stroke: color,
		strokeWidth: 1.6,
		fill: 'none' as const,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
	};
	const common = { width: size, height: size, viewBox: '0 0 24 24', className, 'aria-hidden': true as const };

	switch (shape) {
		case 'paw':
			return (
				<svg {...common} {...stroke}>
					<circle cx="7" cy="8" r="2" fill={color} stroke="none" />
					<circle cx="12" cy="6" r="2" fill={color} stroke="none" />
					<circle cx="17" cy="8" r="2" fill={color} stroke="none" />
					<circle cx="19.5" cy="13" r="1.6" fill={color} stroke="none" />
					<path d="M6 17c0-3 2.5-5 6-5s6 2 6 5c0 2-2 3-3 3H9c-1 0-3-1-3-3z" fill={color} stroke="none" />
				</svg>
			);
		case 'people':
			return (
				<svg {...common} {...stroke}>
					<circle cx="9" cy="8" r="3" />
					<path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
					<circle cx="17" cy="9" r="2.5" />
					<path d="M15 20c0-2 1-4 3-4.5" />
				</svg>
			);
		case 'coin':
			return (
				<svg {...common} {...stroke}>
					<circle cx="12" cy="12" r="8" />
					<path d="M12 7v10M15 9.5c0-1.1-1.3-2-3-2s-3 .9-3 2 1.3 1.8 3 2 3 .9 3 2-1.3 2-3 2-3-.9-3-2" />
				</svg>
			);
		case 'inbox':
			return (
				<svg {...common} {...stroke}>
					<path d="M4 13l2-7h12l2 7" />
					<path d="M4 13v5h16v-5" />
					<path d="M4 13h5l1 2h4l1-2h5" />
				</svg>
			);
		case 'doc':
			return (
				<svg {...common} {...stroke}>
					<path d="M6 3h8l4 4v14H6z" />
					<path d="M14 3v4h4M9 12h6M9 16h6" />
				</svg>
			);
		case 'home':
			return (
				<svg {...common} {...stroke}>
					<path d="M4 11l8-7 8 7v9H4z" />
					<path d="M10 20v-6h4v6" />
				</svg>
			);
		case 'calendar':
			return (
				<svg {...common} {...stroke}>
					<rect x="3.5" y="5" width="17" height="15" rx="2" />
					<path d="M3.5 10h17M8 3v4M16 3v4" />
				</svg>
			);
		case 'arrow':
			return (
				<svg {...common} {...stroke}>
					<path d="M5 12h14M13 6l6 6-6 6" />
				</svg>
			);
		case 'grip':
			return (
				<svg {...common}>
					<circle cx="9" cy="6" r="1.3" fill={color} />
					<circle cx="15" cy="6" r="1.3" fill={color} />
					<circle cx="9" cy="12" r="1.3" fill={color} />
					<circle cx="15" cy="12" r="1.3" fill={color} />
					<circle cx="9" cy="18" r="1.3" fill={color} />
					<circle cx="15" cy="18" r="1.3" fill={color} />
				</svg>
			);
		case 'search':
			return (
				<svg {...common} {...stroke}>
					<circle cx="11" cy="11" r="6" />
					<path d="M20 20l-4.5-4.5" />
				</svg>
			);
		case 'plus':
			return (
				<svg {...common} {...stroke}>
					<path d="M12 5v14M5 12h14" />
				</svg>
			);
		case 'check':
			return (
				<svg {...common} {...stroke}>
					<path d="M5 12.5l4 4 10-10" />
				</svg>
			);
		case 'bell':
			return (
				<svg {...common} {...stroke}>
					<path d="M6 17h12l-1.5-2V11a4.5 4.5 0 00-9 0v4L6 17z" />
					<path d="M10 20a2 2 0 004 0" />
				</svg>
			);
		default:
			return (
				<span
					className={`inline-block rounded-full ${className ?? ''}`}
					style={{ width: size, height: size, background: color }}
					aria-hidden="true"
				/>
			);
	}
}

// ─── Placeholder (striped image fallback) ───────────────────────────────────

type PlaceholderTone = 'warm' | 'cream' | 'sand' | 'dark';

const PLACEHOLDER_TONES: Record<PlaceholderTone, { a: string; b: string; text: string }> = {
	warm:  { a: '#ede5d8', b: '#e1d4c0', text: '#8a7560' },
	cream: { a: '#f5f0e8', b: '#ebe2d3', text: '#9a8871' },
	sand:  { a: '#e7dcc8', b: '#d9ccb2', text: '#7a6a58' },
	dark:  { a: '#3d2510', b: '#2a1808', text: '#d6c9b8' },
};

interface PlaceholderProps {
	label?: string;
	className?: string;
	tone?: PlaceholderTone;
}

export function Placeholder({ label, className = '', tone = 'warm' }: PlaceholderProps) {
	const t = PLACEHOLDER_TONES[tone];
	return (
		<div
			className={`relative overflow-hidden flex items-end ${className}`}
			style={{
				backgroundImage: `repeating-linear-gradient(135deg, ${t.a} 0, ${t.a} 14px, ${t.b} 14px, ${t.b} 28px)`,
			}}
			aria-hidden="true"
		>
			{label && (
				<span
					className="font-mono text-[10.5px] px-2.5 py-1 m-2 rounded-sm"
					style={{ background: 'rgba(255,255,255,0.72)', color: t.text, letterSpacing: '0.02em' }}
				>
					{label}
				</span>
			)}
		</div>
	);
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
	children: ReactNode;
	className?: string;
	id?: string;
}

export function Card({ children, className = '', id }: CardProps) {
	return (
		<div id={id} className={`bg-white rounded-[14px] border border-black/[0.07] ${className}`}>
			{children}
		</div>
	);
}

// ─── Card Header ─────────────────────────────────────────────────────────────

interface CardHeaderProps {
	title: string;
	badge?: ReactNode;
	action?: ReactNode;
}

export function CardHeader({ title, badge, action }: CardHeaderProps) {
	return (
		<div className="px-[22px] pt-[18px] flex items-center justify-between">
			<h3 className="font-serif text-[16px] text-warm-900">
				{title}
				{badge}
			</h3>
			{action}
		</div>
	);
}

// ─── Page Header ─────────────────────────────────────────────────────────────

interface PageHeaderProps {
	title: ReactNode;
	subtitle?: string;
	action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
	return (
		<div className="flex items-start justify-between mb-7">
			<div>
				<h1 className="font-serif text-[28px] text-warm-900 leading-[1.1]">{title}</h1>
				{subtitle && <p className="text-[13.5px] text-warm-500 mt-1">{subtitle}</p>}
			</div>
			{action && <div>{action}</div>}
		</div>
	);
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

type StatAccent = 'brand' | 'brown' | 'green' | 'blue' | 'plum' | 'rust';

const ACCENT_COLORS: Record<StatAccent, string> = {
	brand: '#c47420',
	brown: '#8B5E3C',
	green:  '#4a6741',
	blue:   '#1e5b8a',
	plum:   '#7a47a8',
	rust:   '#8d2a4a',
};

interface StatCardProps {
	icon?: string;
	value: number | string;
	label: string;
	accent?: StatAccent;
	trend?: { text: string; variant?: 'success' | 'alert' };
	sub?: string;
	to?: string;
}

export function StatCard({ icon, value, label, accent = 'brand', trend, sub, to }: StatCardProps) {
	const color = ACCENT_COLORS[accent];
	const content = (
		<div
			className={`bg-white border border-black/[0.06] p-5 transition-all ${to ? 'hover:shadow-card-hover cursor-pointer' : ''}`}
			style={{ borderRadius: 14, boxShadow: 'var(--shadow-card)' }}
		>
			<div className="flex items-start justify-between">
				<div>
					<div className="text-[11.5px] uppercase tracking-[0.1em] text-warm-500 font-medium">{label}</div>
					<div className="font-serif text-[38px] leading-[1] text-warm-900 mt-2">{value}</div>
				</div>
				<span className="w-1.5 h-6 rounded-full" style={{ background: color }} aria-hidden="true" />
			</div>
			{sub && <div className="text-[12px] text-warm-500 mt-3">{sub}</div>}
			{icon && !sub && <span className="text-[11px] text-warm-400 mt-2 block" aria-hidden="true">{icon}</span>}
			{trend && (
				<span className={`inline-block mt-3 text-[11px] font-medium px-2 py-[3px] rounded-[20px] ${
					trend.variant === 'alert'
						? 'bg-[#FEF0E0] text-[#A05A10]'
						: 'bg-[#EAF3E0] text-[#3A6830]'
				}`}>
					{trend.text}
				</span>
			)}
		</div>
	);

	if (to) {
		return <Link to={to}>{content}</Link>;
	}
	return content;
}

// ─── Quick Action Button ─────────────────────────────────────────────────────

interface ActionButtonProps {
	icon: string;
	label: string;
	to: string;
	variant?: 'primary' | 'secondary';
}

export function ActionButton({ icon, label, to, variant = 'secondary' }: ActionButtonProps) {
	return (
		<Link
			to={to}
			className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-[9px] text-[13px] font-medium text-left transition-all ${
				variant === 'primary'
					? 'bg-brand-500 text-white hover:bg-brand-600 border border-transparent'
					: 'bg-warm-50 text-warm-800 border border-black/[0.09] hover:bg-warm-900 hover:text-warm-100 hover:border-transparent'
			}`}
		>
			<span className="text-[15px]">{icon}</span>
			{label}
		</Link>
	);
}

// ─── View All Link ───────────────────────────────────────────────────────────

export function ViewAllLink({ to, label = 'View all →' }: { to: string; label?: string }) {
	return (
		<Link to={to} className="text-xs text-brand-500 font-medium hover:text-brand-600 transition-colors">
			{label}
		</Link>
	);
}

// ─── New Badge (inline count badge) ──────────────────────────────────────────

export function CountBadge({ count, label }: { count: number; label?: string }) {
	return (
		<span className="inline-block bg-[#FEF0E0] text-[#A05A10] text-[10px] font-medium px-[7px] py-[2px] rounded-[20px] ml-1.5 tracking-[0.03em]">
			{count} {label ?? 'new'}
		</span>
	);
}

// ─── Activity Feed ───────────────────────────────────────────────────────────

type ActivityColor = 'brand' | 'green' | 'blue' | 'brown';

const dotColors: Record<ActivityColor, string> = {
	brand: 'bg-brand-500',
	green: 'bg-[#4A6741]',
	blue: 'bg-[#1E5B8A]',
	brown: 'bg-[#8B5E3C]',
};

interface ActivityItem {
	text: string;
	time: string;
	color?: ActivityColor;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
	return (
		<div className="flex flex-col gap-3.5">
			{items.map((item, i) => (
				<div key={i} className="flex gap-3 items-start">
					<div className={`w-2 h-2 rounded-full mt-[5px] shrink-0 ${dotColors[item.color ?? 'brand']}`} />
					<div>
						<p className="text-[12.5px] text-warm-700 leading-relaxed">{item.text}</p>
						<p className="text-[11px] text-warm-400 mt-0.5">{item.time}</p>
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

// Warm, deterministic palette matching the admin revamp
const avatarTones = ['#c47420', '#4a6741', '#1e5b8a', '#8d2a4a', '#7a47a8', '#7a6a58'];

function hashName(name: string): number {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
	return Math.abs(h);
}

interface AvatarProps {
	name: string;
	size?: 'sm' | 'md' | 'lg' | number;
	src?: string | null;
	tone?: string;
}

export function Avatar({ name, size = 'sm', src, tone }: AvatarProps) {
	const px = typeof size === 'number'
		? size
		: size === 'sm' ? 28 : size === 'md' ? 36 : 44;
	const initials = (name || '?')
		.split(/\s+/)
		.map((w) => w[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
	const bg = tone ?? avatarTones[hashName(name || 'x') % avatarTones.length];
	const style = { width: px, height: px, fontSize: px * 0.38, letterSpacing: '0.02em' } as const;

	if (src) {
		return <img src={src} alt={name} style={{ width: px, height: px }} className="rounded-full object-cover shrink-0" />;
	}

	return (
		<span
			className="inline-flex items-center justify-center rounded-full text-white font-medium shrink-0"
			style={{ ...style, background: bg }}
		>
			{initials}
		</span>
	);
}

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'teal' | 'rose' | 'orange' | 'indigo';

const badgeClasses: Record<BadgeVariant, string> = {
	default: 'bg-warm-200 text-warm-700',
	green: 'bg-green-50 text-green-700',
	amber: 'bg-amber-50 text-amber-700',
	red: 'bg-red-50 text-red-700',
	blue: 'bg-blue-50 text-blue-700',
	purple: 'bg-purple-50 text-purple-700',
	teal: 'bg-teal-50 text-teal-700',
	rose: 'bg-rose-50 text-rose-700',
	orange: 'bg-orange-50 text-orange-700',
	indigo: 'bg-indigo-50 text-indigo-700',
};

interface BadgeProps {
	children: ReactNode;
	variant?: BadgeVariant;
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
	return (
		<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClasses[variant]}`}>
			{children}
		</span>
	);
}

// ─── Status badges for domain enums ─────────────────────────────────────────

type StagePillStyle = { bg: string; fg: string; dot: string; label: string };

export const STAGE_STYLES: Record<string, StagePillStyle> = {
	enquired:         { bg: '#fef3e7', fg: '#a35c17', dot: '#d98e3a', label: 'Enquired' },
	approved:         { bg: '#e8efe5', fg: '#3f5a36', dot: '#4a6741', label: 'Approved' },
	rejected:         { bg: '#f4e4e1', fg: '#883224', dot: '#a8412e', label: 'Rejected' },
	waitlisted:       { bg: '#e5ecf2', fg: '#1e5b8a', dot: '#2f78a9', label: 'Waitlisted' },
	placed:           { bg: '#e4ebe0', fg: '#3e5a2a', dot: '#5a7a3f', label: 'Placed' },
	puppy_reserved:   { bg: '#f6e5e9', fg: '#8d2a4a', dot: '#b8446a', label: 'Reserved' },
	puppy_booked:     { bg: '#e8dff0', fg: '#5a2d83', dot: '#7a47a8', label: 'Booked' },
	puppy_fully_paid: { bg: '#e4ebe0', fg: '#3e5a2a', dot: '#5a7a3f', label: 'Puppy booked & paid' },
};

export function StageBadge({ stage, size = 'md' }: { stage: string; size?: 'sm' | 'md' }) {
	const s = STAGE_STYLES[stage] ?? STAGE_STYLES.enquired;
	const pad = size === 'sm' ? 'px-2 py-[3px] text-[10.5px]' : 'px-2.5 py-[4px] text-[11px]';
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad}`}
			style={{ background: s.bg, color: s.fg }}
		>
			<span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} aria-hidden="true" />
			{s.label}
		</span>
	);
}

const puppyStatusVariant: Record<string, BadgeVariant> = {
	available: 'green',
	reserved: 'amber',
	placed: 'blue',
	retained: 'purple',
	not_for_sale: 'red',
};

const litterStatusVariant: Record<string, BadgeVariant> = {
	planned: 'default',
	available: 'purple',
	booked: 'amber',
	completed: 'default',
};

const stageLabel: Record<string, string> = {
	puppy_fully_paid: 'Puppy booked & paid',
};

function fmtStatus(s: string): string {
	return stageLabel[s] ?? s.replaceAll('_', ' ').replace(/^\w/, c => c.toUpperCase());
}

export function PuppyStatusBadge({ status }: { status: string }) {
	return <Badge variant={puppyStatusVariant[status] ?? 'default'}>{fmtStatus(status)}</Badge>;
}

export function LitterStatusBadge({ status }: { status: string }) {
	return <Badge variant={litterStatusVariant[status] ?? 'default'}>{fmtStatus(status)}</Badge>;
}

// Deterministically map a breed name to a consistent colour
const breedColours: BadgeVariant[] = ['blue', 'green', 'purple', 'teal', 'rose', 'amber', 'orange', 'indigo'];

function hashBreed(breed: string): number {
	let h = 0;
	for (let i = 0; i < breed.length; i++) h = (Math.imul(31, h) + breed.charCodeAt(i)) | 0;
	return Math.abs(h);
}

export function BreedBadge({ breed }: { breed: string }) {
	const variant = breedColours[hashBreed(breed) % breedColours.length];
	return <Badge variant={variant}>{getBreedSizeLabel(breed)}</Badge>;
}

// ─── Loading spinner ─────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
	const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
	const borders = { sm: 'border-2', md: 'border-2', lg: 'border-4' };
	return (
		<div
			role="status"
			aria-label="Loading…"
			className={`animate-spin rounded-full border-warm-200 border-t-brand-500 ${sizes[size]} ${borders[size]}`}
		/>
	);
}

export function LoadingPage() {
	return (
		<div className="flex items-center justify-center min-h-64">
			<Spinner size="lg" />
		</div>
	);
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description }: { icon?: string; title: string; description?: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			{icon && <div className="text-4xl mb-4" aria-hidden="true">{icon}</div>}
			<h3 className="text-warm-700 font-medium">{title}</h3>
			{description && <p className="text-warm-500 text-sm mt-1 max-w-xs">{description}</p>}
		</div>
	);
}

// ─── Section Title (for card groups) ─────────────────────────────────────────

export function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<h2 className="font-serif text-[15px] text-warm-900 mb-3.5">{children}</h2>
	);
}

// ─── Primary / Secondary Buttons ─────────────────────────────────────────────

interface ButtonProps {
	children: ReactNode;
	variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
	size?: 'sm' | 'md';
	onClick?: () => void;
	disabled?: boolean;
	type?: 'button' | 'submit';
	className?: string;
}

const buttonVariants = {
	primary: 'bg-brand-500 hover:bg-brand-600 text-white border-transparent',
	secondary: 'bg-warm-50 hover:bg-warm-200 text-warm-700 border-warm-200',
	danger: 'bg-red-500 hover:bg-red-600 text-white border-transparent',
	ghost: 'bg-transparent hover:bg-warm-100 text-warm-600 border-transparent',
};

const buttonSizes = {
	sm: 'px-3 py-1.5 text-xs',
	md: 'px-4 py-2.5 text-sm',
};

export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', className = '' }: ButtonProps) {
	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			className={`inline-flex items-center justify-center font-medium rounded-[9px] border transition-colors disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
		>
			{children}
		</button>
	);
}

// ─── Input ───────────────────────────────────────────────────────────────────

export const inputCls = "w-full px-3 py-2 bg-white border border-warm-200 rounded-lg text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition-colors";
export const selectCls = "w-full px-3 py-2 bg-white border border-warm-200 rounded-lg text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition-colors";
export const labelCls = "block text-xs font-medium text-warm-700 uppercase tracking-wide mb-1.5";

// ─── Segmented (pill tab group with counts) ──────────────────────────────────

export interface SegmentedOption<T extends string = string> {
	value: T;
	label: string;
	count?: number;
}

interface SegmentedProps<T extends string = string> {
	options: SegmentedOption<T>[];
	value: T;
	onChange: (value: T) => void;
	ariaLabel?: string;
}

export function Segmented<T extends string = string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
	return (
		<div
			role="tablist"
			aria-label={ariaLabel}
			className="inline-flex bg-warm-100 rounded-[10px] p-1 gap-1 border border-warm-200 flex-wrap"
		>
			{options.map((o) => {
				const active = value === o.value;
				return (
					<button
						key={o.value}
						role="tab"
						aria-selected={active}
						onClick={() => onChange(o.value)}
						className={`px-3.5 h-8 rounded-[7px] text-[12.5px] font-medium transition-colors ${
							active ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-600 hover:text-warm-800'
						}`}
					>
						{o.label}
						{typeof o.count === 'number' && (
							<span className="ml-1.5 text-warm-400 tabular-nums">{o.count}</span>
						)}
					</button>
				);
			})}
		</div>
	);
}

// ─── Deposit pill ────────────────────────────────────────────────────────────

type DepositStatus = 'none' | 'pending' | 'paid' | null | undefined;
type DepositTier = 'r500' | 'r5000' | null | undefined;

export function DepositPill({ status, tier }: { status: DepositStatus; tier: DepositTier }) {
	if (!status || status === 'none') {
		return (
			<span className="inline-block px-2 py-[3px] rounded-full text-[10.5px] font-medium bg-stone-100 text-stone-500">
				No deposit
			</span>
		);
	}
	const amount = tier === 'r500' ? '500' : '5,000';
	if (status === 'pending') {
		return (
			<span
				className="inline-block px-2 py-[3px] rounded-full text-[10.5px] font-medium"
				style={{ background: '#fef3e7', color: '#a35c17' }}
			>
				Pending · R{amount}
			</span>
		);
	}
	return (
		<span
			className="inline-block px-2 py-[3px] rounded-full text-[10.5px] font-medium"
			style={{ background: '#e4ebe0', color: '#3e5a2a' }}
		>
			Paid · R{amount}
		</span>
	);
}
