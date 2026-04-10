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

type StatAccent = 'brand' | 'brown' | 'green' | 'blue';

const accentColors: Record<StatAccent, string> = {
	brand: 'before:bg-brand-500',
	brown: 'before:bg-[#8B5E3C]',
	green: 'before:bg-[#4A6741]',
	blue: 'before:bg-[#1E5B8A]',
};

interface StatCardProps {
	icon: string;
	value: number;
	label: string;
	accent?: StatAccent;
	trend?: { text: string; variant?: 'success' | 'alert' };
	to?: string;
}

export function StatCard({ icon, value, label, accent = 'brand', trend, to }: StatCardProps) {
	const content = (
		<div className={`bg-white rounded-[14px] border border-black/[0.07] p-5 pb-[18px] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:rounded-t-[14px] ${accentColors[accent]} ${to ? 'hover:shadow-card-hover transition-shadow cursor-pointer' : ''}`}>
			<span className="text-xl block mb-3.5">{icon}</span>
			<p className="font-serif text-[34px] text-warm-900 leading-none mb-1">{value}</p>
			<p className="text-xs text-warm-500 uppercase tracking-[0.04em]">{label}</p>
			{trend && (
				<span className={`absolute top-5 right-4 text-[11px] font-medium px-2 py-[3px] rounded-[20px] ${
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

const avatarBgs: string[] = [
	'bg-[#FEF0E0] text-[#A05A10]',
	'bg-[#EAF3E0] text-[#3A6830]',
	'bg-[#E8F0FE] text-[#1E5B8A]',
	'bg-[#F3E8FE] text-[#6B3FA0]',
	'bg-[#FEE8E8] text-[#A03030]',
	'bg-brand-100 text-brand-700',
];

function hashName(name: string): number {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
	return Math.abs(h);
}

interface AvatarProps {
	name: string;
	size?: 'sm' | 'md' | 'lg';
	src?: string | null;
}

export function Avatar({ name, size = 'sm', src }: AvatarProps) {
	const sizes = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' };
	const initials = name
		.split(' ')
		.map((w) => w[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
	const bg = avatarBgs[hashName(name) % avatarBgs.length];

	if (src) {
		return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover shrink-0`} />;
	}

	return (
		<div className={`${sizes[size]} rounded-full flex items-center justify-center font-medium shrink-0 ${bg}`}>
			{initials}
		</div>
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

const stageVariant: Record<string, BadgeVariant> = {
	enquired:       'default',
	approved:       'blue',
	rejected:       'red',
	waitlisted:     'amber',
	placed:         'green',
	match_requested:'purple',
	matched:        'purple',
	matched_paid:   'green',
};

const puppyStatusVariant: Record<string, BadgeVariant> = {
	available: 'green',
	reserved: 'amber',
	placed: 'blue',
	retained: 'purple',
	not_for_sale: 'red',
};

const litterStatusVariant: Record<string, BadgeVariant> = {
	planned: 'default',
	born: 'green',
	available: 'purple',
	completed: 'default',
};

export function StageBadge({ stage }: { stage: string }) {
	return <Badge variant={stageVariant[stage] ?? 'default'}>{stage.replaceAll('_', ' ')}</Badge>;
}

export function PuppyStatusBadge({ status }: { status: string }) {
	return <Badge variant={puppyStatusVariant[status] ?? 'default'}>{status.replaceAll('_', ' ')}</Badge>;
}

export function LitterStatusBadge({ status }: { status: string }) {
	return <Badge variant={litterStatusVariant[status] ?? 'default'}>{status.replaceAll('_', ' ')}</Badge>;
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
