import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Card, Badge, useFocusTrap } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Client, ClientApplication } from '@paw-registry/shared';

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
					Your deposit affects your waiting list placing order. You can always adjust your deposit preference at any time.
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

type TemplateItem = { id: string; name: string; checkedAt: string | null };

type Action =
	| { type: 'link'; label: string; to: string; color: ActionColor }
	| { type: 'button'; label: string; onClick: () => void; color: ActionColor };

function ClientActionCenter({
	client,
	templates,
	onOpenDepositModal,
}: {
	client: Client;
	templates: TemplateItem[] | null;
	onOpenDepositModal: () => void;
}) {
	const actions: Action[] = [];

	if (client.stage === 'approved' && templates !== null) {
		const total = templates.length;
		const uploaded = templates.filter((t) => t.checkedAt !== null).length;
		if (total > 0 && uploaded < total) {
			actions.push({
				type: 'link',
				label: `Upload your documents (${uploaded} of ${total} complete)`,
				to: '/portal/documents',
				color: 'blue',
			});
		}
	}

	if (client.stage === 'waitlisted' && client.depositStatus === 'none') {
		actions.push({
			type: 'button',
			label: 'Set a deposit to improve your waitlist position',
			onClick: onOpenDepositModal,
			color: 'amber',
		});
	}

	if (client.stage === 'match_requested') {
		actions.push({
			type: 'link',
			label: 'Browse available litters and express interest',
			to: '/portal/litters',
			color: 'purple',
		});
	}

	if (client.stage === 'matched') {
		actions.push({
			type: 'link',
			label: 'Check your documents for payment details',
			to: '/portal/documents',
			color: 'green',
		});
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
		key: 'match_requested',
		label: 'Match Requested',
		variant: 'purple' as const,
		icon: '🔍',
		description: 'The puppies are born and it\'s nearly time to choose! Our team has flagged you to select your puppy — we\'ll be in touch soon.',
		trigger: 'Set by our team once the litter is born and ready for matching.',
	},
	{
		key: 'matched',
		label: 'Matched',
		variant: 'purple' as const,
		icon: '💜',
		description: 'You\'ve been matched with your puppy — congratulations! Final payment and go-home arrangements will be confirmed shortly.',
		trigger: 'Happens once your puppy selection is confirmed.',
	},
	{
		key: 'matched_paid',
		label: 'Matched & Paid',
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
	{ key: 'matched', label: 'Matched' },
	{ key: 'matched_paid', label: 'Complete' },
];

function getStageIndex(stage: string): number {
	const idx = STAGE_STEPS.findIndex(s => s.key === stage);
	if (idx >= 0) return idx;
	if (stage === 'match_requested') return 3;
	return 0;
}

// ─── Breed / Size Helpers ────────────────────────────────────────────────────

const BREED_LABELS: Record<string, string> = {
	f1_goldendoodle: 'F1 Goldendoodle',
	f1b_goldendoodle: 'F1b Goldendoodle',
	f1_border_doodle: 'F1 Border Doodle',
	f1_mini_biewer_doodle: 'F1 Mini Biewer Doodle',
	red_tuxedo_french_poodle: 'Red Tuxedo French Poodle',
};

const SIZE_LABELS: Record<string, string> = {
	standard: 'Standard',
	miniature: 'Miniature',
	dwarf: 'Dwarf',
	border_doodle: 'Border Doodle',
	biewer_doodle: 'Biewer Doodle',
	standard_poodle: 'Standard Poodle',
	moyen_poodle: 'Moyen Poodle',
};

function formatBreedSize(raw: string | null | undefined): { breed: string; size: string | null } | null {
	if (!raw) return null;
	const [breedRaw, sizeRaw] = raw.split(' - ');
	return {
		breed: BREED_LABELS[breedRaw] ?? breedRaw,
		size: sizeRaw ? (SIZE_LABELS[sizeRaw] ?? sizeRaw) : null,
	};
}

const SEX_LABELS: Record<string, string> = {
	male: 'Male',
	female: 'Female',
	no_preference: 'No preference',
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
	const isPositiveStage = ['approved', 'waitlisted', 'match_requested', 'matched', 'matched_paid'].includes(stage);

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
	const [depositLoading, setDepositLoading] = useState(false);
	const [showDepositConfirm, setShowDepositConfirm] = useState(false);
	const depositDialogRef = useFocusTrap(showDepositConfirm, () => { if (!depositLoading) setShowDepositConfirm(false); });
	const [waitlistPosition, setWaitlistPosition] = useState<{ position: number | null; total: number | null } | null>(null);
	const [templates, setTemplates] = useState<TemplateItem[] | null>(null);

	usePageTitle('Dashboard');

	useEffect(() => {
		api.clients.me.get().then(({ data }) => {
			if (data) {
				const c = data as Client;
				setClient(c);
				if (c.stage === 'waitlisted') {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(api.clients.me as any)['waitlist-position'].get().then(({ data: pos }: { data: { position: number | null; total: number | null } | null }) => {
						if (pos) setWaitlistPosition(pos);
					});
				}
				if (c.stage === 'approved') {
					api.templates.my.get().then(({ data: tmpl }) => {
						if (tmpl) setTemplates(tmpl as TemplateItem[]);
					});
				}
			}
			setLoading(false);
		});
	}, []);

	async function handleConfirmDeposit() {
		if (!client || depositLoading) return;
		setDepositLoading(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.clients.me as any).deposit.patch();
		if (data) setClient(data as Client);
		setDepositLoading(false);
		setShowDepositConfirm(false);
	}

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
				onOpenDepositModal={() => setShowDepositConfirm(true)}
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
					{client.stage === 'waitlisted' && waitlistPosition?.position != null && (
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
									Your spot is reserved — we'll be in touch when a litter is available.
								</p>
							</div>
						</div>
					)}

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

					{/* Deposit Selected */}
					<div className="py-3.5">
						<dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] text-warm-400 font-medium mb-1">
							Deposit Selected?
							<Tooltip />
						</dt>
						<dd className="flex items-center gap-3 mt-1">
							<span className="text-sm text-warm-800">
								{client.depositStatus === 'paid'
									? 'Yes — Received'
									: client.depositStatus === 'pending'
										? 'Yes — Reviewing payment'
										: 'No'}
							</span>
							{client.depositStatus === 'none' && (
								<button
									type="button"
									onClick={() => setShowDepositConfirm(true)}
									className="text-xs text-brand-500 hover:text-brand-600 cursor-pointer transition-colors"
								>
									Change selection →
								</button>
							)}
						</dd>
					</div>
				</dl>
			</Card>

			{showStages && (
				<StagesModal currentStage={client.stage} onClose={() => setShowStages(false)} />
			)}

			{showDepositConfirm && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4"
					style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
					aria-hidden="true"
					onClick={() => !depositLoading && setShowDepositConfirm(false)}
				>
					<div
						ref={depositDialogRef}
						role="dialog"
						aria-modal="true"
						aria-hidden="false"
						aria-labelledby="deposit-modal-title"
						className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
						onClick={(e) => e.stopPropagation()}
					>
						<div>
							<h2 id="deposit-modal-title" className="font-serif text-[17px] text-warm-900 mb-1.5">
								Change deposit selection?
							</h2>
							<p className="text-[13px] text-warm-600 leading-relaxed">
								You are about to mark your deposit as <span className="font-medium text-warm-800">Yes — Reviewing</span>. Please ensure you have made payment to the following account:
							</p>
							<div className="mt-3 rounded-xl bg-warm-50 border border-black/[0.06] px-4 py-3 text-[12.5px] text-warm-700 space-y-2">
								<p><span className="block text-[10px] font-medium text-warm-400 uppercase tracking-wide mb-0.5">Bank</span>First National Bank</p>
								<p><span className="block text-[10px] font-medium text-warm-400 uppercase tracking-wide mb-0.5">Account name</span>Paw Registry (Pty) Ltd</p>
								<p><span className="block text-[10px] font-medium text-warm-400 uppercase tracking-wide mb-0.5">Account number</span>62847301928</p>
								<p><span className="block text-[10px] font-medium text-warm-400 uppercase tracking-wide mb-0.5">Reference</span>{client.firstName} {client.lastName}</p>
							</div>
							<p className="mt-3 text-[12.5px] text-warm-500 leading-relaxed">
								We will review your payment shortly afterwards and confirm your deposit status.
							</p>
						</div>

						<div className="flex gap-2 pt-1">
							<button
								type="button"
								onClick={() => setShowDepositConfirm(false)}
								disabled={depositLoading}
								className="flex-1 py-2.5 text-sm text-warm-600 font-medium rounded-lg border border-black/[0.1] hover:bg-warm-50 transition-colors cursor-pointer disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirmDeposit}
								disabled={depositLoading}
								className="flex-1 py-2.5 bg-warm-900 text-white text-sm font-medium rounded-lg hover:bg-warm-800 transition-colors cursor-pointer disabled:opacity-50"
							>
								{depositLoading ? 'Saving…' : 'Confirm'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
