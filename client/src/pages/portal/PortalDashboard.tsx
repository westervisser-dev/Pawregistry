import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
	LoadingPage,
	Card,
	Badge,
	Button,
	Glyph,
	Placeholder,
	useFocusTrap,
} from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import type {
	Client,
	ClientApplication,
	Litter,
	LitterWithDogs,
	PuppyWithImages,
	UpdateWithLitter,
} from '@paw-registry/shared';
import { BREEDS, BREED_SIZES, getBreedSizeLabel } from '@paw-registry/shared';

// ─── Formatting helpers ──────────────────────────────────────────────────────

function formatRands(amount: number): string {
	return `R${Math.round(amount).toLocaleString('en-ZA')}`;
}

function shortDate(iso: string | null | undefined): string {
	if (!iso) return 'TBD';
	return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function longDate(iso: string | null | undefined): string {
	if (!iso) return 'TBD';
	return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
}

function daysUntil(iso: string | null | undefined): number | null {
	if (!iso) return null;
	const diff = new Date(iso).getTime() - Date.now();
	return Math.max(0, Math.ceil(diff / 86400000));
}

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

	if (pendingBookingPayment && ['puppy_reserved', 'puppy_booked'].includes(client.stage)) {
		const msLeft = pendingBookingPayment.expiresAt
			? new Date(pendingBookingPayment.expiresAt).getTime() - Date.now()
			: null;
		const hoursLeft = msLeft !== null ? Math.floor(msLeft / (1000 * 60 * 60)) : null;
		const urgencyLabel = msLeft !== null
			? msLeft <= 0 ? ' — EXPIRED' : ` — ${hoursLeft}h left`
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
		<div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
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

// ─── Stages reference data ───────────────────────────────────────────────────

const STAGES = [
	{
		key: 'enquired', label: 'Enquired', variant: 'default' as const, icon: '📝',
		description: 'Your application has been received. Our team will review your details and reach out if we need anything further.',
		trigger: 'Happens automatically once you complete the onboarding form.',
	},
	{
		key: 'approved', label: 'Approved', variant: 'blue' as const, icon: '✅',
		description: 'Your application has been reviewed and approved — great news! You\'ll now be asked to complete a set of supporting documents.',
		trigger: 'Set by our team after reviewing your application.',
	},
	{
		key: 'waitlisted', label: 'Waitlisted', variant: 'amber' as const, icon: '⏳',
		description: 'You\'re on the waitlist! All your required documents have been checked off and you\'re in line for a future litter.',
		trigger: 'Happens automatically once all required documents are submitted.',
	},
	{
		key: 'puppy_reserved', label: 'Puppy Reserved', variant: 'purple' as const, icon: '🔍',
		description: 'You\'ve reserved a puppy! Complete your booking payment within 24 hours to secure your selection.',
		trigger: 'Happens when you select a puppy from an available litter.',
	},
	{
		key: 'puppy_booked', label: 'Puppy Booked', variant: 'purple' as const, icon: '💜',
		description: 'Your puppy is booked — congratulations! Final payment and go-home arrangements will be confirmed shortly.',
		trigger: 'Happens once your booking payment is confirmed.',
	},
	{
		key: 'puppy_fully_paid', label: 'Puppy Booked & Paid', variant: 'green' as const, icon: '🎉',
		description: 'Everything is in order — your puppy is ready to come home! Our team will coordinate the final handover details with you.',
		trigger: 'Confirmed once full payment has been received.',
	},
] as const;

// 6-step journey used for the PortalJourney timeline
const JOURNEY_STEPS = [
	{ key: 'enquired',         label: 'Enquired' },
	{ key: 'approved',         label: 'Approved' },
	{ key: 'waitlisted',       label: 'Waitlisted' },
	{ key: 'puppy_reserved',   label: 'Reserved' },
	{ key: 'puppy_booked',     label: 'Booked' },
	{ key: 'puppy_fully_paid', label: 'Home' },
] as const;

function stageIdx(stage: string): number {
	return JOURNEY_STEPS.findIndex((s) => s.key === stage);
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
						<h2 id="modal-title" className="font-serif text-lg text-warm-900">How do the stages work?</h2>
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

// ─── PortalJourney (6-step timeline) ─────────────────────────────────────────

function PortalJourney({ stage }: { stage: string }) {
	const cur = Math.max(0, stageIdx(stage));
	const progressPct = cur / (JOURNEY_STEPS.length - 1);
	return (
		<div className="relative">
			<div className="absolute left-[14px] right-[14px] top-[13px] h-[2px] bg-warm-200 rounded-full" />
			<div
				className="absolute left-[14px] top-[13px] h-[2px] rounded-full transition-all duration-500"
				style={{ width: `calc((100% - 28px) * ${progressPct})`, background: '#c47420' }}
			/>
			<div className="relative grid grid-cols-6 gap-1">
				{JOURNEY_STEPS.map((s, i) => {
					const done = i < cur;
					const active = i === cur;
					return (
						<div key={s.key} className="flex flex-col items-center text-center">
							<span
								className="w-7 h-7 rounded-full flex items-center justify-center border-2 mb-2"
								style={{
									background: done || active ? '#c47420' : '#fff',
									borderColor: done || active ? '#c47420' : '#d6c9b8',
									boxShadow: active ? '0 0 0 4px rgba(196,116,32,0.18)' : 'none',
								}}
							>
								{done
									? <Glyph shape="check" color="#fff" size={12} />
									: active
										? <span className="w-2 h-2 rounded-full bg-white" />
										: null}
							</span>
							<span className={`text-[10px] md:text-[11.5px] leading-tight ${active || done ? 'text-warm-900 font-medium' : 'text-warm-400'}`}>
								{s.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ─── Greetings (personalized per stage) ──────────────────────────────────────

function greetingEyebrow(): string {
	return new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
}

function greetingTitle(stage: string, firstName: string, daysLeft: number | null, puppyCollar: string | null): string {
	if (stage === 'puppy_fully_paid' || (stage === 'puppy_booked' && daysLeft !== null && daysLeft <= 7)) {
		return daysLeft !== null && daysLeft <= 1
			? `Pickup is here, ${firstName}!`
			: daysLeft !== null
				? `${daysLeft} days to go, ${firstName}.`
				: `Pickup week is here, ${firstName}!`;
	}
	if (stage === 'puppy_booked') {
		return daysLeft !== null ? `${daysLeft} days to go, ${firstName}.` : `Your puppy is booked, ${firstName}.`;
	}
	if (stage === 'puppy_reserved') return `${puppyCollar ? puppyCollar + ' collar is yours' : 'Your puppy is reserved'}, ${firstName}.`;
	if (stage === 'waitlisted') return `Welcome back, ${firstName}.`;
	if (stage === 'approved') return `You're approved, ${firstName}.`;
	if (stage === 'enquired') return `Thanks for applying, ${firstName}.`;
	if (stage === 'rejected') return `Hi ${firstName}.`;
	return `Welcome back, ${firstName}.`;
}

function greetingSubtitle(stage: string, daysLeft: number | null, position: number | null): string {
	if (stage === 'puppy_fully_paid' || (stage === 'puppy_booked' && daysLeft !== null && daysLeft <= 7)) {
		return 'Bring the items from the go-home checklist. We\'ll be in touch to confirm the exact time.';
	}
	if (stage === 'puppy_booked') return 'Everything is on track. Here\'s where your booking stands and the latest from the litter.';
	if (stage === 'puppy_reserved') return 'Complete your booking payment within 24 hours to secure your selection.';
	if (stage === 'waitlisted') {
		return position
			? `You're #${position} on the waitlist. We'll let you know as soon as a matching puppy is available.`
			: 'You\'re on the waitlist. We\'ll let you know as soon as a matching puppy is available.';
	}
	if (stage === 'approved') return 'Upload your supporting documents to move onto the waitlist.';
	if (stage === 'enquired') return 'We\'ll review your application and get back to you shortly.';
	if (stage === 'rejected') return 'We appreciate you reaching out. Unfortunately we weren\'t able to offer you a puppy this round.';
	return '';
}

// ─── Hero variants ───────────────────────────────────────────────────────────

function GoHomeHero({ puppy, litter, daysLeft }: { puppy: PuppyWithImages | null; litter: Litter; daysLeft: number }) {
	const puppyImg = puppy?.profileImageUrl ?? puppy?.images?.[0]?.url ?? null;
	const collarLabel = puppy ? `${puppy.collarColour} collar` : null;
	return (
		<div className="rounded-[16px] overflow-hidden border border-black/[0.05]" style={{ background: 'linear-gradient(135deg,#fdf6ee 0%,#f8e8d0 60%,#f0cfa0 100%)' }}>
			<div className="grid grid-cols-1 md:grid-cols-5">
				<div className="md:col-span-2 aspect-[4/3] md:aspect-auto">
					{puppyImg
						? <img src={puppyImg} alt={collarLabel ?? 'Puppy'} className="w-full h-full object-cover" />
						: <Placeholder label={collarLabel ?? 'puppy photo'} className="w-full h-full" tone="warm" />}
				</div>
				<div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-between min-h-[260px]">
					<div>
						<div className="text-[11px] uppercase tracking-[0.14em] text-[#824614] mb-2">Coming home</div>
						<div className="font-serif text-[56px] md:text-[72px] leading-none text-warm-900">
							{daysLeft}
							<span className="text-[28px] md:text-[32px] text-warm-500 font-sans font-light"> days</span>
						</div>
						{litter.goHomeDate && (
							<div className="text-[14px] text-warm-700 mt-2 font-medium">{longDate(litter.goHomeDate)}</div>
						)}
					</div>
					{puppy && (
						<div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#d6a96a]/40">
							<span className="w-3 h-3 rounded-full shrink-0" style={{ background: '#6b7a3a' }} aria-hidden="true" />
							<div className="min-w-0 flex-1">
								<div className="text-[13.5px] font-medium text-warm-900 truncate">{collarLabel} · {puppy.colour}</div>
								<div className="text-[11.5px] text-warm-500 truncate">
									{litter.breed && getBreedSizeLabel(litter.breed)}
									{puppy.currentWeight ? ` · ${(puppy.currentWeight / 1000).toFixed(2)} kg` : ''}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function PickupWeekHero({ puppy, litter }: { puppy: PuppyWithImages | null; litter: Litter }) {
	return (
		<div className="rounded-[16px] border p-6 md:p-8" style={{ background: '#e8efe5', borderColor: '#b6c9ae' }}>
			<div className="text-[11px] uppercase tracking-[0.14em] text-[#3f5a36] mb-2">This week!</div>
			<div className="font-serif text-[36px] md:text-[44px] leading-[1.05] text-[#2a3f22]">
				{litter.goHomeDate ? `${longDate(litter.goHomeDate)} is go-home day.` : 'Pickup week is here.'}
			</div>
			<p className="text-[13.5px] text-[#3f5a36] mt-3 max-w-[520px]">
				{puppy ? `${puppy.collarColour} collar is ready.` : 'Your puppy is ready.'} We'll be in touch to confirm the exact time.
			</p>
		</div>
	);
}

function ReservedHero({ puppy, expiresAt }: { puppy: PuppyWithImages | null; expiresAt: string | null }) {
	const hoursLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000)) : null;
	return (
		<div className="rounded-[16px] border border-black/[0.05] p-6 md:p-8" style={{ background: 'linear-gradient(135deg,#fdf6ee,#f6e5e9)' }}>
			<div className="text-[11px] uppercase tracking-[0.14em] text-[#8d2a4a] mb-2">Reserved</div>
			<div className="font-serif text-[32px] md:text-[40px] leading-[1.05] text-warm-900">
				{puppy ? `${puppy.collarColour} collar is on hold for you.` : 'Your puppy is on hold.'}
			</div>
			<p className="text-[13.5px] text-warm-700 mt-3 max-w-[520px]">
				{hoursLeft !== null
					? `Complete your booking payment in the next ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} to lock it in.`
					: 'Complete your booking payment to lock it in.'}
			</p>
			<div className="mt-5">
				<Link to="/portal/payments"><Button>Complete booking payment</Button></Link>
			</div>
		</div>
	);
}

function WaitlistedHero({ client, position, total }: { client: Client; position: number | null; total: number | null }) {
	const displayPos = position ?? client.priority;
	return (
		<div className="rounded-[16px] border border-black/[0.05] bg-white p-6 md:p-8">
			<div className="text-[11px] uppercase tracking-[0.14em] text-warm-500 mb-2">Your place on the list</div>
			<div className="flex items-baseline gap-3">
				<div className="font-serif text-[64px] leading-none text-warm-900">#{String(displayPos).padStart(2, '0')}</div>
				{total !== null && <div className="text-[13px] text-warm-500">of {total} on the waitlist</div>}
			</div>
			<p className="text-[13.5px] text-warm-600 mt-4 max-w-[480px] leading-relaxed">
				We'll invite you to a selection day as soon as a matching litter becomes available.
			</p>
		</div>
	);
}

function ApprovedHero({ templates }: { templates: TemplateItem[] | null }) {
	const total = templates?.length ?? 0;
	const uploaded = templates?.filter((t) => t.uploadedFileUrl !== null).length ?? 0;
	const pct = total ? Math.round((uploaded / total) * 100) : 0;
	return (
		<div className="rounded-[16px] border border-black/[0.05] bg-white p-6 md:p-8">
			<div className="text-[11px] uppercase tracking-[0.14em] text-[#3f5a36] mb-2">Approved</div>
			<h2 className="font-serif text-[28px] md:text-[34px] leading-[1.1] text-warm-900">Let's finish your documents.</h2>
			<p className="text-[13.5px] text-warm-600 mt-3 max-w-[520px]">
				Once everything's uploaded and reviewed, you'll move onto the waitlist.
			</p>
			{total > 0 && (
				<div className="mt-5">
					<div className="flex items-center justify-between text-[12px] text-warm-500 mb-2">
						<span>{uploaded} of {total} uploaded</span>
						<span>{pct}%</span>
					</div>
					<div className="h-2 bg-warm-100 rounded-full overflow-hidden">
						<div className="h-full rounded-full" style={{ width: pct + '%', background: 'linear-gradient(90deg,#d98e3a,#c47420)' }} />
					</div>
				</div>
			)}
			<div className="mt-5">
				<Link to="/portal/documents"><Button>Go to documents</Button></Link>
			</div>
		</div>
	);
}

function EnquiredHero() {
	return (
		<div className="rounded-[16px] border border-black/[0.05] bg-white p-6 md:p-8">
			<div className="text-[11px] uppercase tracking-[0.14em] text-[#1e5b8a] mb-2">Application received</div>
			<h2 className="font-serif text-[28px] md:text-[34px] leading-[1.1] text-warm-900">We've got your application.</h2>
			<p className="text-[13.5px] text-warm-600 mt-3 max-w-[520px]">
				Our team reviews every application personally. We'll get in touch within a few days.
			</p>
		</div>
	);
}

function RejectedCard() {
	return (
		<div className="rounded-[16px] border border-black/[0.05] bg-white p-6 md:p-8">
			<div className="text-[11px] uppercase tracking-[0.14em] text-warm-500 mb-2">Application closed</div>
			<h2 className="font-serif text-[26px] md:text-[30px] leading-[1.1] text-warm-900">
				We weren't able to offer you a puppy this round.
			</h2>
			<p className="text-[13.5px] text-warm-600 mt-3 max-w-[520px] leading-relaxed">
				Thank you for your interest. If your circumstances change or you'd like to discuss this further, please get in touch with us directly.
			</p>
		</div>
	);
}

// ─── Side cards (2-up under the hero) ────────────────────────────────────────

function MatchedPaymentCard({ client, puppy, litter, paidRands }: { client: Client; puppy: PuppyWithImages | null; litter: Litter | null; paidRands: number }) {
	const total = puppy?.priceRands ?? 0;
	const pct = total ? Math.min(100, Math.round((paidRands / total) * 100)) : 0;
	const remaining = Math.max(0, total - paidRands);
	return (
		<Card>
			<div className="px-5 md:px-[22px] py-5">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-[14px] font-medium text-warm-900">Payments</h3>
					<Link to="/portal/payments" className="text-[12.5px] text-[#c47420] font-medium">View →</Link>
				</div>
				<div className="flex items-baseline justify-between mb-2">
					<div className="font-serif text-[24px] text-warm-900">{formatRands(paidRands)}</div>
					{total > 0 && <div className="text-[12px] text-warm-500">of {formatRands(total)}</div>}
				</div>
				{total > 0 && (
					<div className="h-2 bg-warm-100 rounded-full overflow-hidden">
						<div className="h-full rounded-full" style={{ width: pct + '%', background: 'linear-gradient(90deg,#d98e3a,#c47420)' }} />
					</div>
				)}
				{remaining > 0 && litter?.goHomeDate && (
					<div className="text-[12px] text-warm-500 mt-3">
						{formatRands(remaining)} remaining · due by {shortDate(litter.goHomeDate)}
					</div>
				)}
				{remaining === 0 && total > 0 && (
					<div className="text-[12px] text-warm-500 mt-3">Paid in full — thank you!</div>
				)}
				{void client}
			</div>
		</Card>
	);
}

function MatchedUpdateCard({ update }: { update: UpdateWithLitter | null }) {
	if (!update) {
		return (
			<Card>
				<div className="px-5 md:px-[22px] py-5">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-[14px] font-medium text-warm-900">Latest update</h3>
					</div>
					<p className="text-[12.5px] text-warm-500">No updates yet. We'll post here when there's news from the litter.</p>
				</div>
			</Card>
		);
	}
	const firstImage = update.mediaUrls[0] ?? null;
	const preview = update.body.length > 180 ? update.body.slice(0, 180).trim() + '…' : update.body;
	return (
		<Card>
			<div className="px-5 md:px-[22px] py-5">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-[14px] font-medium text-warm-900">Latest update</h3>
					{update.weekNumber !== null && (
						<span className="text-[11px] text-warm-500">Week {update.weekNumber}</span>
					)}
				</div>
				{firstImage
					? <img src={firstImage} alt="" className="aspect-[16/9] w-full rounded-[10px] mb-3 object-cover" />
					: <Placeholder label="puppy photo" className="aspect-[16/9] rounded-[10px] mb-3" />}
				<div className="text-[13px] font-medium text-warm-900">{update.title}</div>
				<p className="text-[12.5px] text-warm-600 mt-1.5 leading-relaxed">{preview}</p>
				<Link to="/portal/updates" className="mt-3 inline-block text-[12.5px] text-[#c47420] font-medium">
					Read all updates →
				</Link>
			</div>
		</Card>
	);
}

function DepositRow({ label, active, done }: { label: string; active: boolean; done: boolean }) {
	return (
		<div className="flex items-center gap-2.5 text-[12px]">
			<span
				className="w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0"
				style={{
					background: done ? '#c47420' : active ? '#fff' : 'transparent',
					borderColor: active || done ? '#c47420' : '#d6c9b8',
				}}
				aria-hidden="true"
			>
				{done && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
			</span>
			<span className={active ? 'text-warm-900 font-medium' : 'text-warm-500'}>{label}</span>
		</div>
	);
}

function WaitlistDepositCard({ client, paidRands }: { client: Client; paidRands: number }) {
	const depositPaid = client.depositStatus === 'paid';
	return (
		<Card>
			<div className="px-5 md:px-[22px] py-5">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-[14px] font-medium text-warm-900">Your deposit</h3>
					<Link to="/portal/payments" className="text-[12.5px] text-[#c47420] font-medium">View →</Link>
				</div>
				<div className="flex items-center gap-3 mb-3">
					<div
						className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
						style={{ background: depositPaid ? '#e4ebe0' : '#fdf6ee' }}
					>
						{depositPaid
							? <Glyph shape="check" color="#3e5a2a" size={18} />
							: <Glyph shape="coin" color="#c47420" size={18} />}
					</div>
					<div className="min-w-0">
						<div className="font-serif text-[22px] text-warm-900 leading-none">{formatRands(paidRands)}</div>
						<div className="text-[11.5px] text-warm-500 mt-1">
							{depositPaid ? 'Paid — you\'re on the deposit list' : 'Waitlist deposit pending'}
						</div>
					</div>
				</div>
				<div className="mt-4 pt-4 border-t border-black/[0.05] space-y-2">
					<DepositRow
						label="Secured Waitlist — R5,000 deposit"
						active={client.depositTier === 'r5000'}
						done={depositPaid && client.depositTier === 'r5000'}
					/>
					<DepositRow
						label="Standard — R500 hold"
						active={client.depositTier === 'r500'}
						done={depositPaid && client.depositTier === 'r500'}
					/>
				</div>
			</div>
		</Card>
	);
}

function UpcomingLittersCard({ litters }: { litters: Litter[] }) {
	if (litters.length === 0) {
		return (
			<Card>
				<div className="px-5 md:px-[22px] py-5">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-[14px] font-medium text-warm-900">Litters to watch</h3>
						<Link to="/portal/litters" className="text-[12.5px] text-[#c47420] font-medium">Browse →</Link>
					</div>
					<p className="text-[12.5px] text-warm-500">No upcoming litters right now. We'll post here as soon as one is announced.</p>
				</div>
			</Card>
		);
	}
	return (
		<Card>
			<div className="px-5 md:px-[22px] py-5">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-[14px] font-medium text-warm-900">Litters to watch</h3>
					<Link to="/portal/litters" className="text-[12.5px] text-[#c47420] font-medium">Browse →</Link>
				</div>
				<div className="space-y-3">
					{litters.slice(0, 3).map((l) => {
						const img = l.coverImageUrl;
						const statusLabel = l.status === 'available'
							? (l.availableCount ? `${l.availableCount} open` : 'Open')
							: l.status === 'planned' ? 'Planned' : 'Booked';
						const statusStyle = l.status === 'available'
							? { background: '#e4ebe0', color: '#3e5a2a' }
							: { background: '#f5f0e8', color: '#7a6a58' };
						return (
							<Link key={l.id} to={`/portal/litters/${l.id}`} className="flex items-center gap-3 group">
								{img
									? <img src={img} alt="" className="w-11 h-11 rounded-[9px] object-cover flex-shrink-0" />
									: <Placeholder className="w-11 h-11 rounded-[9px] flex-shrink-0" tone="warm" />}
								<div className="min-w-0 flex-1">
									<div className="text-[13px] font-medium text-warm-900 truncate group-hover:text-[#c47420] transition-colors">{l.name}</div>
									<div className="text-[11.5px] text-warm-500 truncate">
										{l.breed ? getBreedSizeLabel(l.breed) : 'TBD'}
										{' · '}
										{l.goHomeDate ? 'home ' + shortDate(l.goHomeDate) : 'selection ' + shortDate(l.selectionDate)}
									</div>
								</div>
								<span
									className="text-[11px] px-2 py-1 rounded-full flex-shrink-0"
									style={statusStyle}
								>
									{statusLabel}
								</span>
							</Link>
						);
					})}
				</div>
			</div>
		</Card>
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
	const [assignedLitter, setAssignedLitter] = useState<LitterWithDogs | null>(null);
	const [latestUpdate, setLatestUpdate] = useState<UpdateWithLitter | null>(null);
	const [upcomingLitters, setUpcomingLitters] = useState<Litter[]>([]);
	const [paidRands, setPaidRands] = useState(0);
	const setClientStage = useAuthStore((s) => s.setClientStage);
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

				if (c.litterId) {
					api.litters({ id: c.litterId }).get().then(({ data: lit }) => {
						if (mountedRef.current && lit) setAssignedLitter(lit as LitterWithDogs);
					}).catch(() => {});
				} else {
					setAssignedLitter(null);
				}

				// Payments — pending flags + total paid
				api.payments.mine.get().then(({ data: pmts }) => {
					if (!mountedRef.current || !pmts) return;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const allPayments = pmts as any[];
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const paidTotal = allPayments
						.filter((p: any) => p.status === 'complete')
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						.reduce((sum: number, p: any) => sum + (p.amountRands ?? 0), 0);
					setPaidRands(paidTotal);
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const pendingBooking = allPayments
						.filter((p: any) => p.status === 'pending' && (p.type === 'booking' || p.type === 'final'))
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						.sort((a: any, b: any) => ((a.metadata as any)?.instalmentIndex ?? -1) - ((b.metadata as any)?.instalmentIndex ?? -1))[0] ?? null;
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
					} else {
						setPendingBookingPayment(null);
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const pendingDeposit = allPayments.find((p: any) => p.status === 'pending' && p.type === 'deposit');
					if (pendingDeposit && c.depositStatus !== 'paid') {
						setPendingDepositPayment({
							amountRands: pendingDeposit.amountRands,
							authorizationUrl: pendingDeposit.authorizationUrl ?? null,
						});
					} else {
						setPendingDepositPayment(null);
					}
				}).catch(() => {});

				// Latest update for matched litter
				if (c.litterId) {
					api.updates.my.get().then(({ data: ups }) => {
						if (!mountedRef.current || !ups) return;
						const list = ups as UpdateWithLitter[];
						const forLitter = list.filter((u) => u.litterId === c.litterId);
						setLatestUpdate(forLitter[0] ?? null);
					}).catch(() => {});
				}

				// Upcoming litters shortlist (for clients without a matched puppy)
				if (!c.puppyId && ['enquired', 'approved', 'waitlisted'].includes(c.stage)) {
					api.litters.get().then(({ data: lits }) => {
						if (!mountedRef.current || !lits) return;
						const upcoming = (lits as Litter[])
							.filter((l) => l.status === 'available' || l.status === 'planned')
							.slice(0, 3);
						setUpcomingLitters(upcoming);
					}).catch(() => {});
				}
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
	if (!client) return <div className="text-warm-500 p-8">No client record linked to your account.</div>;

	const app = client.applicationData as unknown as ClientApplication | undefined;
	const firstChoice = formatBreedSize(app?.preferredBreedSize);
	const secondChoice = formatBreedSize(app?.secondChoiceBreedSize);

	const puppy: PuppyWithImages | null = (() => {
		if (!client.puppyId || !assignedLitter) return null;
		return assignedLitter.puppies.find((p) => p.id === client.puppyId) ?? null;
	})();
	const litter: Litter | null = assignedLitter;
	const daysLeft = daysUntil(litter?.goHomeDate);
	const isPickupWeek =
		(client.stage === 'puppy_booked' || client.stage === 'puppy_fully_paid')
		&& daysLeft !== null
		&& daysLeft <= 7;
	const isRejected = client.stage === 'rejected';

	return (
		<div className="max-w-[1280px] mx-auto">

			{/* Greeting */}
			<div className="px-5 md:px-8 pt-6 md:pt-10 pb-5">
				<div className="text-[11px] uppercase tracking-[0.14em] text-warm-500 mb-2">{greetingEyebrow()}</div>
				<h1 className="font-serif text-[30px] md:text-[40px] leading-[1.05] text-warm-900">
					{greetingTitle(client.stage, client.firstName, isPickupWeek ? daysLeft : daysLeft, puppy?.collarColour ?? null)}
				</h1>
				<p className="text-[13.5px] md:text-[14.5px] text-warm-600 mt-2 max-w-[560px]">
					{greetingSubtitle(client.stage, daysLeft, waitlistPosition?.position ?? client.priority ?? null)}
				</p>
			</div>

			{/* Action center */}
			<div className="px-5 md:px-8 mb-5">
				<ClientActionCenter
					client={client}
					templates={templates}
					pendingNotifications={pendingNotifications}
					pendingBookingPayment={pendingBookingPayment}
					pendingDepositPayment={pendingDepositPayment}
				/>
			</div>

			{isRejected ? (
				<div className="px-5 md:px-8 pb-8">
					<RejectedCard />
				</div>
			) : (
				<>
					{/* Stage-adaptive hero */}
					<div className="px-5 md:px-8 mb-5">
						{isPickupWeek && litter && <PickupWeekHero puppy={puppy} litter={litter} />}
						{!isPickupWeek && (client.stage === 'puppy_booked' || client.stage === 'puppy_fully_paid') && litter && daysLeft !== null && (
							<GoHomeHero puppy={puppy} litter={litter} daysLeft={daysLeft} />
						)}
						{client.stage === 'puppy_reserved' && (
							<ReservedHero puppy={puppy} expiresAt={pendingBookingPayment?.expiresAt ?? puppy?.bookingExpiresAt ?? null} />
						)}
						{client.stage === 'waitlisted' && (
							<WaitlistedHero
								client={client}
								position={waitlistPosition?.position ?? null}
								total={waitlistPosition?.total ?? null}
							/>
						)}
						{client.stage === 'approved' && <ApprovedHero templates={templates} />}
						{client.stage === 'enquired' && <EnquiredHero />}
					</div>

					{/* Journey tracker */}
					<div className="px-5 md:px-8 mb-5">
						<Card>
							<div className="px-5 md:px-[22px] py-5">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-[14px] font-medium text-warm-900">Your journey</h3>
									<span className="text-[11.5px] text-warm-500">
										Stage {Math.max(1, stageIdx(client.stage) + 1)} of 6
									</span>
								</div>
								<PortalJourney stage={client.stage} />
								<button
									onClick={() => setShowStages(true)}
									className="mt-4 text-xs text-brand-500 hover:text-brand-600 cursor-pointer transition-colors"
								>
									How do the stages work? →
								</button>
							</div>
						</Card>
					</div>

					{/* Two-up */}
					<div className="px-5 md:px-8 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
						{puppy ? (
							<>
								<MatchedPaymentCard client={client} puppy={puppy} litter={litter} paidRands={paidRands} />
								<MatchedUpdateCard update={latestUpdate} />
							</>
						) : (
							<>
								<WaitlistDepositCard client={client} paidRands={paidRands} />
								<UpcomingLittersCard litters={upcomingLitters} />
							</>
						)}
					</div>
				</>
			)}

			{/* Preferences + Your details */}
			<div className="px-5 md:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<div className="px-5 md:px-[22px] py-5">
						<div className="flex items-center justify-between mb-3.5">
							<h3 className="text-[14px] font-medium text-warm-900">Puppy preferences</h3>
							<Link to="/portal/preferences" className="text-[12.5px] text-[#c47420] font-medium">Edit →</Link>
						</div>
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
						{secondChoice && (
							<div className="mb-3">
								<p className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">Second choice</p>
								<p className="text-sm text-warm-800">
									<span className="font-medium">{secondChoice.breed}</span>
									{secondChoice.size && <span className="text-warm-400"> · {secondChoice.size}</span>}
								</p>
							</div>
						)}
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
							{app?.budget && (
								<div>
									<p className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">Budget</p>
									<p className="text-[13px] text-warm-800">{BUDGET_LABELS[app.budget as string] ?? String(app.budget)}</p>
								</div>
							)}
						</div>
					</div>
				</Card>

				<Card>
					<div className="px-5 md:px-[22px] py-5">
						<h3 className="text-[14px] font-medium text-warm-900 mb-3.5">Your details</h3>
						<dl className="grid grid-cols-2 gap-x-4 gap-y-3">
							<div>
								<dt className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">Name</dt>
								<dd className="text-[13px] text-warm-800 truncate">{client.firstName} {client.lastName}</dd>
							</div>
							<div>
								<dt className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">Email</dt>
								<dd className="text-[13px] text-warm-800 truncate">{client.email}</dd>
							</div>
							<div>
								<dt className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">Phone</dt>
								<dd className="text-[13px] text-warm-800">{client.phone ?? '—'}</dd>
							</div>
							<div>
								<dt className="text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">City</dt>
								<dd className="text-[13px] text-warm-800">{client.city ?? '—'}</dd>
							</div>
							<div className="col-span-2">
								<dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.07em] text-warm-400 mb-1">
									Waiting list
									<Tooltip />
								</dt>
								<dd className="text-[13px] text-warm-800">
									{client.depositTier === 'r5000'
										? 'Secured List — R5,000'
										: client.depositTier === 'r500'
											? 'Standard List — R500'
											: '—'}
								</dd>
							</div>
						</dl>
					</div>
				</Card>
			</div>

			{showStages && (
				<StagesModal currentStage={client.stage} onClose={() => setShowStages(false)} />
			)}
		</div>
	);
}
