import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Trash2, ExternalLink, Loader2, Bell, FileText as FileIcon, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
	LoadingPage,
	Card,
	CardHeader,
	Avatar,
	StageBadge,
	DepositPill,
	Segmented,
} from '@/components/ui';
import type {
	Client,
	ClientStage,
	ClientActivity,
	EmailLog,
	DocumentTemplateWithChecklist,
	Payment,
	Invoice,
} from '@paw-registry/shared';
import { DeleteModal, formatBreedSize } from './_shared';

const EMAIL_TRIGGER_LABELS: Record<string, string> = {
	stage_enquired: 'Application Received',
	stage_approved: 'Application Approved',
	stage_waitlisted: 'Added to Waitlist',
	stage_puppy_reserved: 'Puppy Reserved',
	stage_puppy_booked: 'Puppy Booked',
	stage_puppy_fully_paid: 'Puppy Booked & Paid',
};

const ACTIVE_QUEUE_STAGES: ClientStage[] = ['waitlisted', 'puppy_reserved', 'puppy_booked'];

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'payments' | 'application' | 'documents' | 'activity';

// ─── Stage tracker ────────────────────────────────────────────────────────────

type StageStep = {
	key: ClientStage;
	label: string;
	caption: string;
	clickable: boolean;
};

const STAGE_STEPS: StageStep[] = [
	{ key: 'enquired',         label: 'Enquired',   caption: 'Application received', clickable: false },
	{ key: 'approved',         label: 'Approved',   caption: 'Admin reviewed',        clickable: true },
	{ key: 'waitlisted',       label: 'Waitlisted', caption: 'Documents signed',      clickable: true },
	{ key: 'puppy_reserved',   label: 'Reserved',   caption: 'Puppy chosen',          clickable: false },
	{ key: 'puppy_booked',     label: 'Booked',     caption: 'Booking paid',          clickable: false },
	{ key: 'puppy_fully_paid', label: 'Fully paid', caption: 'Final balance',         clickable: false },
];

