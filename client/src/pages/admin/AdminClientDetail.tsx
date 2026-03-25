import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, StageBadge } from '@/components/ui';
import type { Client, ClientStage, EmailLog } from '@paw-registry/shared';
import { DeleteModal } from './_shared';

const EMAIL_TRIGGER_LABELS: Record<string, string> = {
	stage_enquired: 'Application Received',
	stage_approved: 'Application Approved',
	stage_waitlisted: 'Added to Waitlist',
	stage_placed: 'Litter Matched',
	stage_match_requested: 'Puppy Selection',
	stage_matched: 'Puppy Reserved',
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
	if (!parsed) return <span className="text-stone-300">—</span>;
	return (
		<span className="text-stone-800">
			<span className="font-medium">{parsed.breed}</span>
			{parsed.size && <span className="text-stone-400"> · {parsed.size}</span>}
		</span>
	);
}

function AppField({ label, value }: { label: string; value: unknown }) {
	const display = () => {
		if (value === null || value === undefined || value === '') return <span className="text-stone-300">—</span>;
		if (typeof value === 'boolean') return value
			? <span className="text-green-600 font-medium">Yes</span>
			: <span className="text-stone-400">No</span>;
		if (Array.isArray(value)) return value.length ? String(value.join(', ')) : <span className="text-stone-300">—</span>;
		const str = String(value);
		if (str === 'true') return <span className="text-green-600 font-medium">Yes</span>;
		if (str === 'false') return <span className="text-stone-400">No</span>;
		return <span className="text-stone-800">{str}</span>;
	};
	return (
		<div className="py-2.5 border-b border-stone-100 last:border-0 grid grid-cols-2 gap-4 items-start">
			<dt className="text-xs text-stone-400 pt-0.5">{label}</dt>
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
			<dl className="divide-y divide-stone-100">
				{visible.map(({ label, value }) => (
					<AppField key={label} label={label} value={value} />
				))}
			</dl>
		</div>
	);
}

// ─── Client detail ────────────────────────────────────────────────────────────

