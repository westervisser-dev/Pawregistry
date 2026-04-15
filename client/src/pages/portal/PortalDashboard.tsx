import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { LoadingPage, Card, Badge, useFocusTrap } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Client, ClientApplication } from '@paw-registry/shared';
import { BREEDS, BREED_SIZES } from '@paw-registry/shared';

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip() {
	const [visible, setVisible] = useState(false);
	const ref = useRef<HTMLSpanElement>(null);

	return (
		<span className="relative inline-flex items-center" ref={ref}>
			<button
				type="button"
				aria-label="More information"
				onMouseEnter={() => setVisible(true)}
				onMouseLeave={() => setVisible(false)}
				onFocus={() => setVisible(true)}
				onBlur={() => setVisible(false)}
				className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-full bg-warm-200 text-warm-500 text-[9px] font-bold cursor-default hover:bg-warm-300 transition-colors leading-none"
				aria-describedby="deposit-tooltip"
			>
				?
			</button>
			{visible && (
				<span
					id="deposit-tooltip"
					role="tooltip"
					className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] w-[210px] bg-warm-900 text-[#F0EDEA] text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-lg z-50 pointer-events-none"
				>
					The Secured List (R5,000) gets first pick from every litter. The Standard List (R500) is offered puppies that remain. You can upgrade at any time from the Payments page.
					<span className="absolute left-1/2 -translate-x-1/2 top-full border-[5px] border-transparent border-t-warm-900" />
				</span>
			)}
		</span>
	);
}

// ─── Client Action Center ────────────────────────────────────────────────────

type ActionColor = 'amber' | 'blue' | 'purple' | 'green';

const ACTION_PILL: Record<ActionColor, string> = {
	amber: 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800',
	blue: 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800',
	purple: 'bg-violet-100 hover:bg-violet-200 border-violet-300 text-violet-800',
	green: 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800',
};

const ACTION_DOT: Record<ActionColor, string> = {
	amber: 'bg-amber-500',
	blue: 'bg-blue-500',
	purple: 'bg-violet-500',
	green: 'bg-green-500',
};

type TemplateItem = { id: string; name: string; checkedAt: string | null; uploadedFileUrl: string | null };

type PendingNotification = { litterId: string; litterName: string; breed: string | null };

type Action =
	| { type: 'link'; label: string; to: string; color: ActionColor }
	| { type: 'button'; label: string; onClick: () => void; color: ActionColor }
	| { type: 'status'; label: string; color: ActionColor }
	| { type: 'dismissible-link'; label: string; to: string; color: ActionColor; dismissKey: string }
	| { type: 'dismissible-status'; label: string; color: ActionColor; dismissKey: string };