function StageTracker({
	current,
	onSelect,
	busyStage,
	isRejected,
	onReject,
	onUnreject,
}: {
	current: ClientStage;
	onSelect: (stage: ClientStage) => void;
	busyStage: ClientStage | null;
	isRejected: boolean;
	onReject: () => void;
	onUnreject: () => void;
}) {
	const currentIdx = STAGE_STEPS.findIndex((s) => s.key === current);
	const progressPct = currentIdx >= 0 ? currentIdx / (STAGE_STEPS.length - 1) : 0;
	const nextActionIdx = isRejected
		? -1
		: STAGE_STEPS.findIndex((s, i) => i > currentIdx && s.clickable);
	// Bubbles are left-aligned (items-start) in a 6-column grid with 8px gap.
	// Bubble k center = column k left + 14px (half of 28px bubble). Track spans first → last center.
	const trackStart = '14px';
	const fullTrackWidth = `calc((5 * 100% + 40px) / 6)`;

	return (
		<div className="relative">
			<div className="absolute top-[13px] h-[2px] bg-warm-200 rounded-full" style={{ left: trackStart, width: fullTrackWidth }} />
			<div
				className="absolute top-[13px] h-[2px] rounded-full transition-all duration-500"
				style={{ left: trackStart, width: `calc(${fullTrackWidth} * ${progressPct})`, background: isRejected ? '#a8412e' : '#c47420' }}
			/>
			<div className="relative grid grid-cols-6 gap-2">
				{STAGE_STEPS.map((s, i) => {
					const done = i < currentIdx;
					const active = i === currentIdx;
					const busy = busyStage === s.key;
					const disabled = !s.clickable || busy;
					const isNextAction = i === nextActionIdx;
					return (
						<button
							key={s.key}
							type="button"
							onClick={() => s.clickable && !busy && onSelect(s.key)}
							disabled={disabled}
							className={`flex flex-col items-start text-left ${s.clickable ? 'cursor-pointer' : 'cursor-default'} disabled:opacity-100`}
						>
							<span
								className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all mb-2 ${isNextAction ? 'stage-next-glow' : ''}`}
								style={{
									background: isRejected ? '#fff' : (done || active ? '#c47420' : '#fff'),
									borderColor: isRejected ? '#d6c9b8' : (done || active || isNextAction ? '#c47420' : '#d6c9b8'),
									color: '#fff',
									boxShadow: active && !isRejected && !isNextAction ? '0 0 0 4px rgba(196,116,32,0.18)' : undefined,
								}}
							>
								{busy ? (
									<Loader2 size={14} className="animate-spin text-warm-500" aria-hidden="true" />
								) : done && !isRejected ? (
									<Check size={14} aria-hidden="true" />
								) : active && !isRejected ? (
									<span className="w-2 h-2 rounded-full bg-white" />
								) : null}
							</span>
							<span className={`text-[12.5px] font-medium ${(active || done) && !isRejected ? 'text-warm-900' : 'text-warm-500'}`}>
								{s.label}
							</span>
							<span className="text-[10.5px] text-warm-400 mt-0.5">{s.caption}</span>
						</button>
					);
				})}
			</div>

			{/* Reject toggle */}
			<div className="mt-5 pt-4 border-t border-black/[0.05] flex items-center justify-between">
				<div className="text-[12px] text-warm-500">
					{isRejected ? (
						<span className="inline-flex items-center gap-1.5 text-[#883224]">
							<AlertCircle size={13} aria-hidden="true" />
							Application rejected
						</span>
					) : (
						'Reserved, Booked and Fully paid are set automatically by the system.'
					)}
				</div>
				{isRejected ? (
					<button
						onClick={onUnreject}
						disabled={busyStage !== null}
						className="text-[12px] font-medium text-warm-600 hover:text-warm-900 transition-colors disabled:opacity-50"
					>
						Reinstate to Enquired
					</button>
				) : (
					<button
						onClick={onReject}
						disabled={busyStage !== null}
						className="text-[12px] font-medium text-[#a8412e] hover:text-[#7a1f14] transition-colors disabled:opacity-50"
					>
						Reject application
					</button>
				)}
			</div>
		</div>
	);
}

// ─── App field helpers ────────────────────────────────────────────────────────

function BreedSizeDisplay({ raw }: { raw: string | null | undefined }) {
	const parsed = formatBreedSize(raw);
	if (!parsed) return <span className="text-warm-300">—</span>;
	return (
		<span className="text-warm-800">
			<span className="font-medium">{parsed.breed}</span>
			{parsed.size && <span className="text-warm-400"> · {parsed.size}</span>}
		</span>
	);
}

function AppField({ label, value }: { label: string; value: unknown }) {
	const display = () => {
		if (value === null || value === undefined || value === '') return <span className="text-warm-300">—</span>;
		if (typeof value === 'boolean') return value
			? <span className="text-[#3f5a36] font-medium">Yes</span>
			: <span className="text-warm-400">No</span>;
		if (Array.isArray(value)) return value.length ? String(value.join(', ')) : <span className="text-warm-300">—</span>;
		const str = String(value);
		if (str === 'true') return <span className="text-[#3f5a36] font-medium">Yes</span>;
		if (str === 'false') return <span className="text-warm-400">No</span>;
		return <span className="text-warm-800">{str}</span>;
	};
	return (
		<div className="py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 items-start">
			<dt className="text-[11.5px] text-warm-400 uppercase tracking-[0.08em] pt-0.5">{label}</dt>
			<dd className="text-[13px]">{display()}</dd>
		</div>
	);
}

function AppGroup({ title, fields }: { title: string; fields: { label: string; value: unknown }[] }) {
	const visible = fields.filter(({ value }) => value !== null && value !== undefined && value !== '');
	if (visible.length === 0) return null;
	return (
		<Card>
			<CardHeader title={title} />
			<div className="px-[22px] pb-5">
				<dl className="divide-y divide-black/[0.05]">
					{visible.map(({ label, value }) => (
						<AppField key={label} label={label} value={value} />
					))}
				</dl>
			</div>
		</Card>
	);
}

// ─── Activity timeline ────────────────────────────────────────────────────────

const ACTOR_TONE: Record<string, string> = {
	system: '#7a6a58',
	admin: '#c47420',
	client: '#1e5b8a',
};

const ACTIVITY_LABELS: Record<string, string> = {
	application_submitted: 'Application submitted',
	stage_changed: 'Stage changed',
	deposit_changed: 'Deposit updated',
	preferences_updated: 'Preferences updated',
	notes_updated: 'Notes updated',
};

function PreferenceChanges({ changes }: { changes: Record<string, { from: unknown; to: unknown }> }) {
	const FIELD_LABELS: Record<string, string> = {
		preferredBreedSize: 'Breed/size',
		secondChoiceBreedSize: 'Second choice',
		preferredSex: 'Preferred sex',
		preferredColour: 'Preferred colour',
		considerOppositeSex: 'Open to opposite sex',
		considerOtherColour: 'Open to other colour',
		considerOtherBreedSize: 'Open to other breed/size',
		considerRehome: 'Open to rehome',
		readyTimeframe: 'Ready timeframe',
		puppyPurpose: 'Purpose',
	};
	const formatVal = (v: unknown): string => {
		if (v === null || v === undefined || v === '') return '—';
		if (typeof v === 'boolean') return v ? 'Yes' : 'No';
		return String(v);
	};
	return (
		<div className="mt-1.5 space-y-0.5">
			{Object.entries(changes).map(([key, { from, to }]) => (
				<p key={key} className="text-xs text-warm-400">
					<span className="text-warm-500">{FIELD_LABELS[key] ?? key}:</span>{' '}
					<span className="line-through">{formatVal(from)}</span>{' '}
					<span className="text-warm-700">{formatVal(to)}</span>
				</p>
			))}
		</div>
	);
}

function ActivityTimeline({ activities }: { activities: ClientActivity[] }) {
	if (activities.length === 0) {
		return <p className="text-sm text-warm-400">No activity recorded yet.</p>;
	}
	return (
		<div className="relative pl-5">
			<div className="absolute left-[5px] top-2 bottom-2 w-px bg-warm-200" />
			{activities.map((activity) => {
				const meta = activity.metadata as Record<string, unknown>;
				const tone = ACTOR_TONE[activity.actor] ?? '#7a6a58';
				const label = ACTIVITY_LABELS[activity.type] ?? activity.type;
				return (
					<div key={activity.id} className="relative pb-5 last:pb-0">
						<span
							className="absolute -left-5 top-1 w-[11px] h-[11px] rounded-full border-2 border-white"
							style={{ background: tone }}
							aria-hidden="true"
						/>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="text-[13px] text-warm-800">
									<span className="font-medium">{label}</span>
									{activity.type === 'stage_changed' && !!meta.from && !!meta.to && (
										<span className="text-warm-400 font-normal"> · {String(meta.from)} → {String(meta.to)}</span>
									)}
									{activity.type === 'deposit_changed' && !!meta.from && !!meta.to && (
										<span className="text-warm-400 font-normal"> · {String(meta.from)} → {String(meta.to)}</span>
									)}
								</p>
								{activity.type === 'preferences_updated' && !!meta.changes && (
									<PreferenceChanges changes={meta.changes as Record<string, { from: unknown; to: unknown }>} />
								)}
								<p className="text-[11px] uppercase tracking-[0.08em] text-warm-400 mt-1">{activity.actor}</p>
							</div>
							<span className="text-[11.5px] text-warm-400 font-mono tabular-nums whitespace-nowrap">
								{new Date(activity.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdminClientDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [client, setClient] = useState<Client | null>(null);
	const [waitlistPosition, setWaitlistPosition] = useState<{ position: number | null; total: number | null } | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [impersonating, setImpersonating] = useState(false);
	const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
	const [activities, setActivities] = useState<ClientActivity[]>([]);
	const [templates, setTemplates] = useState<DocumentTemplateWithChecklist[]>([]);
	const [stagingTo, setStagingTo] = useState<ClientStage | null>(null);
	const [tab, setTab] = useState<Tab>('overview');
	const [clientLitterInterests, setClientLitterInterests] = useState<Array<{
		id: string; clientId: string; litterId: string; createdAt: string;
		litter: { id: string; name: string; breed: string | null; status: string; selectionDate: string };
	}>>([]);
	const [payments, setPayments] = useState<Payment[]>([]);
	const [showFinalPaymentModal, setShowFinalPaymentModal] = useState(false);
	const [finalPrice, setFinalPrice] = useState('');
	const [requestingFinal, setRequestingFinal] = useState(false);
	const [finalError, setFinalError] = useState('');
	const [paymentSummary, setPaymentSummary] = useState<{
		puppyPriceRands: number | null;
		shippingRands: number | null;
		totalPriceRands: number | null;
		alreadyPaid: number;
		balanceDue: number | null;
	} | null>(null);
	const [instalmentMode, setInstalmentMode] = useState(false);
	const [instalmentCount, setInstalmentCount] = useState(3);
	const [customAmounts, setCustomAmounts] = useState(false);
	const [instalmentAmounts, setInstalmentAmounts] = useState<string[]>([]);
	const [instalmentDueDates, setInstalmentDueDates] = useState<string[]>([]);
	const [fullPaymentDueDate, setFullPaymentDueDate] = useState('');
	const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
	const [creatingInvoice, setCreatingInvoice] = useState(false);
	const [invoiceError, setInvoiceError] = useState<string | null>(null);
	const [invoiceToast, setInvoiceToast] = useState<string | null>(null);

	const loadTemplates = () => {
		if (!id) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.templates as any).admin({ clientId: id }).checklist.get().then(({ data }: { data: DocumentTemplateWithChecklist[] | null }) => {
			if (data) setTemplates(data);
		});
	};

	const load = () => {
		if (!id) return;
		api.clients.admin({ id }).get().then(({ data }) => {
			if (data) {
				const c = data as Client;
				setClient(c);
				if (ACTIVE_QUEUE_STAGES.includes(c.stage)) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(api.clients.admin({ id }) as any)['waitlist-position'].get().then(({ data: pos }: { data: { position: number | null; total: number | null } | null }) => {
						if (pos) setWaitlistPosition(pos);
					});
				} else {
					setWaitlistPosition(null);
				}
			}
			setLoading(false);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.email as any).logs.get({ query: { clientId: id } }).then(({ data }: { data: EmailLog[] | null }) => {
			if (data) setEmailLogs(data);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.clients.admin({ id }) as any).activity.get().then(({ data }: { data: ClientActivity[] | null }) => {
			if (data) setActivities(data);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.clients as any).admin({ id })['litter-interests'].get().then(({ data }: { data: typeof clientLitterInterests | null }) => {
			if (data) setClientLitterInterests(data);
		}).catch(() => {});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.payments as any).client({ clientId: id }).get().then(({ data }: { data: Payment[] | null }) => {
			if (data) setPayments(data);
		}).catch(() => {});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.payments as any).summary({ clientId: id }).get().then(({ data }: { data: typeof paymentSummary | null }) => {
			if (data) setPaymentSummary(data);
		}).catch(() => {});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.invoices as any).admin.get({ query: { clientId: id } }).then(({ data }: { data: Invoice[] | null }) => {
			if (data) setClientInvoices(data);
		}).catch(() => {});
		loadTemplates();
	};

	useEffect(() => { load(); }, [id]);

	usePageTitle(client ? `${client.firstName} ${client.lastName}` : undefined);

	const updateStage = async (stage: ClientStage) => {
		if (!id) return;
		setStagingTo(stage);
		setClient((prev) => prev ? { ...prev, stage } : prev);
		await api.clients.admin({ id }).patch({ stage });
		setStagingTo(null);
		load();
	};

	const openAsClient = async () => {
		if (!id) return;
		setImpersonating(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data, error } = await (api.clients.admin({ id }) as any)['impersonate'].post();
		setImpersonating(false);
		if (error || !data?.url) return;
		window.open(data.url, '_blank');
	};

	const deleteClient = async () => {
		if (!id) return;
		setDeleting(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error } = await (api.clients.admin({ id }) as any).delete();
		if (!error) {
			navigate('/admin/clients', { state: { toast: `${client?.firstName ?? 'Client'} deleted.` } });
		}
		setDeleting(false);
	};

	const daysSinceApply = useMemo(() => {
		if (!client) return 0;
		return Math.max(0, Math.round((Date.now() - new Date(client.createdAt).getTime()) / 86400000));
	}, [client]);

	if (loading) return <LoadingPage />;
	if (!client) return <div className="p-4 md:p-8 text-warm-500">Client not found.</div>;

	const a = client.applicationData as unknown as Record<string, unknown>;

	const readyLabels: Record<string, string> = {
		asap: 'As soon as possible',
		'6_months': 'In about 6 months',
		'1_year': 'In about a year',
	};
	const budgetLabels: Record<string, string> = {
		r5k_r10k: 'R5,000 – R10,000',
		r10k_r20k: 'R10,000 – R20,000',
		r30k_r40k: 'R30,000 – R40,000',
		r40k_plus: 'R40,000+',
	};

	const fullName = `${client.firstName} ${client.lastName}`;
	const isWaitlist = ACTIVE_QUEUE_STAGES.includes(client.stage);
	const isRejected = client.stage === 'rejected';

	const tabOptions: { value: Tab; label: string; count?: number }[] = [
		{ value: 'overview', label: 'Overview' },
		{ value: 'payments', label: 'Payments', count: payments.length },
		{ value: 'application', label: 'Application' },
		{ value: 'documents', label: 'Documents', count: templates.length },
		{ value: 'activity', label: 'Activity', count: activities.length + emailLogs.length },
	];

	return (
		<div className="p-5 md:p-8 max-w-[1440px]">
			{/* Toast */}
			{invoiceToast && (
				<div
					role="status"
					className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-warm-900 text-white text-sm font-medium rounded-xl shadow-lg pointer-events-none"
				>
					{invoiceToast}
				</div>
			)}

			<Link to="/admin/clients" className="inline-flex items-center gap-1.5 text-[12.5px] text-warm-500 hover:text-warm-800 mb-4">
				<ArrowLeft size={13} aria-hidden="true" /> All clients
			</Link>

			{/* Identity row */}
			<div className="flex flex-wrap items-start justify-between gap-5 mb-6">
				<div className="flex items-start gap-4 min-w-0">
					<Avatar name={fullName} size={64} />
					<div className="min-w-0">
						<h1 className="font-serif text-[30px] text-warm-900 leading-tight truncate">{fullName}</h1>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-warm-600 mt-1">
							<span className="truncate">{client.email}</span>
							{client.phone && (<><span className="text-warm-300">·</span><span>{client.phone}</span></>)}
							{client.city && (<><span className="text-warm-300">·</span><span>{client.city}</span></>)}
							<span className="text-warm-300">·</span>
							<span>Applied {new Date(client.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
						</div>
						<div className="flex flex-wrap items-center gap-2 mt-3">
							<StageBadge stage={client.stage} />
							<DepositPill status={client.depositStatus} tier={client.depositTier} />
							{isWaitlist && waitlistPosition?.position != null && (
								<span className="inline-block text-[11px] font-mono text-warm-600 bg-warm-100 rounded px-2 py-1 tabular-nums">
									Waitlist #{String(waitlistPosition.position).padStart(2, '0')}
									{waitlistPosition.total != null && <span className="text-warm-400"> / {waitlistPosition.total}</span>}
								</span>
							)}
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<button
						onClick={openAsClient}
						disabled={impersonating}
						className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-white text-warm-700 text-[12.5px] font-medium rounded-[9px] border border-warm-200 hover:bg-warm-50 transition-colors disabled:opacity-50"
					>
						<ExternalLink size={13} aria-hidden="true" />
						{impersonating ? 'Opening…' : 'Open as client'}
					</button>
					<button
						onClick={() => setDeleteOpen(true)}
						className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-white text-[#883224] text-[12.5px] font-medium rounded-[9px] border border-[#ebcfc9] hover:bg-[#fdf5f3] transition-colors"
					>
						<Trash2 size={13} aria-hidden="true" /> Delete
					</button>
				</div>
			</div>

			{/* Journey card */}
			<Card className="mb-5">
				<div className="px-[22px] py-5">
					<div className="flex items-center justify-between mb-5">
						<div>
							<h3 className="text-[14px] font-medium text-warm-900">Journey</h3>
							<p className="text-[12px] text-warm-500 mt-0.5">Click a stage to advance. System-set stages are locked.</p>
						</div>
						<span className="text-[11.5px] text-warm-500">
							Since {new Date(client.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })} · {daysSinceApply} {daysSinceApply === 1 ? 'day' : 'days'}
						</span>
					</div>
					<StageTracker
						current={isRejected ? 'enquired' : client.stage}
						onSelect={updateStage}
						busyStage={stagingTo}
						isRejected={isRejected}
						onReject={() => updateStage('rejected')}
						onUnreject={() => updateStage('enquired')}
					/>
				</div>
			</Card>

			{/* Tabs */}
			<div className="mb-5">
				<Segmented options={tabOptions} value={tab} onChange={setTab} ariaLabel="Client sections" />
			</div>

			{tab === 'overview' && (
				<OverviewTab
					client={client}
					app={a}
					paymentSummary={paymentSummary}
					litterInterests={clientLitterInterests}
				/>
			)}

			{tab === 'payments' && (
				<PaymentsTab
					client={client}
					payments={payments}
					paymentSummary={paymentSummary}
					invoices={clientInvoices}
					invoiceError={invoiceError}
					creatingInvoice={creatingInvoice}
					onCreateInvoice={async () => {
						if (!client.puppyId) return;
						setCreatingInvoice(true);
						setInvoiceError(null);
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const { error: err } = await (api.invoices as any).admin.post({ clientId: client.id, puppyId: client.puppyId });
						if (err) {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							setInvoiceError((err as any).value?.message ?? 'Failed to create invoice');
							setCreatingInvoice(false);
							return;
						}
						await load();
						setCreatingInvoice(false);
						setInvoiceToast('Invoice created');
						setTimeout(() => setInvoiceToast(null), 3000);
					}}
					onOpenFinalModal={() => {
						setFinalPrice('');
						setFinalError('');
						setInstalmentMode(false);
						setInstalmentDueDates([]);
						setFullPaymentDueDate('');
						setShowFinalPaymentModal(true);
					}}
					onMarkPaid={async (p) => {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						await (api.payments as any)({ id: p.id })['mark-paid'].patch();
						load();
					}}
					onSendInvoice={async (inv) => {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						await (api.invoices as any).admin({ id: inv.id }).send.post();
						load();
					}}
					onCancelInvoice={async (inv) => {
						setClientInvoices((prev) => prev.filter((i) => i.id !== inv.id));
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						await (api.invoices as any).admin({ id: inv.id }).patch({ status: 'cancelled' });
					}}
				/>
			)}

			{tab === 'application' && (
				<ApplicationTab a={a} readyLabels={readyLabels} budgetLabels={budgetLabels} />
			)}

			{tab === 'documents' && (
				<DocumentsTab templates={templates} />
			)}

			{tab === 'activity' && (
				<ActivityTab activities={activities} emailLogs={emailLogs} />
			)}

			{/* Final payment / instalment modal */}
			{showFinalPaymentModal && (
				<FinalPaymentModal
					client={client}
					paymentSummary={paymentSummary}
					finalPrice={finalPrice}
					setFinalPrice={setFinalPrice}
					instalmentMode={instalmentMode}
					setInstalmentMode={setInstalmentMode}
					instalmentCount={instalmentCount}
					setInstalmentCount={setInstalmentCount}
					customAmounts={customAmounts}
					setCustomAmounts={setCustomAmounts}
					instalmentAmounts={instalmentAmounts}
					setInstalmentAmounts={setInstalmentAmounts}
					instalmentDueDates={instalmentDueDates}
					setInstalmentDueDates={setInstalmentDueDates}
					fullPaymentDueDate={fullPaymentDueDate}
					setFullPaymentDueDate={setFullPaymentDueDate}
					finalError={finalError}
					setFinalError={setFinalError}
					requestingFinal={requestingFinal}
					setRequestingFinal={setRequestingFinal}
					onClose={() => setShowFinalPaymentModal(false)}
					onDone={() => { setShowFinalPaymentModal(false); load(); }}
				/>
			)}

			<DeleteModal
				open={deleteOpen}
				entityLabel={fullName}
				onClose={() => setDeleteOpen(false)}
				onConfirm={deleteClient}
				deleting={deleting}
				blockingRecords={null}
			/>
		</div>
	);
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
	client,
	app,
	paymentSummary,
	litterInterests,
}: {
	client: Client;
	app: Record<string, unknown>;
	paymentSummary: {
		puppyPriceRands: number | null;
		shippingRands: number | null;
		totalPriceRands: number | null;
		alreadyPaid: number;
		balanceDue: number | null;
	} | null;
	litterInterests: Array<{
		id: string; clientId: string; litterId: string; createdAt: string;
		litter: { id: string; name: string; breed: string | null; status: string; selectionDate: string };
	}>;
}) {
	const paid = paymentSummary?.alreadyPaid ?? 0;
	const total = paymentSummary?.totalPriceRands ?? 0;
	const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
	const remaining = Math.max(0, total - paid);

	const prefs: [string, React.ReactNode][] = [
		['Breed · Size', app.preferredBreedSize ? <BreedSizeDisplay raw={app.preferredBreedSize as string} /> : '—'],
		['Sex', app.preferredSex === 'no_preference' ? 'No preference' : (app.preferredSex ? <span className="capitalize">{String(app.preferredSex)}</span> : '—')],
		['Colour', (app.preferredColour as string) ?? '—'],
		['Ready', app.readyTimeframe ? ({ asap: 'ASAP', '6_months': '~6 months', '1_year': '~1 year' } as Record<string, string>)[app.readyTimeframe as string] ?? String(app.readyTimeframe) : '—'],
		['Budget', app.budget ? ({ r5k_r10k: 'R5k – R10k', r10k_r20k: 'R10k – R20k', r30k_r40k: 'R30k – R40k', r40k_plus: 'R40k+' } as Record<string, string>)[app.budget as string] ?? String(app.budget) : '—'],
		['Considers rehome', app.considerRehome === true ? 'Yes' : app.considerRehome === false ? 'No' : '—'],
		['Purpose', (app.puppyPurpose as string) ?? '—'],
		['Experience', app.previousDogExperience === true ? 'Yes' : app.previousDogExperience === false ? 'No' : '—'],
	];

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
			<div className="lg:col-span-2 space-y-5">
				{total > 0 && (
					<Card>
						<CardHeader
							title="Payment progress"
							action={<span className="text-[12.5px] font-mono text-warm-500 tabular-nums">{pct}%</span>}
						/>
						<div className="px-[22px] pb-5">
							<p className="text-[12.5px] text-warm-500 -mt-1 mb-3">R{paid.toLocaleString()} of R{total.toLocaleString()} received</p>
							<div className="h-2 bg-warm-100 rounded-full overflow-hidden">
								<div
									className="h-full rounded-full transition-all duration-700"
									style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #d98e3a, #c47420)' }}
								/>
							</div>
							<div className="grid grid-cols-3 gap-3 mt-5">
								<div>
									<div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Paid</div>
									<div className="font-serif text-[20px] text-warm-900 mt-0.5">R{paid.toLocaleString()}</div>
								</div>
								<div>
									<div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Remaining</div>
									<div className="font-serif text-[20px] text-warm-900 mt-0.5">R{remaining.toLocaleString()}</div>
								</div>
								<div>
									<div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">Total</div>
									<div className="font-serif text-[20px] text-warm-900 mt-0.5">R{total.toLocaleString()}</div>
								</div>
							</div>
						</div>
					</Card>
				)}

				<Card>
					<CardHeader title="Preferences" />
					<div className="px-[22px] pb-5 grid grid-cols-2 gap-x-6 gap-y-3">
						{prefs.map(([k, v]) => (
							<div key={k}>
								<div className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400">{k}</div>
								<div className="text-[13px] text-warm-800 mt-0.5">{v}</div>
							</div>
						))}
					</div>
				</Card>
			</div>

			<div className="space-y-5">
				{litterInterests.length > 0 && (
					<Card>
						<CardHeader title="Litter interest" />
						<div className="px-[22px] pb-5 divide-y divide-black/[0.05]">
							{litterInterests.map((li) => (
								<div key={li.id} className="py-2.5">
									<Link to={`/admin/litters/${li.litterId}`} className="text-[13px] font-medium text-warm-900 hover:text-brand-600 block truncate">
										{li.litter.name}
									</Link>
									<div className="flex items-center gap-2 mt-0.5 text-[11.5px] text-warm-400 capitalize">
										{li.litter.breed && <span>{li.litter.breed}</span>}
										<span>· {li.litter.status}</span>
										<span>· Selection {new Date(li.litter.selectionDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
									</div>
								</div>
							))}
						</div>
					</Card>
				)}

				<Card>
					<CardHeader title="Admin notes" />
					<div className="px-[22px] pb-5">
						{client.adminNotes ? (
							<div className="text-[13px] text-warm-700 leading-relaxed bg-warm-50 rounded-[10px] p-3 border border-warm-100 whitespace-pre-wrap">
								{client.adminNotes}
							</div>
						) : (
							<p className="text-[12.5px] text-warm-400 italic">No admin notes yet.</p>
						)}
					</div>
				</Card>
			</div>
		</div>
	);
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({
	client,
	payments,
	paymentSummary,
	invoices,
	invoiceError,
	creatingInvoice,
	onCreateInvoice,
	onOpenFinalModal,
	onMarkPaid,
	onSendInvoice,
	onCancelInvoice,
}: {
	client: Client;
	payments: Payment[];
	paymentSummary: {
		puppyPriceRands: number | null;
		shippingRands: number | null;
		totalPriceRands: number | null;
		alreadyPaid: number;
		balanceDue: number | null;
	} | null;
	invoices: Invoice[];
	invoiceError: string | null;
	creatingInvoice: boolean;
	onCreateInvoice: () => void;
	onOpenFinalModal: () => void;
	onMarkPaid: (p: Payment) => void;
	onSendInvoice: (inv: Invoice) => void;
	onCancelInvoice: (inv: Invoice) => void;
}) {
	const showRequestFinal = client.stage === 'puppy_booked' && !payments.some((p) => p.type === 'final' && p.status !== 'cancelled');
	const showSummary = client.stage === 'puppy_booked' && paymentSummary && paymentSummary.puppyPriceRands != null;

	return (
		<div className="space-y-5">
			{showSummary && paymentSummary && (
				<Card>
					<CardHeader title="Balance" />
					<div className="px-[22px] pb-5 space-y-1.5 text-[13px]">
						<div className="flex justify-between">
							<span className="text-warm-600">Puppy price</span>
							<span className="font-medium text-warm-900 tabular-nums">R{(paymentSummary.puppyPriceRands ?? 0).toLocaleString()}</span>
						</div>
						{(paymentSummary.shippingRands ?? 0) > 0 && (
							<div className="flex justify-between">
								<span className="text-warm-600">Shipping</span>
								<span className="font-medium text-warm-900 tabular-nums">R{(paymentSummary.shippingRands ?? 0).toLocaleString()}</span>
							</div>
						)}
						<div className="flex justify-between border-t border-black/[0.06] pt-1.5">
							<span className="text-warm-700 font-medium">Total</span>
							<span className="font-semibold text-warm-900 tabular-nums">R{(paymentSummary.totalPriceRands ?? 0).toLocaleString()}</span>
						</div>
						<div className="flex justify-between text-warm-500">
							<span>Already paid</span>
							<span className="tabular-nums">-R{paymentSummary.alreadyPaid.toLocaleString()}</span>
						</div>
						<div className="flex justify-between border-t border-black/[0.06] pt-1.5">
							<span className="font-semibold text-warm-800">Balance due</span>
							<span className="font-bold text-warm-900 tabular-nums">R{(paymentSummary.balanceDue ?? 0).toLocaleString()}</span>
						</div>
					</div>
				</Card>
			)}

			<Card>
				<CardHeader
					title="Payment ledger"
					action={showRequestFinal ? (
						<button
							onClick={onOpenFinalModal}
							className="px-3 py-1.5 bg-warm-900 hover:bg-warm-700 text-white text-[11.5px] font-medium rounded-[9px] transition-colors"
						>
							Request final payment
						</button>
					) : undefined}
				/>
				{payments.length === 0 ? (
					<p className="px-[22px] pb-5 text-sm text-warm-400">No payment records yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr>
									{['Type', 'Amount', 'Status', 'Date', ''].map((h) => (
										<th key={h} className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400 font-medium px-[18px] py-3 text-left border-t border-b border-black/[0.06] whitespace-nowrap">{h}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{payments.map((p) => {
									const meta = p.metadata as Record<string, unknown>;
									const isInstalment = !!meta.isInstalment;
									const typeLabel = p.type === 'deposit' ? 'Waitlist deposit'
										: p.type === 'booking' ? 'Booking payment'
										: isInstalment ? `Final (${Number(meta.instalmentIndex) + 1}/${meta.instalmentTotal})`
										: 'Final balance';
									const statusPill = (() => {
										if (p.status === 'complete') return { bg: '#e4ebe0', fg: '#3e5a2a', label: 'Paid' };
										if (p.status === 'pending') return { bg: '#fef3e7', fg: '#a35c17', label: 'Pending' };
										if (p.status === 'failed') return { bg: '#f4e4e1', fg: '#883224', label: 'Failed' };
										return { bg: '#eeeae5', fg: '#7a6a58', label: 'Cancelled' };
									})();
									const msLeft = p.expiresAt ? new Date(p.expiresAt).getTime() - Date.now() : null;
									const hoursLeft = msLeft !== null ? Math.floor(msLeft / (1000 * 60 * 60)) : null;
									const isExpired = msLeft !== null && msLeft <= 0;
									return (
										<tr key={p.id} className="border-b border-black/[0.04] last:border-0">
											<td className="px-[18px] py-3 text-[13px] text-warm-800 font-medium">{typeLabel}</td>
											<td className="px-[18px] py-3 text-[13px] font-medium text-warm-900 tabular-nums">R{p.amountRands.toLocaleString()}</td>
											<td className="px-[18px] py-3">
												<span
													className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-[3px] rounded-full font-medium"
													style={{ background: statusPill.bg, color: statusPill.fg }}
												>
													<span className="w-1.5 h-1.5 rounded-full" style={{ background: statusPill.fg }} aria-hidden="true" />
													{statusPill.label}
												</span>
											</td>
											<td className="px-[18px] py-3 text-[12.5px] text-warm-500 tabular-nums whitespace-nowrap">
												{p.paidAt
													? new Date(p.paidAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })
													: p.dueDate
														? `Due ${new Date(p.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })}`
														: new Date(p.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })
												}
												{p.status === 'pending' && hoursLeft !== null && (
													<span className={`ml-2 ${isExpired ? 'text-[#a8412e] font-medium' : 'text-[#a35c17]'}`}>
														{isExpired ? 'Expired' : `${hoursLeft}h left`}
													</span>
												)}
											</td>
											<td className="px-[18px] py-3 text-right">
												{p.status === 'pending' && p.type === 'final' && (
													<button
														onClick={() => onMarkPaid(p)}
														className="text-[12px] text-[#c47420] font-medium hover:underline"
													>
														Mark paid
													</button>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			<Card>
				<CardHeader
					title="Invoices"
					action={client.puppyId ? (
						<button
							onClick={onCreateInvoice}
							disabled={creatingInvoice}
							className="px-3 py-1.5 bg-warm-900 hover:bg-warm-700 text-white text-[11.5px] font-medium rounded-[9px] transition-colors disabled:opacity-50"
						>
							{creatingInvoice ? 'Creating…' : 'Create invoice'}
						</button>
					) : undefined}
				/>
				{invoiceError && <p role="alert" className="px-[22px] pb-2 text-[#a8412e] text-[12px]">{invoiceError}</p>}
				{invoices.length === 0 ? (
					<p className="px-[22px] pb-5 text-sm text-warm-400">No invoices yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr>
									{['Invoice', 'Total', 'Paid', 'Status', ''].map((h) => (
										<th key={h} className="text-[10.5px] uppercase tracking-[0.08em] text-warm-400 font-medium px-[18px] py-3 text-left border-t border-b border-black/[0.06] whitespace-nowrap">{h}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{invoices.map((inv) => {
									const balanceDue = Math.max(0, inv.totalRands - inv.paidRands);
									const pill = (() => {
										if (inv.status === 'paid')      return { bg: '#e4ebe0', fg: '#3e5a2a', label: 'Paid' };
										if (inv.status === 'sent')      return { bg: '#e5ecf2', fg: '#1e5b8a', label: 'Sent' };
										if (inv.status === 'viewed')    return { bg: '#e8dff0', fg: '#5a2d83', label: 'Viewed' };
										if (inv.status === 'cancelled') return { bg: '#eeeae5', fg: '#7a6a58', label: 'Cancelled' };
										return { bg: '#fef3e7', fg: '#a35c17', label: 'Draft' };
									})();
									return (
										<tr key={inv.id} className="border-b border-black/[0.04] last:border-0">
											<td className="px-[18px] py-3 text-[13px] font-medium text-warm-900">{inv.invoiceNumber}</td>
											<td className="px-[18px] py-3 text-[13px] text-warm-800 tabular-nums">R{inv.totalRands.toLocaleString()}</td>
											<td className="px-[18px] py-3 text-[13px] text-warm-500 tabular-nums">
												R{inv.paidRands.toLocaleString()}
												{balanceDue > 0 && <span className="text-[#a35c17] ml-1">· R{balanceDue.toLocaleString()} due</span>}
											</td>
											<td className="px-[18px] py-3">
												<span
													className="inline-block px-2 py-[3px] rounded-full text-[11.5px] font-medium"
													style={{ background: pill.bg, color: pill.fg }}
												>
													{pill.label}
												</span>
											</td>
											<td className="px-[18px] py-3 text-right whitespace-nowrap">
												<a
													href={`/invoices/${inv.viewToken}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-[12px] text-[#c47420] font-medium hover:underline mr-3"
												>
													View
												</a>
												{inv.status !== 'cancelled' && inv.status !== 'paid' && (
													<button
														onClick={() => onSendInvoice(inv)}
														className="text-[12px] text-warm-600 font-medium hover:underline mr-3"
													>
														Send
													</button>
												)}
												{inv.status === 'draft' && (
													<button
														onClick={() => onCancelInvoice(inv)}
														className="text-[12px] text-[#a8412e] font-medium hover:underline"
													>
														Cancel
													</button>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</div>
	);
}

// ─── Application Tab ──────────────────────────────────────────────────────────

function ApplicationTab({
	a,
	readyLabels,
	budgetLabels,
}: {
	a: Record<string, unknown>;
	readyLabels: Record<string, string>;
	budgetLabels: Record<string, string>;
}) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			<AppGroup title="Personal" fields={[
				{ label: 'Primary caregiver', value: a.primaryCaregiver },
				{ label: 'Home ownership', value: a.residenceOwnership },
				{ label: 'Dog allergies in household', value: a.allergiesToDogs },
				{ label: 'All family members agree', value: a.allFamilyMembersAgree },
				{ label: 'Has children', value: a.hasChildren },
				{ label: "Children's ages & genders", value: a.childrenGenderAges },
				{ label: 'Has other pets', value: a.hasOtherPets },
				{ label: 'Other pets', value: a.otherPetsDescription },
			]} />

			<AppGroup title="Home" fields={[
				{ label: 'Type of home', value: a.livingType },
				{ label: 'Home type (other)', value: a.otherLivingType },
				{ label: 'Has fenced yard', value: a.hasGarden },
				{ label: 'Yard size', value: a.yardSize },
				{ label: 'Pool or open driveway', value: a.hasPoolOrDriveway },
				{ label: 'Pool/driveway fenced off', value: a.poolDrivewayFenced },
				{ label: 'Neighbourhood restrictions', value: a.neighbourhoodRestrictions },
				{ label: 'Restriction details', value: a.neighbourhoodRestrictionsDetails },
				{ label: 'Dog lives indoors', value: a.dogLivesIndoors },
				{ label: 'Daytime location', value: a.puppyDaytimeLocation },
				{ label: 'Hours alone per day', value: a.hoursAlonePerDay },
				{ label: 'Someone home during the day', value: a.someoneHomeDuringDay },
				{ label: 'Alone arrangements', value: a.aloneArrangements },
				{ label: 'Activity level & hobbies', value: a.activityLevel },
			]} />

			<AppGroup title="Experience" fields={[
				{ label: 'Previous dog experience', value: a.previousDogExperience },
				{ label: 'Breeds owned previously', value: a.breedsOwnedPast },
				{ label: 'Experience description', value: a.experienceDescription },
				{ label: 'Returned pet to breeder', value: a.returnedPetToBreeder },
				{ label: 'Return circumstances', value: a.returnedPetDetails },
				{ label: 'Given a pet away', value: a.givenPetAway },
				{ label: 'Given away circumstances', value: a.givenPetAwayDetails },
				{ label: 'Willing for obedience classes', value: a.willingForObedienceClasses },
				{ label: 'References', value: a.references },
			]} />

			<Card>
				<CardHeader title="Puppy preferences" />
				<div className="px-[22px] pb-5">
					<dl className="divide-y divide-black/[0.05]">
						{!!a.puppyPurpose && <AppField label="Purpose" value={a.puppyPurpose} />}
						{!!a.readyTimeframe && <AppField label="Ready timeframe" value={readyLabels[a.readyTimeframe as string] ?? a.readyTimeframe} />}
						{!!a.budget && <AppField label="Budget" value={budgetLabels[a.budget as string] ?? a.budget} />}
						{!!a.preferredBreedSize && (
							<div className="py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 items-start">
								<dt className="text-[11.5px] text-warm-400 uppercase tracking-[0.08em] pt-0.5">First choice</dt>
								<dd className="text-[13px]"><BreedSizeDisplay raw={a.preferredBreedSize as string} /></dd>
							</div>
						)}
						{!!a.secondChoiceBreedSize && (
							<div className="py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 items-start">
								<dt className="text-[11.5px] text-warm-400 uppercase tracking-[0.08em] pt-0.5">Second choice</dt>
								<dd className="text-[13px]"><BreedSizeDisplay raw={a.secondChoiceBreedSize as string} /></dd>
							</div>
						)}
						<AppField label="Open to other breed/size" value={a.considerOtherBreedSize} />
						{!!a.preferredSex && (
							<div className="py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 items-start">
								<dt className="text-[11.5px] text-warm-400 uppercase tracking-[0.08em] pt-0.5">Preferred sex</dt>
								<dd className="text-[13px] text-warm-800">
									{a.preferredSex === 'no_preference' ? 'No preference' : <span className="capitalize">{String(a.preferredSex)}</span>}
								</dd>
							</div>
						)}
						<AppField label="Open to opposite sex" value={a.considerOppositeSex} />
						{!!a.preferredColour && <AppField label="Preferred colour" value={a.preferredColour} />}
						<AppField label="Open to other colour" value={a.considerOtherColour} />
						<AppField label="Would consider rehome" value={a.considerRehome} />
						<AppField label="Agreed to contract" value={a.agreedToContract} />
					</dl>
				</div>
			</Card>
		</div>
	);
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ templates }: { templates: DocumentTemplateWithChecklist[] }) {
	if (templates.length === 0) {
		return (
			<Card>
				<div className="px-[22px] py-10 text-center">
					<FileIcon size={24} className="mx-auto text-warm-300 mb-2" aria-hidden="true" />
					<p className="text-sm text-warm-400">No document templates set up yet.</p>
				</div>
			</Card>
		);
	}

	const submitted = templates.filter((t) => t.checkedAt).length;

	return (
		<Card>
			<CardHeader
				title="Document checklist"
				action={<span className="text-[11.5px] text-warm-500 tabular-nums">{submitted} / {templates.length} completed</span>}
			/>
			<table className="w-full">
				<tbody>
					{templates.map((t) => {
						const done = !!t.checkedAt;
						const hasFile = !!t.uploadedFileUrl;
						const pill = done
							? { bg: '#e4ebe0', fg: '#3e5a2a', label: 'Signed' }
							: hasFile
								? { bg: '#e5ecf2', fg: '#1e5b8a', label: 'Submitted' }
								: { bg: '#fef3e7', fg: '#a35c17', label: 'Pending' };
						return (
							<tr key={t.id} className="border-b border-black/[0.04] last:border-0">
								<td className="px-[22px] py-4">
									<div className="flex items-center gap-3">
										<div
											className="w-9 h-10 rounded flex items-center justify-center shrink-0"
											style={{ background: done ? '#e4ebe0' : '#f5f0e8', border: `1px solid ${done ? '#cbd9c2' : '#e4dcce'}` }}
										>
											{done ? (
												<Check size={14} style={{ color: '#3e5a2a' }} aria-hidden="true" />
											) : (
												<FileIcon size={14} style={{ color: '#7a6a58' }} aria-hidden="true" />
											)}
										</div>
										<div className="min-w-0">
											<div className="text-[13.5px] font-medium text-warm-900 truncate">{t.name}</div>
											<div className="text-[11.5px] text-warm-500">
												{done && t.checkedAt
													? `Signed ${new Date(t.checkedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })}`
													: t.category ?? 'Not yet submitted'}
											</div>
										</div>
									</div>
								</td>
								<td className="px-[22px] py-4 text-right whitespace-nowrap">
									<span
										className="inline-block px-2.5 py-[4px] rounded-full text-[11.5px] font-medium mr-3"
										style={{ background: pill.bg, color: pill.fg }}
									>
										{pill.label}
									</span>
									{t.uploadedFileUrl && (
										<a
											href={t.uploadedFileUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-[12px] text-[#c47420] font-medium hover:underline mr-3"
										>
											View
										</a>
									)}
									<a
										href={t.fileUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-[12px] text-warm-500 font-medium hover:underline"
									>
										Template
									</a>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</Card>
	);
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ activities, emailLogs }: { activities: ClientActivity[]; emailLogs: EmailLog[] }) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
			<Card>
				<CardHeader title="Activity timeline" />
				<div className="px-[22px] pb-5">
					<ActivityTimeline activities={activities} />
				</div>
			</Card>
			<Card>
				<CardHeader title="Email history" />
				<div className="px-[22px] pb-5">
					{emailLogs.length === 0 ? (
						<p className="text-sm text-warm-400">No emails sent yet.</p>
					) : (
						<div className="divide-y divide-black/[0.05]">
							{emailLogs.map((log) => (
								<div key={log.id} className="py-3">
									<div className="flex items-start gap-3">
										<Bell size={13} className="text-warm-400 mt-0.5 shrink-0" aria-hidden="true" />
										<div className="min-w-0 flex-1">
											<p className="text-[13px] text-warm-800 truncate">{log.subject}</p>
											<p className="text-[11.5px] text-warm-400 mt-0.5">
												{EMAIL_TRIGGER_LABELS[log.trigger] ?? log.trigger}
												{' · '}
												{new Date(log.sentAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
												{!!log.metadata?.error && (
													<span className="text-[#a8412e] ml-2">Failed: {String(log.metadata.error)}</span>
												)}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</Card>
		</div>
	);
}

// ─── Final Payment / Instalment Modal ─────────────────────────────────────────

type FinalPaymentModalProps = {
	client: Client;
	paymentSummary: {
		puppyPriceRands: number | null;
		shippingRands: number | null;
		totalPriceRands: number | null;
		alreadyPaid: number;
		balanceDue: number | null;
	} | null;
	finalPrice: string;
	setFinalPrice: (v: string) => void;
	instalmentMode: boolean;
	setInstalmentMode: (v: boolean) => void;
	instalmentCount: number;
	setInstalmentCount: (v: number) => void;
	customAmounts: boolean;
	setCustomAmounts: (v: boolean) => void;
	instalmentAmounts: string[];
	setInstalmentAmounts: React.Dispatch<React.SetStateAction<string[]>>;
	instalmentDueDates: string[];
	setInstalmentDueDates: React.Dispatch<React.SetStateAction<string[]>>;
	fullPaymentDueDate: string;
	setFullPaymentDueDate: (v: string) => void;
	finalError: string;
	setFinalError: (v: string) => void;
	requestingFinal: boolean;
	setRequestingFinal: (v: boolean) => void;
	onClose: () => void;
	onDone: () => void;
};

function FinalPaymentModal(props: FinalPaymentModalProps) {
	const {
		client, paymentSummary, finalPrice, setFinalPrice,
		instalmentMode, setInstalmentMode, instalmentCount, setInstalmentCount,
		customAmounts, setCustomAmounts, instalmentAmounts, setInstalmentAmounts,
		instalmentDueDates, setInstalmentDueDates, fullPaymentDueDate, setFullPaymentDueDate,
		finalError, setFinalError, requestingFinal, setRequestingFinal,
		onClose, onDone,
	} = props;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const litterGoHome: string | null = (client as any).litter?.goHomeDate ?? null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
				className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 id="modal-title" className="font-serif text-lg font-bold text-warm-900 mb-1">
					{instalmentMode ? 'Create instalment plan' : 'Request final payment'}
				</h2>
				<p className="text-sm text-warm-500 mb-4">
					{instalmentMode
						? 'Split the remaining balance into multiple payments. Each instalment gets its own payment link.'
						: 'Send the client a single payment link for the remaining balance.'}
				</p>

				{paymentSummary && paymentSummary.puppyPriceRands != null && (
					<div className="mb-4 p-3 bg-warm-50 rounded-lg text-sm space-y-1">
						<div className="flex justify-between text-warm-600">
							<span>Puppy price</span>
							<span>R{paymentSummary.puppyPriceRands.toLocaleString()}</span>
						</div>
						{(paymentSummary.shippingRands ?? 0) > 0 && (
							<div className="flex justify-between text-warm-600">
								<span>Shipping</span>
								<span>R{(paymentSummary.shippingRands ?? 0).toLocaleString()}</span>
							</div>
						)}
						<div className="flex justify-between font-medium text-warm-800 border-t border-warm-200 pt-1">
							<span>Total</span>
							<span>R{(paymentSummary.totalPriceRands ?? 0).toLocaleString()}</span>
						</div>
						<div className="flex justify-between text-warm-500">
							<span>Paid</span>
							<span>-R{paymentSummary.alreadyPaid.toLocaleString()}</span>
						</div>
						<div className="flex justify-between font-semibold text-warm-900 border-t border-warm-200 pt-1">
							<span>Balance due</span>
							<span>R{(paymentSummary.balanceDue ?? 0).toLocaleString()}</span>
						</div>
					</div>
				)}

				{(!paymentSummary || paymentSummary.puppyPriceRands == null) && !instalmentMode && (
					<>
						<label className="block text-sm font-medium text-warm-700 mb-1.5">Total puppy price (R)</label>
						<input
							type="number"
							min="1"
							value={finalPrice}
							onChange={(e) => setFinalPrice(e.target.value)}
							placeholder="e.g. 25000"
							className="w-full px-3 py-2.5 border border-warm-200 rounded-lg text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-300 mb-3"
						/>
					</>
				)}

				<div className="flex gap-2 mb-4">
					<button
						onClick={() => setInstalmentMode(false)}
						className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${!instalmentMode ? 'bg-warm-900 text-white border-warm-900' : 'bg-white text-warm-600 border-warm-200 hover:bg-warm-50'}`}
					>
						Full payment
					</button>
					<button
						onClick={() => {
							setInstalmentMode(true);
							setCustomAmounts(false);
							setInstalmentCount(3);
						}}
						className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${instalmentMode ? 'bg-warm-900 text-white border-warm-900' : 'bg-white text-warm-600 border-warm-200 hover:bg-warm-50'}`}
					>
						Instalments
					</button>
				</div>

				{!instalmentMode && (
					<div className="mb-4">
						<label className="block text-xs font-medium text-warm-700 mb-1.5">Due date (optional)</label>
						<input
							type="date"
							value={fullPaymentDueDate}
							onChange={(e) => setFullPaymentDueDate(e.target.value)}
							min={new Date().toISOString().slice(0, 10)}
							max={litterGoHome ?? undefined}
							className="w-full px-3 py-2.5 border border-warm-200 rounded-lg text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
						/>
						{litterGoHome && (
							<p className="mt-1 text-xs text-warm-400">
								Must be on or before go-home date ({new Date(litterGoHome + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })})
							</p>
						)}
					</div>
				)}

				{instalmentMode && (() => {
					const balance = paymentSummary?.balanceDue ?? (finalPrice ? Number(finalPrice) - (paymentSummary?.alreadyPaid ?? 0) : 0);
					if (balance <= 0) return <p className="text-sm text-warm-400 mb-3">No balance due.</p>;

					return (
						<div className="mb-4">
							<div className="flex items-center gap-3 mb-3">
								<label className="text-sm text-warm-700">Split into</label>
								<select
									value={customAmounts ? 'custom' : instalmentCount}
									onChange={(e) => {
										if (e.target.value === 'custom') {
											setCustomAmounts(true);
											setInstalmentAmounts(['', '']);
										} else {
											setCustomAmounts(false);
											setInstalmentCount(Number(e.target.value));
										}
									}}
									className="px-2.5 py-1.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
								>
									{[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
										<option key={n} value={n}>{n} equal parts</option>
									))}
									<option value="custom">Custom amounts</option>
								</select>
							</div>

							{!customAmounts ? (
								<div className="space-y-1.5 text-sm">
									{Array.from({ length: instalmentCount }, (_, i) => {
										const amount = i < instalmentCount - 1
											? Math.floor(balance / instalmentCount)
											: balance - Math.floor(balance / instalmentCount) * (instalmentCount - 1);
										return (
											<div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-warm-50 rounded-lg">
												<span className="text-warm-600 flex-shrink-0">Instalment {i + 1}</span>
												<span className="font-medium text-warm-900">R{amount.toLocaleString()}</span>
												<input
													type="date"
													value={instalmentDueDates[i] ?? ''}
													onChange={(e) => {
														const next = [...instalmentDueDates];
														while (next.length <= i) next.push('');
														next[i] = e.target.value;
														setInstalmentDueDates(next);
													}}
													min={new Date().toISOString().slice(0, 10)}
													max={litterGoHome ?? undefined}
													className="ml-auto w-32 px-2 py-1 border border-warm-200 rounded text-xs text-warm-700 focus:outline-none focus:ring-1 focus:ring-brand-300"
												/>
											</div>
										);
									})}
								</div>
							) : (
								<div className="space-y-2">
									{instalmentAmounts.map((amt, i) => (
										<div key={i} className="flex items-center gap-2">
											<span className="text-xs text-warm-500 w-6">{i + 1}.</span>
											<input
												type="number"
												min="1"
												value={amt}
												onChange={(e) => {
													const next = [...instalmentAmounts];
													next[i] = e.target.value;
													setInstalmentAmounts(next);
												}}
												placeholder="Amount (R)"
												className="flex-1 px-3 py-1.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
											/>
											<input
												type="date"
												value={instalmentDueDates[i] ?? ''}
												onChange={(e) => {
													const next = [...instalmentDueDates];
													while (next.length <= i) next.push('');
													next[i] = e.target.value;
													setInstalmentDueDates(next);
												}}
												min={new Date().toISOString().slice(0, 10)}
												max={litterGoHome ?? undefined}
												className="w-32 px-2 py-1.5 border border-warm-200 rounded-lg text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
											/>
											{instalmentAmounts.length > 2 && (
												<button
													onClick={() => {
														setInstalmentAmounts((a) => a.filter((_, j) => j !== i));
														setInstalmentDueDates((d) => d.filter((_, j) => j !== i));
													}}
													className="text-warm-400 hover:text-[#a8412e] text-xs"
												>Remove</button>
											)}
										</div>
									))}
									{instalmentAmounts.length < 12 && (
										<button
											onClick={() => {
												setInstalmentAmounts((a) => [...a, '']);
												setInstalmentDueDates((d) => [...d, '']);
											}}
											className="text-xs text-brand-600 hover:text-brand-700"
										>+ Add instalment</button>
									)}
									{(() => {
										const total = instalmentAmounts.reduce((s, v) => s + (Number(v) || 0), 0);
										const diff = balance - total;
										return (
											<p className={`text-xs mt-1 ${Math.abs(diff) <= 1 ? 'text-[#3f5a36]' : 'text-[#a35c17]'}`}>
												Total: R{total.toLocaleString()}
												{diff > 1 ? ` (R${diff.toLocaleString()} remaining)` : diff < -1 ? ` (R${Math.abs(diff).toLocaleString()} over)` : ''}
											</p>
										);
									})()}
								</div>
							)}
						</div>
					);
				})()}

				{finalError && <p role="alert" className="text-[#a8412e] text-sm mb-3">{finalError}</p>}

				<div className="flex gap-3 mt-2">
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2.5 border border-warm-200 text-warm-700 text-sm font-medium rounded-lg hover:bg-warm-50 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={async () => {
							setRequestingFinal(true);
							setFinalError('');
							try {
								if (instalmentMode) {
									const balance = paymentSummary?.balanceDue ?? (finalPrice ? Number(finalPrice) - (paymentSummary?.alreadyPaid ?? 0) : 0);
									let amounts: number[];
									if (customAmounts) {
										amounts = instalmentAmounts.map((v) => Number(v)).filter((v) => v > 0);
										if (amounts.length < 2) { setFinalError('At least 2 instalments required.'); setRequestingFinal(false); return; }
										const total = amounts.reduce((s, v) => s + v, 0);
										if (Math.abs(total - balance) > 1) { setFinalError('Amounts must add up to the balance due.'); setRequestingFinal(false); return; }
									} else {
										amounts = Array.from({ length: instalmentCount }, (_, i) =>
											i < instalmentCount - 1
												? Math.floor(balance / instalmentCount)
												: balance - Math.floor(balance / instalmentCount) * (instalmentCount - 1),
										);
									}
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									const { error: apiErr } = await (api.payments as any).final({ clientId: client.id }).instalments.post({
										amounts,
										dueDates: instalmentDueDates.map((d) => d || null),
										...(paymentSummary?.totalPriceRands == null && finalPrice ? { totalPriceRands: Number(finalPrice) } : {}),
									});
									if (apiErr) setFinalError('Failed to create instalment plan. Please try again.');
									else onDone();
								} else {
									const body: Record<string, unknown> = {};
									if (paymentSummary?.totalPriceRands == null) {
										if (!finalPrice || isNaN(Number(finalPrice)) || Number(finalPrice) <= 0) {
											setFinalError('Please enter a valid price.'); setRequestingFinal(false); return;
										}
										body.totalPriceRands = Number(finalPrice);
									}
									if (fullPaymentDueDate) body.dueDate = fullPaymentDueDate;
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									const { error: apiErr } = await (api.payments as any).final({ clientId: client.id }).post(body);
									if (apiErr) setFinalError('Failed to request payment. Please try again.');
									else onDone();
								}
							} catch {
								setFinalError('Failed to process request. Please try again.');
							}
							setRequestingFinal(false);
						}}
						disabled={requestingFinal}
						className="flex-1 px-4 py-2.5 bg-warm-900 hover:bg-warm-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
					>
						{requestingFinal ? 'Sending…' : instalmentMode ? 'Create instalment plan' : 'Send payment request'}
					</button>
				</div>
			</div>
		</div>
	);
}
