import type { ReactNode } from 'react';

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
	children: ReactNode;
	className?: string;
}

export function Card({ children, className = '' }: CardProps) {
	return (
		<div className={`bg-white rounded-xl border border-stone-200 ${className}`}>
			{children}
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
		<div className="flex items-start justify-between mb-8">
			<div>
				<h1 className="text-2xl font-bold text-stone-900">{title}</h1>
				{subtitle && <p className="text-stone-600 mt-1 text-sm">{subtitle}</p>}
			</div>
			{action && <div>{action}</div>}
		</div>
	);
}

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'teal' | 'rose' | 'orange' | 'indigo';

const badgeClasses: Record<BadgeVariant, string> = {
	default: 'bg-stone-100 text-stone-700',
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
	confirmed: 'blue',
	born: 'green',
	weaning: 'amber',
	ready: 'purple',
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
	return <Badge variant={variant}>{breed}</Badge>;
}

// ─── Loading spinner ─────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
	const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
	const borders = { sm: 'border-2', md: 'border-2', lg: 'border-4' };
	return (
		<div
			role="status"
			aria-label="Loading…"
			className={`animate-spin rounded-full border-stone-200 border-t-brand-500 ${sizes[size]} ${borders[size]}`}
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
			<h3 className="text-stone-700 font-medium">{title}</h3>
			{description && <p className="text-stone-500 text-sm mt-1 max-w-xs">{description}</p>}
		</div>
	);
}