export function AdminClientDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [client, setClient] = useState<Client | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [portalAction, setPortalAction] = useState<'impersonate' | 'invite' | null>(null);
	const [portalMessage, setPortalMessage] = useState('');
	const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

	const load = () => {
		if (!id) return;
		api.clients.admin({ id }).get().then(({ data }) => {
			if (data) setClient(data as Client);
			setLoading(false);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.email as any).logs.get({ query: { clientId: id } }).then(({ data }: { data: EmailLog[] | null }) => {
			if (data) setEmailLogs(data);
		});
	};

	useEffect(() => { load(); }, [id]);

	useEffect(() => {
		if (client) {
			document.title = `${client.firstName} ${client.lastName} — Paw Registry Admin`;
			return () => { document.title = 'Paw Registry'; };
		}
	}, [client]);

	const updateStage = async (stage: string) => {
		if (!id) return;
		await api.clients.admin({ id }).patch({ stage: stage as Client['stage'] });
		load();
	};

	const openAsClient = async () => {
		if (!id) return;
		setPortalAction('impersonate');
		setPortalMessage('');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data, error } = await (api.clients.admin({ id }) as any)['impersonate'].post();
		setPortalAction(null);
		if (error || !data?.url) {
			setPortalMessage('Failed to generate portal link.');
			return;
		}
		window.open(data.url, '_blank');
	};

	const sendInvite = async () => {
		if (!id) return;
		setPortalAction('invite');
		setPortalMessage('');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error } = await (api.clients.admin({ id }) as any)['send-invite'].post();
		setPortalAction(null);
		if (error) {
			setPortalMessage('Failed to send invite.');
			return;
		}
		setPortalMessage(`Invite sent to ${client?.email}.`);
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

	if (loading) return <LoadingPage />;
	if (!client) return <div className="p-8 text-stone-500">Client not found.</div>;

	const a = client.applicationData as unknown as Record<string, unknown>;

	const readyLabels: Record<string, string> = {
		asap: 'As soon as possible',
		'6_months': 'In about 6 months',
		'1_year': 'In about a year',
	};

	return (
		<div className="p-8 max-w-4xl">
			<Link to="/admin/clients" className="text-sm text-stone-400 hover:text-stone-600 mb-6 inline-block">← Clients</Link>

			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="font-serif text-2xl font-bold text-stone-900">
						{client.firstName} {client.lastName}
					</h1>
					<p className="text-stone-500 text-sm">{client.email}</p>
					{client.phone && <p className="text-stone-400 text-sm">{client.phone}</p>}
					{(client.city || client.country) && (
						<p className="text-stone-400 text-sm">{[client.city, client.country].filter(Boolean).join(', ')}</p>
					)}
					{!!a.preferredBreedSize && (() => {
						const p = formatBreedSize(a.preferredBreedSize as string);
						return p ? (
							<div className="mt-3 flex items-center gap-2 flex-wrap">
								<span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-xs font-semibold text-brand-700">
									🐾 {p.breed}{p.size ? ` · ${p.size}` : ''}
								</span>
								{!!a.preferredSex && a.preferredSex !== 'no_preference' && (
									<span className="inline-flex items-center px-2.5 py-1 bg-stone-100 rounded-full text-xs font-medium text-stone-600 capitalize">
										{String(a.preferredSex)}
									</span>
								)}
							</div>
						) : null;
					})()}
				</div>
				<div className="flex flex-col items-end gap-2">
					<StageBadge stage={client.stage} />
					{client.depositStatus === 'paid' ? (
						<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Deposit · Paid</span>
					) : client.depositStatus === 'pending' ? (
						<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Deposit · Pending</span>
					) : (
						<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-500">No Deposit</span>
					)}
				</div>
			</div>

			{/* Stage management */}
			<Card className="p-5 mb-6">
				<h3 className="font-medium text-stone-900 mb-3">Move Stage</h3>
				<div className="flex flex-wrap gap-2">
					{([
						['enquired', 'Enquired'],
						['approved', 'Approved'],
						['rejected', 'Rejected'],
						['waitlisted', 'Waitlisted'],
						['placed', 'Placed'],
						['match_requested', 'Match Requested'],
						['matched', 'Matched'],
						['matched_paid', 'Matched & Paid'],
					] as [ClientStage, string][]).map(([s, label]) => (
						<button
							key={s}
							onClick={() => updateStage(s)}
							className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
								client.stage === s
									? 'bg-stone-900 text-white'
									: 'bg-stone-100 text-stone-600 hover:bg-stone-200'
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</Card>

			{/* Application */}
			<Card className="p-6 mb-6">
				<h3 className="font-medium text-stone-900 mb-6">Application</h3>
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
						<dl className="divide-y divide-stone-100">
							{!!a.puppyPurpose && <AppField label="Purpose" value={a.puppyPurpose} />}
							{!!a.readyTimeframe && <AppField label="Ready timeframe" value={readyLabels[a.readyTimeframe as string] ?? a.readyTimeframe} />}
							{!!a.preferredBreedSize && (
								<div className="py-2.5 border-b border-stone-100 grid grid-cols-2 gap-4 items-start">
									<dt className="text-xs text-stone-400 pt-0.5">First choice</dt>
									<dd className="text-sm"><BreedSizeDisplay raw={a.preferredBreedSize as string} /></dd>
								</div>
							)}
							{!!a.secondChoiceBreedSize && (
								<div className="py-2.5 border-b border-stone-100 grid grid-cols-2 gap-4 items-start">
									<dt className="text-xs text-stone-400 pt-0.5">Second choice</dt>
									<dd className="text-sm"><BreedSizeDisplay raw={a.secondChoiceBreedSize as string} /></dd>
								</div>
							)}
							<AppField label="Open to other breed/size" value={a.considerOtherBreedSize} />
							{!!a.preferredSex && (
								<div className="py-2.5 border-b border-stone-100 grid grid-cols-2 gap-4 items-start">
									<dt className="text-xs text-stone-400 pt-0.5">Preferred sex</dt>
									<dd className="text-sm text-stone-800">
										{a.preferredSex === 'no_preference' ? 'No preference' : <span className="capitalize">{String(a.preferredSex)}</span>}
									</dd>
								</div>
							)}
							<AppField label="Open to opposite sex" value={a.considerOppositeSex} />
							{!!a.preferredColour && <AppField label="Preferred colour" value={a.preferredColour} />}
							<AppField label="Open to other colour" value={a.considerOtherColour} />
							<AppField label="Would consider rehome" value={a.considerRehome} />
							<AppField label="Agreed to contract" value={a.agreedToContract} />
							<div className="py-2.5 border-b border-stone-100 last:border-0 grid grid-cols-2 gap-4 items-start">
								<dt className="text-xs text-stone-400 pt-0.5">Deposit intent</dt>
								<dd className="text-sm">
									{client.depositStatus === 'paid' ? (
										<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>
									) : client.depositStatus === 'pending' ? (
										<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Yes — pending payment</span>
									) : (
										<span className="text-stone-400">Not interested</span>
									)}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</Card>

			{/* Portal access */}
			<Card className="p-5 mb-6">
				<h3 className="font-medium text-stone-900 mb-1">Portal Access</h3>
				<p className="text-sm text-stone-400 mb-4">Open the portal as this client, or send them a login link by email.</p>
				<div className="flex flex-wrap items-center gap-3">
					<button
						onClick={openAsClient}
						disabled={!!portalAction}
						className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
					>
						{portalAction === 'impersonate' ? 'Opening…' : 'Open portal as client →'}
					</button>
					<button
						onClick={sendInvite}
						disabled={!!portalAction}
						className="px-4 py-2 border border-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-50 disabled:opacity-50 transition-colors"
					>
						{portalAction === 'invite' ? 'Sending…' : 'Send portal invite'}
					</button>
					{portalMessage && (
						<p role="status" className="text-sm text-stone-500">{portalMessage}</p>
					)}
				</div>
			</Card>

			{/* Email history */}
			<Card className="p-5 mb-6">
				<h3 className="font-medium text-stone-900 mb-3">Email History</h3>
				{emailLogs.length === 0 ? (
					<p className="text-sm text-stone-400">No emails sent yet.</p>
				) : (
					<div className="divide-y divide-stone-100">
						{emailLogs.map(log => (
							<div key={log.id} className="py-2.5">
								<p className="text-sm text-stone-800">{log.subject}</p>
								<p className="text-xs text-stone-400 mt-0.5">
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
