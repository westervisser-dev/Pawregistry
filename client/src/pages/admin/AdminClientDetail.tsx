import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingPage, Card, PageHeader, StageBadge } from '@/components/ui';
import type { Client, ClientStage, ClientActivity, EmailLog, Document, DocumentTemplateWithChecklist, Payment } from '@paw-registry/shared';
import { DeleteModal, DepositStatusBadge } from './_shared';

const EMAIL_TRIGGER_LABELS: Record<string, string> = {
	stage_enquired: 'Application Received',
	stage_approved: 'Application Approved',
	stage_waitlisted: 'Added to Waitlist',
	stage_match_requested: 'Puppy Selection',
	stage_matched: 'Puppy Selected',
	stage_matched_paid: 'Payment Confirmed',
};

// ─── Application view helpers ─────────────────────────────────────────────────

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
			? <span className="text-green-600 font-medium">Yes</span>
			: <span className="text-warm-400">No</span>;
		if (Array.isArray(value)) return value.length ? String(value.join(', ')) : <span className="text-warm-300">—</span>;
		const str = String(value);
		if (str === 'true') return <span className="text-green-600 font-medium">Yes</span>;
		if (str === 'false') return <span className="text-warm-400">No</span>;
		return <span className="text-warm-800">{str}</span>;
	};
	return (
		<div className="py-2.5 border-b border-black/[0.05] last:border-0 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 items-start">
			<dt className="text-xs text-warm-400 pt-0.5">{label}</dt>
			<dd className="text-sm">{display()}</dd>
		</div>
	);
}

function AppSection({ title, fields }: { title: string; fields: { label: string; value: unknown }[] }) {
	const visible = fields.filter(({ value }) => value !== null && value !== undefined && value !== '');
	if (visible.length === 0) return null;
	return (
		<div>
			<p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">{title}</p>
			<dl className="divide-y divide-black/[0.05]">
				{visible.map(({ label, value }) => (
					<AppField key={label} label={label} value={value} />
				))}
			</dl>
		</div>
	);
}

// ─── Activity timeline helpers ─────────────────────────────────────────────────

const ACTIVITY_CONFIG: Record<string, { icon: string; label: string; colour: string }> = {
	application_submitted: { icon: '📋', label: 'Application Submitted', colour: 'text-blue-600' },
	stage_changed: { icon: '🔄', label: 'Stage Changed', colour: 'text-purple-600' },
	deposit_changed: { icon: '💰', label: 'Deposit Updated', colour: 'text-green-600' },
	preferences_updated: { icon: '✏️', label: 'Preferences Updated', colour: 'text-amber-600' },
	notes_updated: { icon: '📝', label: 'Notes Updated', colour: 'text-warm-500' },
	document_uploaded: { icon: '📄', label: 'Document Uploaded', colour: 'text-blue-500' },
	document_signed: { icon: '✅', label: 'Document Signed', colour: 'text-green-500' },
};