function ClientActionCenter({
	client,
	templates,
	pendingNotifications,
	pendingBookingPayment,
	pendingDepositPayment,
}: {
	client: Client;
	templates: TemplateItem[] | null;
	pendingNotifications: PendingNotification[];
	pendingBookingPayment: { amountRands: number; expiresAt: string | null; authorizationUrl: string | null; paymentType: 'booking' | 'final'; isInstalment: boolean; instalmentIndex: number | null; instalmentTotal: number | null; dueDate: string | null } | null;
	pendingDepositPayment: { amountRands: number; authorizationUrl: string | null } | null;
}) {
	const [dismissed, setDismissed] = useState<Set<string>>(() => {
		try {
			const raw = localStorage.getItem('dismissed_litter_notifications');
			return new Set(raw ? JSON.parse(raw) : []);
		} catch {
			return new Set();
		}
	});

	function dismiss(key: string) {
		setDismissed((prev) => {
			const next = new Set(prev);
			next.add(key);
			try { localStorage.setItem('dismissed_litter_notifications', JSON.stringify([...next])); } catch { /* ignore */ }
			return next;
		});
	}

	const actions: Action[] = [];

	// Pending booking / final payment — highest priority, shown first (only when client is in a booking stage)
	if (pendingBookingPayment && ['puppy_reserved', 'puppy_booked'].includes(client.stage)) {
		const hoursLeft = pendingBookingPayment.expiresAt
			? Math.max(0, Math.floor((new Date(pendingBookingPayment.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
			: null;
		const urgencyLabel = hoursLeft !== null
			? ` — ${hoursLeft}h left`
			: '';

		let paymentLabel: string;
		if (pendingBookingPayment.paymentType === 'booking') {
			paymentLabel = 'Booking deposit';
		} else if (pendingBookingPayment.isInstalment && pendingBookingPayment.instalmentIndex !== null && pendingBookingPayment.instalmentTotal !== null) {
			paymentLabel = `Instalment ${pendingBookingPayment.instalmentIndex + 1} of ${pendingBookingPayment.instalmentTotal}`;
		} else {
			paymentLabel = 'Final payment';
		}

		const dueDateLabel = pendingBookingPayment.dueDate
			? new Date(pendingBookingPayment.dueDate) < new Date()
				? ' (OVERDUE)'
				: ` — due ${new Date(pendingBookingPayment.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`
			: '';

		actions.push({
			type: 'link',
			label: `💳 ${paymentLabel}: R${pendingBookingPayment.amountRands.toLocaleString()}${urgencyLabel}${dueDateLabel}`,
			to: '/portal/payments',
			color: 'amber',
		});
	}

	// Pending deposit payment (failed/abandoned from apply flow or portal)
	if (pendingDepositPayment) {
		actions.push({
			type: 'link',
			label: `💳 Deposit payment pending: R${pendingDepositPayment.amountRands.toLocaleString()} — complete it to secure your spot`,
			to: '/portal/payments',
			color: 'amber',
		});
	}

	if (client.stage === 'enquired') {
		actions.push({
			type: 'status',
			label: 'Application received — we\'ll be in touch shortly',
			color: 'blue',
		});
	}

	if (client.stage === 'approved' && templates !== null) {
		const total = templates.length;
		const checked = templates.filter((t) => t.checkedAt !== null).length;
		const uploaded = templates.filter((t) => t.uploadedFileUrl !== null).length;
		if (total > 0 && uploaded < total) {
			actions.push({
				type: 'link',
				label: `Upload your documents (${uploaded} of ${total} complete)`,
				to: '/portal/documents',
				color: 'blue',
			});
		} else if (total > 0 && uploaded === total && checked < total) {
			actions.push({
				type: 'dismissible-status',
				label: 'Hang tight — we\'re reviewing your documents before placing you on the waitlist',
				color: 'blue',
				dismissKey: 'docs-under-review',
			});
		}
	}

	if (client.stage === 'waitlisted') {
		const isPaidR500 = client.depositStatus === 'paid' && client.depositTier === 'r500';
		const isPaidR5000 = client.depositStatus === 'paid' && client.depositTier === 'r5000';
		const hasUndismissedNotification = pendingNotifications.some((n) => !dismissed.has(n.litterId));
		if (!pendingBookingPayment) {
			if (!isPaidR5000) {
				actions.push({
					type: 'dismissible-link',
					label: isPaidR500
						? 'Increase your deposit payment to increase your waitlist order'
						: 'Add a deposit payment to increase your waitlist order',
					to: '/portal/payments',
					color: 'amber',
					dismissKey: isPaidR500 ? 'deposit-upgrade' : 'deposit-add',
				});
			}
			if (!hasUndismissedNotification) {
				actions.push({
					type: 'status',
					label: 'You\'re on the waitlist — we\'ll notify you when a litter becomes available',
					color: 'blue',
				});
			}
		}
	}

	if (client.stage === 'puppy_reserved' && !pendingBookingPayment) {
		actions.push({
			type: 'status',
			label: 'Your puppy is reserved — complete your booking payment to secure it!',
			color: 'amber',
		});
	}

	if (client.stage === 'puppy_booked' && !pendingBookingPayment) {
		actions.push({
			type: 'status',
			label: 'Your puppy is booked — congratulations! We\'ll be in touch regarding next steps.',
			color: 'green',
		});
	}

	for (const notif of pendingNotifications) {
		if (!dismissed.has(notif.litterId)) {
			actions.push({
				type: 'dismissible-link',
				label: `New litter available — select your puppy${notif.litterName ? ` from ${notif.litterName}` : ''}`,
				to: `/portal/litters/${notif.litterId}`,
				color: 'purple',
				dismissKey: notif.litterId,
			});
		}
	}

	if (actions.length === 0) return null;

	return (
		<div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
			<p className="text-xs font-semibold text-amber-700 uppercase tracking-[0.06em] mb-3">
				⚡ What's next for you
			</p>
			<div className="flex flex-wrap gap-2">
				{actions.map((action, i) => {
					const pillClass = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${ACTION_PILL[action.color]}`;
					const dot = <span className={`w-1.5 h-1.5 rounded-full ${ACTION_DOT[action.color]}`} aria-hidden="true" />;

					if (action.type === 'status') {
						return (
							<span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${ACTION_PILL[action.color]} cursor-default`}>
								{dot}
								{action.label}
							</span>
						);
					}

					if (action.type === 'dismissible-status') {
						return (
							<span key={i} className="inline-flex items-center">
								<span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-l-full border border-r-0 text-xs font-medium cursor-default ${ACTION_PILL[action.color]}`}>
									{dot}
									{action.label}
								</span>
								<button
									type="button"
									aria-label="Dismiss"
									onClick={() => dismiss(action.dismissKey)}
									className={`inline-flex items-center justify-center w-6 py-1.5 rounded-r-full border text-[10px] transition-colors cursor-pointer ${ACTION_PILL[action.color]}`}
								>
									✕
								</button>
							</span>
						);
					}

					if (action.type === 'dismissible-link') {
						return (
							<span key={i} className="inline-flex items-center">
								<Link to={action.to} className={`${pillClass} rounded-r-none border-r-0`}>
									{dot}
									{action.label}
								</Link>
								<button
									type="button"
									aria-label="Dismiss"
									onClick={() => dismiss(action.dismissKey)}
									className={`inline-flex items-center justify-center w-6 py-1.5 rounded-r-full border text-[10px] transition-colors cursor-pointer ${ACTION_PILL[action.color]}`}
								>
									✕
								</button>
							</span>
						);
					}

					if (action.type === 'link') {
						return (
							<Link key={i} to={action.to} className={pillClass}>
								{dot}
								{action.label}
							</Link>
						);
					}

					return (
						<button key={i} type="button" onClick={action.onClick} className={pillClass}>
							{dot}
							{action.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ─── Stage Data ──────────────────────────────────────────────────────────────

const STAGES = [
	{
		key: 'enquired',
		label: 'Enquired',
		variant: 'default' as const,
		icon: '📝',
		description: 'Your application has been received. Our team will review your details and reach out if we need anything further.',
		trigger: 'Happens automatically once you complete the onboarding form.',
	},
	{
		key: 'approved',
		label: 'Approved',
		variant: 'blue' as const,
		icon: '✅',
		description: 'Your application has been reviewed and approved — great news! You\'ll now be asked to complete a set of supporting documents.',
		trigger: 'Set by our team after reviewing your application.',
	},
	{
		key: 'waitlisted',
		label: 'Waitlisted',
		variant: 'amber' as const,
		icon: '⏳',
		description: 'You\'re on the waitlist! All your required documents have been checked off and you\'re in line for a future litter.',
		trigger: 'Happens automatically once all required documents are submitted.',
	},
	{
		key: 'puppy_reserved',
		label: 'Puppy Reserved',
		variant: 'purple' as const,
		icon: '🔍',
		description: 'You\'ve reserved a puppy! Complete your booking payment within 24 hours to secure your selection.',
		trigger: 'Happens when you select a puppy from an available litter.',
	},
	{
		key: 'puppy_booked',
		label: 'Puppy Booked',
		variant: 'purple' as const,
		icon: '💜',
		description: 'Your puppy is booked — congratulations! Final payment and go-home arrangements will be confirmed shortly.',
		trigger: 'Happens once your booking payment is confirmed.',
	},
	{
		key: 'puppy_fully_paid',
		label: 'Puppy Booked & Paid',
		variant: 'green' as const,
		icon: '🎉',
		description: 'Everything is in order — your puppy is ready to come home! Our team will coordinate the final handover details with you.',
		trigger: 'Confirmed once full payment has been received.',
	},
] as const;

const STAGE_STEPS = [
	{ key: 'enquired', label: 'Applied' },
	{ key: 'approved', label: 'Approved' },
	{ key: 'waitlisted', label: 'Waitlisted' },
	{ key: 'puppy_booked', label: 'Booked' },
	{ key: 'puppy_fully_paid', label: 'Complete' },
];

function getStageIndex(stage: string): number {
	const idx = STAGE_STEPS.findIndex(s => s.key === stage);
	if (idx >= 0) return idx;
	if (stage === 'puppy_reserved') return 3;
	return 0;
}

// ─── Breed / Size Helpers ────────────────────────────────────────────────────

function formatBreedSize(raw: string | null | undefined): { breed: string; size: string | null } | null {
	if (!raw) return null;
	const [breedRaw, sizeRaw] = raw.split(' - ');
	return {
		breed: BREEDS.find((b) => b.value === breedRaw)?.label ?? breedRaw,
		size: sizeRaw ? (BREED_SIZES[breedRaw]?.find((s) => s.value === sizeRaw)?.label ?? sizeRaw) : null,
	};
}

const SEX_LABELS: Record<string, string> = {
	male: 'Male',
	female: 'Female',
	no_preference: 'No preference',
};

const BUDGET_LABELS: Record<string, string> = {
	r5k_r10k: 'R5,000 – R10,000',
	r10k_r20k: 'R10,000 – R20,000',
	r30k_r40k: 'R30,000 – R40,000',
	r40k_plus: 'R40,000+',
};

// ─── Stages Modal ────────────────────────────────────────────────────────────

function StagesModal({ currentStage, onClose }: { currentStage: string; onClose: () => void }) {
	const dialogRef = useFocusTrap(true, onClose);
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
			aria-hidden="true"
			onClick={onClose}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
				aria-hidden="false"
				className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-black/[0.05]">
					<div>
						<h2 id="modal-title" className="font-serif text-lg font-bold text-warm-900">How do the stages work?</h2>
						<p className="text-xs text-warm-500 mt-0.5">Follow your journey from application to bringing your puppy home.</p>
					</div>
					<button
						onClick={onClose}
						aria-label="Close"
						className="text-warm-400 hover:text-warm-600 text-xl leading-none ml-4 cursor-pointer"
					>
						✕
					</button>
				</div>

				<div className="overflow-y-auto px-6 py-4 space-y-4">
					{STAGES.map((stage, i) => {
						const isCurrent = stage.key === currentStage;
						const currentIdx = STAGES.findIndex(s => s.key === currentStage);
						const isPast = i < currentIdx;

						return (
							<div
								key={stage.key}
								className={`relative flex gap-4 rounded-xl p-4 border transition-colors ${
									isCurrent
										? 'border-brand-200 bg-brand-50/40'
										: isPast
											? 'border-black/[0.05] bg-warm-50 opacity-60'
											: 'border-black/[0.05] bg-white'
								}`}
							>
								{i < STAGES.length - 1 && (
									<div className="absolute left-[2.35rem] top-[3.5rem] bottom-[-1.25rem] w-px bg-warm-100 z-0" />
								)}

								<div className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base border ${
									isCurrent ? 'bg-white border-brand-300 shadow-sm' : 'bg-white border-warm-200'
								}`}>
									{isPast ? <span className="text-warm-400 text-sm">✓</span> : stage.icon}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<Badge variant={stage.variant}>{stage.label}</Badge>
										{isCurrent && (
											<span className="text-xs text-brand-600 font-medium">← You are here</span>
										)}
									</div>
									<p className="text-sm text-warm-700 leading-relaxed">{stage.description}</p>
									<p className="text-xs text-warm-400 mt-1.5 italic">{stage.trigger}</p>
								</div>
							</div>
						);
					})}
				</div>

				<div className="px-6 py-4 border-t border-black/[0.05]">
					<button
						onClick={onClose}
						className="w-full py-2.5 bg-warm-900 text-white text-sm font-medium rounded-lg hover:bg-warm-800 transition-colors cursor-pointer"
					>
						Got it
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Stage Progress (full-width, aligned dots + labels) ──────────────────────

function StageProgress({ currentStage }: { currentStage: string }) {
	const activeIdx = getStageIndex(currentStage);

	return (
		<div className="mt-4">
			{/* Dots & lines — each step takes equal width via flex-1 */}
			<div className="flex items-center">
				{STAGE_STEPS.map((step, i) => {
					const isDone = i < activeIdx;
					const isActive = i === activeIdx;

					return (
						<div key={step.key} className={`flex items-center ${i < STAGE_STEPS.length - 1 ? 'flex-1' : ''}`}>
							<div
								className={`w-[10px] h-[10px] rounded-full shrink-0 transition-colors ${
									isDone
										? 'bg-[#5DBB55]'
										: isActive
											? 'bg-brand-500 ring-[3px] ring-brand-500/20'
											: 'bg-warm-300'
								}`}
							/>
							{i < STAGE_STEPS.length - 1 && (
								<div
									className={`h-0.5 flex-1 transition-colors ${
										isDone ? 'bg-[#5DBB55]' : 'bg-warm-300'
									}`}
								/>
							)}
						</div>
					);
				})}
			</div>

			{/* Labels — aligned under each dot via matching grid */}
			<div className="flex mt-2">
				{STAGE_STEPS.map((step, i) => {
					const isActive = i === activeIdx;
					return (
						<div key={step.key} className={`${i < STAGE_STEPS.length - 1 ? 'flex-1' : ''}`}>
							<span
								className={`text-[10px] ${
									isActive
										? 'text-brand-500 font-medium'
										: 'text-warm-400'
								}`}
							>
								{step.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ─── Welcome Banner ──────────────────────────────────────────────────────────

function WelcomeBanner({ firstName, stage }: { firstName: string; stage: string }) {
	const stageLabel = STAGES.find(s => s.key === stage)?.label ?? stage;
	const isPositiveStage = ['approved', 'waitlisted', 'puppy_reserved', 'puppy_booked', 'puppy_fully_paid'].includes(stage);

	return (
		<div className="bg-gradient-to-br from-warm-50 to-brand-50 rounded-2xl px-7 py-7 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden border border-brand-100/60">
			<div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-brand-200/25 pointer-events-none" />
			<div className="absolute -bottom-12 right-16 w-30 h-30 rounded-full bg-brand-300/15 pointer-events-none" />

			<div className="relative z-[1]">
				<h1 className="font-serif text-[26px] text-warm-900 leading-[1.15]">
					Welcome back, {firstName} 👋
				</h1>
				<p className="text-[13px] text-warm-500 mt-1.5">
					Here's the latest on your puppy journey.
				</p>
			</div>

			<div className={`relative z-[1] flex items-center gap-2 rounded-full px-5 py-2.5 border ${
				isPositiveStage
					? 'bg-[#EAF7E8] border-[rgba(74,160,65,0.25)]'
					: 'bg-white border-warm-200'
			}`}>
				{isPositiveStage && (
					<div className="w-2 h-2 rounded-full bg-[#5DBB55] shrink-0" />
				)}
				<div>
					<div className={`text-[13px] font-medium tracking-[0.02em] ${
						isPositiveStage ? 'text-[#3A7835]' : 'text-warm-700'
					}`}>
						{stageLabel}
					</div>
					<div className={`text-[11px] mt-px ${
						isPositiveStage ? 'text-[rgba(58,120,53,0.55)]' : 'text-warm-400'
					}`}>
						Application stage
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function PortalDashboard() {
	const [client, setClient] = useState<Client | null>(null);
	const [loading, setLoading] = useState(true);
	const [showStages, setShowStages] = useState(false);
	const [waitlistPosition, setWaitlistPosition] = useState<{ position: number | null; total: number | null } | null>(null);
	const [templates, setTemplates] = useState<TemplateItem[] | null>(null);
	const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
	const [pendingBookingPayment, setPendingBookingPayment] = useState<{ amountRands: number; expiresAt: string | null; authorizationUrl: string | null; paymentType: 'booking' | 'final'; isInstalment: boolean; instalmentIndex: number | null; instalmentTotal: number | null; dueDate: string | null } | null>(null);
	const [pendingDepositPayment, setPendingDepositPayment] = useState<{ amountRands: number; authorizationUrl: string | null } | null>(null);
	const setClientStage = useAuthStore(s => s.setClientStage);
	const mountedRef = useRef(true);

	usePageTitle('Dashboard');

	const loadClient = useCallback((isInitial = false) => {
		api.clients.me.get().then(({ data }) => {
			if (!mountedRef.current) return;
			if (data) {
				const c = data as Client;
				setClient(c);
				setClientStage(c.stage);
				if (c.stage === 'waitlisted') {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(api.clients.me as any)['waitlist-position'].get().then(({ data: pos }: { data: { position: number | null; total: number | null } | null }) => {
						if (mountedRef.current && pos) setWaitlistPosition(pos);
					});
				} else {
					setWaitlistPosition(null);
				}
				if (c.stage === 'approved') {
					api.templates.my.get().then(({ data: tmpl }) => {
						if (mountedRef.current && tmpl) setTemplates(tmpl as TemplateItem[]);
					});
				}
				if (['waitlisted', 'puppy_reserved'].includes(c.stage)) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(api.litters.portal as any)['my-pending-notifications'].get().then(({ data: notifs }: { data: PendingNotification[] | null }) => {
						if (mountedRef.current && notifs) setPendingNotifications(notifs);
					}).catch(() => {});
				}
				// Check for any pending booking, final, or deposit payments
				api.payments.mine.get().then(({ data: pmts }) => {
					if (!mountedRef.current || !pmts) return;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const allPayments = pmts as any[];
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const pendingBooking = allPayments.find((p: any) => p.status === 'pending' && (p.type === 'booking' || p.type === 'final'));
					if (pendingBooking) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const meta = (pendingBooking.metadata ?? {}) as any;
						setPendingBookingPayment({
							amountRands: pendingBooking.amountRands,
							expiresAt: pendingBooking.expiresAt ?? null,
							authorizationUrl: pendingBooking.authorizationUrl ?? null,
							paymentType: pendingBooking.type,
							isInstalment: !!meta.isInstalment,
							instalmentIndex: meta.instalmentIndex ?? null,
							instalmentTotal: meta.instalmentTotal ?? null,
							dueDate: pendingBooking.dueDate ?? null,
						});
					}
					// Check for pending deposit payment (failed/abandoned from apply flow)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const pendingDeposit = allPayments.find((p: any) => p.status === 'pending' && p.type === 'deposit');
					if (pendingDeposit && c.depositStatus !== 'paid') {
						setPendingDepositPayment({
							amountRands: pendingDeposit.amountRands,
							authorizationUrl: pendingDeposit.authorizationUrl ?? null,
						});
					}
				}).catch(() => {});
			}
			if (isInitial && mountedRef.current) setLoading(false);
		}).catch(() => {
			if (isInitial && mountedRef.current) setLoading(false);
		});
	}, [setClientStage]);

	useEffect(() => {
		mountedRef.current = true;
		loadClient(true);
		const interval = setInterval(() => loadClient(false), 30_000);
		return () => {
			mountedRef.current = false;
			clearInterval(interval);
		};
	}, [loadClient]);

if (loading) return <LoadingPage />;
	if (!client) return <div className="text-warm-500">No client record linked to your account.</div>;

	const app = client.applicationData as unknown as ClientApplication | undefined;
	const fullName = `${client.firstName} ${client.lastName}`;
	const initials = `${client.firstName?.[0] ?? ''}${client.lastName?.[0] ?? ''}`.toUpperCase();
	const stageLabel = STAGES.find(s => s.key === client.stage)?.label ?? client.stage.replaceAll('_', ' ');

	const firstChoice = formatBreedSize(app?.preferredBreedSize);
	const secondChoice = formatBreedSize(app?.secondChoiceBreedSize);

	return (
		<div>
			{/* Welcome banner */}
			<WelcomeBanner firstName={client.firstName} stage={client.stage} />

			{/* Action center */}
			<ClientActionCenter
				client={client}
				templates={templates}
				pendingNotifications={pendingNotifications}
				pendingBookingPayment={pendingBookingPayment}
				pendingDepositPayment={pendingDepositPayment}
			/>

			{/* Two-column top row */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">

				{/* ── Application Stage card ── */}
				<Card className="p-[22px] flex flex-col">
					{/* Header row: label + stage pill inline */}
					<div className="flex items-center justify-between">
						<p className="text-[10.5px] uppercase tracking-[0.07em] text-warm-400 font-medium">
							Application Stage
						</p>
						<div className="inline-flex items-center gap-1.5 bg-[#EAF7E8] text-[#3A7835] text-[12.5px] font-medium px-3 py-[5px] rounded-full border border-[rgba(74,160,65,0.2)]">
							<div className="w-1.5 h-1.5 rounded-full bg-[#5DBB55]" />
							{stageLabel}
						</div>
					</div>

					{/* Waitlist position — only shown when waitlisted */}
					{client.stage === 'waitlisted' && waitlistPosition?.position != null && (() => {
						const hasActiveLitterNotif = pendingNotifications.length > 0 && pendingNotifications.some((n) => {
							try {
								const raw = localStorage.getItem('dismissed_litter_notifications');
								const d = new Set(raw ? JSON.parse(raw) as string[] : []);
								return !d.has(n.litterId);
							} catch { return true; }
						});
						return (
							<div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200/70 px-4 py-3">
								<div className="flex items-baseline gap-1 shrink-0">
									<span className="font-serif text-[28px] leading-none text-amber-700 font-bold">
										#{waitlistPosition.position}
									</span>
									{waitlistPosition.total != null && (
										<span className="text-[11px] text-amber-500 font-medium">
											of {waitlistPosition.total}
										</span>
									)}
								</div>
								<div className="min-w-0">
									<p className="text-[12.5px] font-medium text-amber-800">Waiting list position</p>
									<p className="text-[11px] text-amber-600/80 mt-0.5 leading-relaxed">
										{hasActiveLitterNotif
											? 'A litter has been suggested for you — check your actions above.'
											: 'Your spot is reserved — we\'ll be in touch when a litter is available.'}
									</p>
								</div>
							</div>
						);
					})()}

					{/* Spacer pushes progress bar toward bottom, capped so it doesn't over-expand */}
					<div className={`flex-1 ${client.stage === 'waitlisted' ? 'min-h-[8px] max-h-[20px]' : 'min-h-[20px] max-h-[52px]'}`} />

					{/* Full-width progress bar */}
					<StageProgress currentStage={client.stage} />

					<button
						onClick={() => setShowStages(true)}
						className="mt-3.5 text-xs text-brand-500 hover:text-brand-600 cursor-pointer transition-colors"
					>
						How do the stages work? →
					</button>
				</Card>

				{/* ── Puppy Preferences card ── */}
				<Card className="p-[22px]">
					<div className="flex items-center justify-between mb-3.5">
						<p className="text-[10.5px] uppercase tracking-[0.07em] text-warm-400 font-medium">
							Puppy Preferences
						</p>
						<Link
							to="/portal/preferences"
							className="text-xs text-brand-500 font-medium px-3 py-[5px] rounded-lg border border-brand-500/30 bg-brand-50 hover:bg-brand-500 hover:text-white hover:border-transparent transition-all"
						>
							Edit preferences
						</Link>
					</div>

					{/* First choice */}
					<div className="mb-3">
						<p className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">First choice</p>
						{firstChoice ? (
							<p className="text-sm text-warm-800">
								<span className="font-medium">{firstChoice.breed}</span>
								{firstChoice.size && <span className="text-warm-400"> · {firstChoice.size}</span>}
							</p>
						) : (
							<p className="text-sm text-warm-300">—</p>
						)}
					</div>

					{/* Second choice */}
					{secondChoice && (
						<div className="mb-3">
							<p className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">Second choice</p>
							<p className="text-sm text-warm-800">
								<span className="font-medium">{secondChoice.breed}</span>
								{secondChoice.size && <span className="text-warm-400"> · {secondChoice.size}</span>}
							</p>
						</div>
					)}

					{/* Sex preference */}
					<div className="flex gap-6 mt-3 pt-3 border-t border-black/[0.06]">
						<div>
							<p className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">Sex</p>
							<p className="text-[13px] text-warm-800">{SEX_LABELS[app?.preferredSex ?? ''] ?? '—'}</p>
						</div>
						{app?.preferredColour && (
							<div>
								<p className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">Colour</p>
								<p className="text-[13px] text-warm-800">{app.preferredColour}</p>
							</div>
						)}
					</div>
					{!!app?.budget && (
						<div className="mt-3 pt-3 border-t border-black/[0.06]">
							<p className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">Budget</p>
							<p className="text-[13px] text-warm-800">{BUDGET_LABELS[app.budget as string] ?? String(app.budget)}</p>
						</div>
					)}
				</Card>
			</div>

			{/* ── Your Details card (merged contact + details) ── */}
			<Card className="p-6 sm:p-7">
				<div className="flex items-center justify-between mb-5">
					<h2 className="font-serif text-[17px] text-warm-900">Your Details</h2>
				</div>

				{/* Contact header row */}
				<div className="flex items-center gap-3 mb-5 pb-5 border-b border-black/[0.06]">
					<div className="w-[42px] h-[42px] rounded-full bg-brand-50 flex items-center justify-center text-sm font-medium text-brand-700 shrink-0">
						{initials}
					</div>
					<div>
						<p className="text-[15px] font-medium text-warm-900">{fullName}</p>
						<p className="text-[12.5px] text-warm-500 mt-0.5">{client.email}</p>
					</div>
				</div>

				{/* Details grid */}
				<dl className="grid grid-cols-1 sm:grid-cols-2">
					{[
						{ label: 'Phone', value: client.phone ?? '—' },
						{ label: 'City', value: client.city ?? '—' },
						{ label: 'Country', value: client.country ?? '—' },
					].map(({ label, value }) => (
						<div
							key={label}
							className="py-3.5 border-b border-black/[0.06]"
						>
							<dt className="text-[11px] uppercase tracking-[0.07em] text-warm-400 font-medium mb-1">{label}</dt>
							<dd className="text-sm text-warm-800">{value}</dd>
						</div>
					))}

					{/* Waiting List */}
					<div className="py-3.5 border-b border-black/[0.06]">
						<dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] text-warm-400 font-medium mb-1">
							Waiting List
							<Tooltip />
						</dt>
						<dd className="text-sm text-warm-800">
							{client.depositTier === 'r5000'
								? 'Secured List — R5,000'
								: client.depositTier === 'r500'
									? 'Standard List — R500'
									: '—'}
						</dd>
					</div>

					{/* Deposit Payment */}
					<div className="py-3.5">
						<dt className="text-[11px] uppercase tracking-[0.07em] text-warm-400 font-medium mb-1.5">
							Deposit Payment
						</dt>
						<dd className="flex items-center gap-2.5">
							{client.depositStatus === 'paid' && (
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200">
									<span aria-hidden="true">✓</span> Confirmed
								</span>
							)}
							{client.depositStatus === 'none' && (
								<>
									<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">
										Incomplete
									</span>
									<Link to="/portal/payments" className="text-xs text-brand-500 hover:text-brand-600 transition-colors">
										Complete payment →
									</Link>
								</>
							)}
						</dd>
					</div>
				</dl>
			</Card>

			{showStages && (
				<StagesModal currentStage={client.stage} onClose={() => setShowStages(false)} />
			)}

		</div>
	);
}