const ACTOR_LABELS: Record<string, string> = {
	client: 'Client',
	admin: 'Admin',
	system: 'System',
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
		<div className="relative">
			{/* Vertical line */}
			<div className="absolute left-3.5 top-2 bottom-2 w-px bg-warm-200" />

			<div className="space-y-4">
				{activities.map((activity) => {
					const config = ACTIVITY_CONFIG[activity.type] ?? { icon: '•', label: activity.type, colour: 'text-warm-500' };
					const meta = activity.metadata as Record<string, unknown>;

					return (
						<div key={activity.id} className="relative pl-9">
							{/* Dot */}
							<span className="absolute left-1.5 top-0.5 flex h-4 w-4 items-center justify-center text-xs">
								{config.icon}
							</span>

							<div>
								<p className="text-sm text-warm-800">
									<span className={`font-medium ${config.colour}`}>{config.label}</span>
									{activity.type === 'stage_changed' && !!meta.from && !!meta.to && (
										<span className="text-warm-400 font-normal"> {String(meta.from)} → {String(meta.to)}</span>
									)}
									{activity.type === 'deposit_changed' && !!meta.from && !!meta.to && (
										<span className="text-warm-400 font-normal"> {String(meta.from)} → {String(meta.to)}</span>
									)}
									{activity.type === 'document_uploaded' && !!meta.label && (
										<span className="text-warm-400 font-normal"> — {String(meta.label)}</span>
									)}
									{activity.type === 'document_signed' && !!meta.label && (
										<span className="text-warm-400 font-normal"> — {String(meta.label)}</span>
									)}
								</p>
								{activity.type === 'preferences_updated' && !!meta.changes && (
									<PreferenceChanges changes={meta.changes as Record<string, { from: unknown; to: unknown }>} />
								)}
								<p className="text-xs text-warm-400 mt-0.5">
									{ACTOR_LABELS[activity.actor] ?? activity.actor}
									{' · '}
									{new Date(activity.createdAt).toLocaleString()}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ─── Client detail ────────────────────────────────────────────────────────────

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
	const [documents, setDocuments] = useState<Document[]>([]);
	const [templates, setTemplates] = useState<DocumentTemplateWithChecklist[]>([]);
	const [stagingTo, setStagingTo] = useState<string | null>(null);
	const [signing, setSigning] = useState<string | null>(null);
	const [removingDoc, setRemovingDoc] = useState<string | null>(null);
	const [clientLitterInterests, setClientLitterInterests] = useState<Array<{
		id: string; clientId: string; litterId: string; createdAt: string;
		litter: { id: string; name: string; breed: string | null; status: string; expectedDate: string | null };
	}>>([]);
	const [payments, setPayments] = useState<Payment[]>([]);
	const [showFinalPaymentModal, setShowFinalPaymentModal] = useState(false);
	const [finalPrice, setFinalPrice] = useState('');
	const [requestingFinal, setRequestingFinal] = useState(false);
	const [finalError, setFinalError] = useState('');
	const loadDocuments = () => {
		if (!id) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.documents as any).admin({ clientId: id }).get().then(({ data }: { data: Document[] | null }) => {
			if (data) setDocuments(data);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.templates as any).admin({ clientId: id }).checklist.get().then(({ data }: { data: DocumentTemplateWithChecklist[] | null }) => {
			if (data) setTemplates(data);
		});
	};

	const ACTIVE_QUEUE_STAGES = ['waitlisted', 'match_requested', 'matched'];

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
		loadDocuments();
	};

	useEffect(() => { load(); }, [id]);

	usePageTitle(client ? `${client.firstName} ${client.lastName}` : undefined);

	// Scroll to anchored section once data is loaded (supports deep links from the dashboard)
	useEffect(() => {
		if (!loading && window.location.hash) {
			const el = document.querySelector(window.location.hash);
			if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}, [loading]);

	const updateStage = async (stage: string) => {
		if (!id) return;
		setStagingTo(stage);
		setClient(prev => prev ? { ...prev, stage: stage as Client['stage'] } : prev);
		await api.clients.admin({ id }).patch({ stage: stage as Client['stage'] });
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

	const removeDocument = async (docId: string) => {
		setRemovingDoc(docId);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (api.documents as any).admin({ id: docId }).delete();
		setRemovingDoc(null);
		loadDocuments();
	};

	const signDocument = async (docId: string) => {
		setSigning(docId);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (api.documents as any).admin({ id: docId }).sign.patch();
		setSigning(null);
		loadDocuments();
		load();
	};



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

	return (
		<div className="p-4 md:p-8 max-w-4xl">
			<Link to="/admin/clients" className="text-sm text-warm-400 hover:text-warm-600 mb-6 inline-block">← Clients</Link>

			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="font-serif text-2xl font-bold text-warm-900">
						{client.firstName} {client.lastName}
					</h1>
					<p className="text-warm-500 text-sm">{client.email}</p>
					{client.phone && <p className="text-warm-400 text-sm">{client.phone}</p>}
					{(client.city || client.country) && (
						<p className="text-warm-400 text-sm">{[client.city, client.country].filter(Boolean).join(', ')}</p>
					)}
					{!!a.preferredBreedSize && (() => {
						const p = formatBreedSize(a.preferredBreedSize as string);
						return p ? (
							<div className="mt-3 flex items-center gap-2 flex-wrap">
								<span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-xs font-semibold text-brand-700">
									🐾 {p.breed}{p.size ? ` · ${p.size}` : ''}
								</span>
								{!!a.preferredSex && a.preferredSex !== 'no_preference' && (
									<span className="inline-flex items-center px-2.5 py-1 bg-warm-100 rounded-full text-xs font-medium text-warm-600 capitalize">
										{String(a.preferredSex)}
									</span>
								)}
							</div>
						) : null;
					})()}
				</div>
				<div id="deposit" className="flex flex-col items-end gap-2 scroll-mt-6">
					<StageBadge stage={client.stage} />
					<DepositStatusBadge client={client} />
				</div>
			</div>

			{/* Waitlist position — shown for all active queue stages until matched_paid */}
			{ACTIVE_QUEUE_STAGES.includes(client.stage) && waitlistPosition?.position != null && (
				<div className="mb-6 flex items-center gap-5 rounded-xl border border-amber-200/80 bg-amber-50 px-5 py-4">
					<div className="flex items-baseline gap-1.5 shrink-0">
						<span className="font-serif text-[32px] leading-none font-bold text-amber-700">
							#{waitlistPosition.position}
						</span>
						{waitlistPosition.total != null && (
							<span className="text-[12px] text-amber-500 font-medium">
								of {waitlistPosition.total}
							</span>
						)}
					</div>
					<div className="h-8 w-px bg-amber-200 shrink-0" />
					<div>
						<p className="text-[13px] font-semibold text-amber-800">Waiting list position</p>
						<p className="text-[12px] text-amber-600/80 mt-0.5">
							{waitlistPosition.position === 1 ? 'First in line' : `${waitlistPosition.position === 2 ? 'Second' : waitlistPosition.position === 3 ? 'Third' : `#${waitlistPosition.position}`} in line`} · ordered by deposit status then priority
						</p>
					</div>
				</div>
			)}

			{/* Stage management */}
			<Card id="stage" className="p-5 mb-6 scroll-mt-6">
				<h3 className="font-medium text-warm-900 mb-3">Move Stage</h3>
				<div className="flex flex-wrap gap-2">
					{([
						['enquired', 'Enquired'],
						['approved', 'Approved'],
						['rejected', 'Rejected'],
						['waitlisted', 'Waitlisted'],
						['match_requested', 'Match Requested'],
						['matched', 'Matched'],
						['matched_paid', 'Matched & Paid'],
					] as [ClientStage, string][]).map(([s, label]) => (
						<button
							key={s}
							onClick={() => updateStage(s)}
							disabled={!!stagingTo}
							className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 disabled:opacity-60 ${
								client.stage === s
									? 'bg-warm-900 text-white'
									: 'bg-warm-100 text-warm-600 hover:bg-warm-200'
							}`}
						>
							{stagingTo === s && (
								<svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
								</svg>
							)}
							{label}
						</button>
					))}
				</div>
			</Card>

			{/* Litter Interest */}
			{clientLitterInterests.length > 0 && (
				<Card className="p-5 mb-6">
					<h3 className="font-medium text-warm-900 mb-3">Litter Interest</h3>
					<div className="divide-y divide-black/[0.05]">
						{clientLitterInterests.map((li) => (
							<div key={li.id} className="py-2.5 flex items-center gap-3">
								<div className="flex-1 min-w-0">
									<Link to={`/admin/litters/${li.litterId}`} className="text-sm font-medium text-warm-900 hover:text-brand-600 truncate block">
										{li.litter.name}
									</Link>
									<div className="flex items-center gap-2 mt-0.5">
										{li.litter.breed && <span className="text-xs text-warm-400">{li.litter.breed}</span>}
										<span className="text-xs text-warm-400 capitalize">{li.litter.status}</span>
										{li.litter.expectedDate && (
											<span className="text-xs text-warm-400">· {new Date(li.litter.expectedDate).toLocaleDateString()}</span>
										)}
									</div>
								</div>
								<span className="text-xs text-warm-400 flex-shrink-0">
									{new Date(li.createdAt).toLocaleDateString()}
								</span>
							</div>
						))}
					</div>
				</Card>
			)}

			{/* Application */}
			<Card className="p-6 mb-6">
				<h3 className="font-medium text-warm-900 mb-6">Application</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<AppSection title="Personal Details" fields={[
						{ label: 'Primary caregiver', value: a.primaryCaregiver },
					]} />
					<AppSection title="Home & Life" fields={[
						{ label: 'Home ownership', value: a.residenceOwnership },
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
						{ label: 'All family members agree', value: a.allFamilyMembersAgree },
						{ label: 'Dog allergies in household', value: a.allergiesToDogs },
						{ label: 'Has children', value: a.hasChildren },
						{ label: "Children's ages & genders", value: a.childrenGenderAges },
						{ label: 'Has other pets', value: a.hasOtherPets },
						{ label: 'Other pets', value: a.otherPetsDescription },
					]} />
					<AppSection title="Experience" fields={[
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
					<div>
						<p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">Puppy Preferences</p>
						<dl className="divide-y divide-black/[0.05]">
							{!!a.puppyPurpose && <AppField label="Purpose" value={a.puppyPurpose} />}
							{!!a.readyTimeframe && <AppField label="Ready timeframe" value={readyLabels[a.readyTimeframe as string] ?? a.readyTimeframe} />}
							{!!a.budget && <AppField label="Budget" value={budgetLabels[a.budget as string] ?? a.budget} />}
							{!!a.preferredBreedSize && (
								<div className="py-2.5 border-b border-black/[0.05] grid grid-cols-2 gap-4 items-start">
									<dt className="text-xs text-warm-400 pt-0.5">First choice</dt>
									<dd className="text-sm"><BreedSizeDisplay raw={a.preferredBreedSize as string} /></dd>
								</div>
							)}
							{!!a.secondChoiceBreedSize && (
								<div className="py-2.5 border-b border-black/[0.05] grid grid-cols-2 gap-4 items-start">
									<dt className="text-xs text-warm-400 pt-0.5">Second choice</dt>
									<dd className="text-sm"><BreedSizeDisplay raw={a.secondChoiceBreedSize as string} /></dd>
								</div>
							)}
							<AppField label="Open to other breed/size" value={a.considerOtherBreedSize} />
							{!!a.preferredSex && (
								<div className="py-2.5 border-b border-black/[0.05] grid grid-cols-2 gap-4 items-start">
									<dt className="text-xs text-warm-400 pt-0.5">Preferred sex</dt>
									<dd className="text-sm text-warm-800">
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
				</div>
			</Card>

			{/* Documents */}
			<Card id="documents" className="p-5 mb-6 scroll-mt-6">
				<h3 className="font-medium text-warm-900 mb-4">Documents</h3>

				{/* Template checklist */}
				{templates.length > 0 && (
					<div className="mb-6">
						<p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2">
							Client-submitted Forms ({templates.filter(t => t.checkedAt).length}/{templates.length})
						</p>
						<div className="divide-y divide-black/[0.05]">
							{templates.map(t => (
								<div key={t.id} className="py-2.5 flex items-center gap-3">
									<span className="text-base shrink-0" aria-hidden="true">
										{t.checkedAt ? '✅' : '⬜'}
									</span>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-warm-800 truncate">{t.name}</p>
										{t.category && (
											<p className="text-xs text-warm-400">{t.category}</p>
										)}
									</div>
									<div className="flex items-center gap-2 shrink-0">
										{t.checkedAt && (
											<span className="text-xs text-warm-400">
												{new Date(t.checkedAt).toLocaleDateString()}
											</span>
										)}
										{t.uploadedFileUrl ? (
											<a
												href={t.uploadedFileUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="px-2.5 py-1 rounded text-xs font-medium bg-warm-100 text-warm-700 hover:bg-warm-200 transition-colors"
											>
												View →
											</a>
										) : (
											<span className="text-xs text-warm-300 italic">Not submitted</span>
										)}
										<a
											href={t.fileUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="px-2.5 py-1 rounded text-xs font-medium bg-warm-50 text-warm-500 hover:bg-warm-100 transition-colors"
										>
											Template
										</a>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Admin-uploaded documents */}
				<div className="mb-5">
					<p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2">Admin Documents</p>
					{documents.length === 0 ? (
						<p className="text-sm text-warm-400 mb-3">No documents uploaded yet.</p>
					) : (
						<div className="divide-y divide-black/[0.05] mb-3">
							{documents.map(doc => (
								<div key={doc.id} className="py-2.5 flex items-center gap-3">
									<span className="text-base shrink-0" aria-hidden="true">📄</span>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-warm-800 truncate">{doc.label}</p>
										<p className="text-xs text-warm-400">
											{doc.type} · {new Date(doc.createdAt).toLocaleDateString()}
											{doc.signedAt && (
												<span className="ml-2 inline-flex items-center gap-0.5 text-green-600">
													✓ Signed {new Date(doc.signedAt).toLocaleDateString()}
												</span>
											)}
										</p>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<a
											href={doc.fileUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="px-2.5 py-1 rounded text-xs font-medium bg-warm-100 text-warm-700 hover:bg-warm-200 transition-colors"
										>
											View →
										</a>
										{!doc.signedAt && (
											<button
												onClick={() => signDocument(doc.id)}
												disabled={signing === doc.id}
												className="px-2.5 py-1 rounded text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
											>
												{signing === doc.id ? 'Signing…' : 'Mark signed'}
											</button>
										)}
										<button
											onClick={() => removeDocument(doc.id)}
											disabled={removingDoc === doc.id}
											className="px-2.5 py-1 rounded text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50 transition-colors"
										>
											{removingDoc === doc.id ? 'Removing…' : 'Remove'}
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</Card>

			{/* Portal access */}
			{/* Payments */}
			<Card id="payments" className="p-5 mb-6 scroll-mt-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-medium text-warm-900">Payments</h3>
					{client.stage === 'matched' && (
						<button
							onClick={() => { setFinalPrice(''); setFinalError(''); setShowFinalPaymentModal(true); }}
							className="px-3 py-1.5 bg-warm-900 hover:bg-warm-700 text-white text-xs font-medium rounded-lg transition-colors"
						>
							Request Final Payment
						</button>
					)}
				</div>

				{payments.length === 0 ? (
					<p className="text-sm text-warm-400">No payment records yet.</p>
				) : (
					<div className="divide-y divide-black/[0.05]">
						{payments.map((p) => {
							const typeLabel = p.type === 'deposit' ? 'Deposit' : p.type === 'booking' ? 'Booking Deposit' : 'Final Payment';
							const statusStyles: Record<Payment['status'], string> = {
								pending: 'bg-amber-100 text-amber-700',
								complete: 'bg-green-100 text-green-700',
								failed: 'bg-red-100 text-red-700',
								cancelled: 'bg-warm-100 text-warm-500',
							};
							const hoursLeft = p.expiresAt
								? Math.max(0, Math.floor((new Date(p.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
								: null;
							return (
								<div key={p.id} className="py-3 flex items-center justify-between gap-4">
									<div>
										<div className="flex items-center gap-2">
											<p className="text-sm font-medium text-warm-900">
												R{p.amountRands.toLocaleString()} — {typeLabel}
											</p>
											<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[p.status]}`}>
												{p.status === 'pending' ? 'Awaiting' : p.status === 'complete' ? 'Paid' : p.status === 'failed' ? 'Failed' : 'Cancelled'}
											</span>
										</div>
										<p className="text-xs text-warm-400 mt-0.5">
											{p.paidAt
												? `Paid ${new Date(p.paidAt).toLocaleDateString()}`
												: `Created ${new Date(p.createdAt).toLocaleDateString()}`}
											{p.status === 'pending' && hoursLeft !== null && (
												<span className="text-amber-600 ml-2">{hoursLeft}h remaining</span>
											)}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</Card>

			{/* Final payment modal */}
			{showFinalPaymentModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4"
					style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
					onClick={() => setShowFinalPaymentModal(false)}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="modal-title"
						className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 id="modal-title" className="font-serif text-lg font-bold text-warm-900 mb-1">Request Final Payment</h2>
						<p className="text-sm text-warm-500 mb-5">Enter the total puppy price. The system will subtract any deposits already paid and send the client a payment link for the balance.</p>

						{payments.filter(p => p.status === 'complete').length > 0 && (
							<div className="mb-4 p-3 bg-warm-50 rounded-lg text-sm text-warm-600">
								Already paid: <span className="font-semibold text-warm-900">
									R{payments.filter(p => p.status === 'complete').reduce((sum, p) => sum + p.amountRands, 0).toLocaleString()}
								</span>
							</div>
						)}

						<label className="block text-sm font-medium text-warm-700 mb-1.5">
							Total puppy price (R)
						</label>
						<input
							type="number"
							min="1"
							value={finalPrice}
							onChange={(e) => setFinalPrice(e.target.value)}
							placeholder="e.g. 25000"
							className="w-full px-3 py-2.5 border border-warm-200 rounded-lg text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-300 mb-1"
						/>
						{finalPrice && !isNaN(Number(finalPrice)) && (
							<p className="text-xs text-warm-500 mb-4">
								Balance due: <span className="font-semibold text-warm-900">
									R{Math.max(0, Number(finalPrice) - payments.filter(p => p.status === 'complete').reduce((sum, p) => sum + p.amountRands, 0)).toLocaleString()}
								</span>
							</p>
						)}

						{finalError && <p role="alert" className="text-red-600 text-sm mb-3">{finalError}</p>}

						<div className="flex gap-3 mt-2">
							<button
								onClick={() => setShowFinalPaymentModal(false)}
								className="flex-1 px-4 py-2.5 border border-warm-200 text-warm-700 text-sm font-medium rounded-lg hover:bg-warm-50 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={async () => {
									if (!finalPrice || isNaN(Number(finalPrice)) || Number(finalPrice) <= 0) {
										setFinalError('Please enter a valid price.');
										return;
									}
									setRequestingFinal(true);
									setFinalError('');
									try {
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										const { error: apiErr } = await (api.payments as any).final({ clientId: client!.id }).post({
											totalPriceRands: Number(finalPrice),
										});
										if (apiErr) { setFinalError('Failed to request payment. Please try again.'); }
										else { setShowFinalPaymentModal(false); load(); }
									} catch {
										setFinalError('Failed to request payment. Please try again.');
									}
									setRequestingFinal(false);
								}}
								disabled={requestingFinal}
								className="flex-1 px-4 py-2.5 bg-warm-900 hover:bg-warm-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
							>
								{requestingFinal ? 'Sending…' : 'Send payment request'}
							</button>
						</div>
					</div>
				</div>
			)}

			<Card className="p-5 mb-6">
				<h3 className="font-medium text-warm-900 mb-1">Portal Access</h3>
				<p className="text-sm text-warm-400 mb-4">Open the portal as this client.</p>
				<button
					onClick={openAsClient}
					disabled={impersonating}
					className="px-4 py-2 bg-warm-900 text-white text-sm font-medium rounded-lg hover:bg-warm-700 disabled:opacity-50 transition-colors"
				>
					{impersonating ? 'Opening…' : 'Open portal as client →'}
				</button>
			</Card>

			{/* Email history */}
			<Card className="p-5 mb-6">
				<h3 className="font-medium text-warm-900 mb-3">Email History</h3>
				{emailLogs.length === 0 ? (
					<p className="text-sm text-warm-400">No emails sent yet.</p>
				) : (
					<div className="divide-y divide-black/[0.05]">
						{emailLogs.map(log => (
							<div key={log.id} className="py-2.5">
								<p className="text-sm text-warm-800">{log.subject}</p>
								<p className="text-xs text-warm-400 mt-0.5">
									{EMAIL_TRIGGER_LABELS[log.trigger] ?? log.trigger}
									{' · '}
									{new Date(log.sentAt).toLocaleString()}
									{!!log.metadata?.error && (
										<span className="text-red-500 ml-2">Failed: {String(log.metadata.error)}</span>
									)}
								</p>
							</div>
						))}
					</div>
				)}
			</Card>

			{/* Activity timeline */}
			<Card className="p-5 mb-6">
				<h3 className="font-medium text-warm-900 mb-3">Activity Timeline</h3>
				<ActivityTimeline activities={activities} />
			</Card>

			<button
				onClick={() => setDeleteOpen(true)}
				className="inline-flex items-center gap-2 mt-8 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 hover:border-red-300 transition-colors"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
				Delete client
			</button>
			<DeleteModal
				open={deleteOpen}
				entityLabel={`${client.firstName} ${client.lastName}`}
				onClose={() => setDeleteOpen(false)}
				onConfirm={deleteClient}
				deleting={deleting}
				blockingRecords={null}
			/>
		</div>
	);
}
