import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Card, PageHeader } from '@/components/ui';
import type { EmailTemplate } from '@paw-registry/shared';
import { usePageTitle } from '@/hooks/usePageTitle';

// ─── Client email metadata ─────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
	stage_enquired: 'Application Received',
	stage_approved: 'Application Approved',
	stage_waitlisted: 'Added to Waitlist',
	stage_puppy_reserved: 'Puppy Reserved',
	stage_puppy_booked: 'Puppy Booked',
	stage_puppy_fully_paid: 'Puppy Booked & Paid',
	docs_received: 'Documents Uploaded',
	payment_confirmed: 'Payment Confirmed',
	puppy_booked: 'Puppy Booked (Payment)',
	puppy_booking_requested: 'Booking Window Opened',
	puppy_booking_expired: 'Booking Window Expired',
	final_payment_requested: 'Final Payment Requested',
	reservation_cancelled: 'Reservation Cancelled',
	litter_notified: 'Litter Notification',
};

const TRIGGER_VARIABLES: Record<string, string[]> = {
	stage_enquired: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
	stage_approved: ['{{first_name}}', '{{full_name}}', '{{documents_link}}', '{{portal_link}}'],
	stage_waitlisted: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
	stage_puppy_reserved: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
	stage_puppy_booked: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
	stage_puppy_fully_paid: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
	docs_received: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
	payment_confirmed: ['{{first_name}}', '{{full_name}}', '{{amount}}', '{{payment_type}}', '{{payments_link}}'],
	puppy_booked: ['{{first_name}}', '{{full_name}}', '{{puppy_name}}', '{{amount}}', '{{portal_link}}'],
	puppy_booking_requested: ['{{first_name}}', '{{full_name}}', '{{puppy_name}}', '{{amount}}', '{{payment_url}}', '{{payments_link}}', '{{expires_in}}', '{{credit_applied}}'],
	puppy_booking_expired: ['{{first_name}}', '{{full_name}}', '{{puppy_name}}', '{{portal_link}}'],
	final_payment_requested: ['{{first_name}}', '{{full_name}}', '{{amount}}', '{{total_price}}', '{{already_paid}}', '{{puppy_name}}', '{{payment_url}}', '{{payments_link}}'],
	reservation_cancelled: ['{{first_name}}', '{{full_name}}', '{{puppy_name}}', '{{portal_link}}'],
	litter_notified: ['{{first_name}}', '{{full_name}}', '{{litter_name}}', '{{litter_breed}}', '{{litter_expected_date}}', '{{litter_link}}', '{{portal_link}}'],
};

// ─── Admin notification template metadata ─────────────────────────────────────

const ADMIN_TRIGGER_LABELS: Record<string, string> = {
	admin_new_application: 'New Application',
	admin_deposit_received: 'Deposit Received',
	admin_booking_payment_received: 'Booking Payment Received',
	admin_final_payment_received: 'Final Payment Received',
	admin_instalment_received: 'Instalment Received',
	admin_puppy_interest: 'Puppy Interest Expressed',
	admin_puppy_auto_booked: 'Puppy Auto-Booked',
	admin_documents_uploaded: 'Documents Uploaded',
	admin_final_payment_requested: 'Final Payment Requested',
	admin_instalment_plan_created: 'Instalment Plan Created',
	admin_puppy_booked_stage: 'Puppy Booked (Stage Change)',
};

const ADMIN_TRIGGER_VARIABLES: Record<string, string[]> = {
	admin_new_application: ['{{full_name}}', '{{first_name}}', '{{email}}', '{{city}}', '{{admin_link}}'],
	admin_deposit_received: ['{{full_name}}', '{{first_name}}', '{{amount}}', '{{deposit_tier}}', '{{admin_link}}'],
	admin_booking_payment_received: ['{{full_name}}', '{{first_name}}', '{{amount}}', '{{puppy_name}}', '{{admin_link}}'],
	admin_final_payment_received: ['{{full_name}}', '{{first_name}}', '{{amount}}', '{{admin_link}}'],
	admin_instalment_received: ['{{full_name}}', '{{first_name}}', '{{amount}}', '{{instalment_label}}', '{{total_paid}}', '{{total_price}}', '{{admin_link}}'],
	admin_puppy_interest: ['{{full_name}}', '{{first_name}}', '{{puppy_name}}', '{{booking_amount}}', '{{admin_link}}'],
	admin_puppy_auto_booked: ['{{full_name}}', '{{first_name}}', '{{puppy_name}}', '{{admin_link}}'],
	admin_documents_uploaded: ['{{full_name}}', '{{first_name}}', '{{email}}', '{{admin_link}}'],
	admin_final_payment_requested: ['{{full_name}}', '{{first_name}}', '{{amount}}', '{{total_price}}', '{{already_paid}}'],
	admin_instalment_plan_created: ['{{full_name}}', '{{first_name}}', '{{instalment_total}}', '{{balance_due}}', '{{admin_link}}'],
	admin_puppy_booked_stage: ['{{full_name}}', '{{first_name}}', '{{email}}', '{{admin_link}}'],
};

// ─── Component ────────────────────────────────────────────────────────────────

type Recipient = { email: string; label: string; enabled: boolean };

const DEFAULT_RECIPIENTS: Recipient[] = [
	{ email: 'westervisser@gmail.com', label: 'Westervisser', enabled: true },
	{ email: 'teddydoodlersa@gmail.com', label: 'Teddy Doodlers', enabled: true },
];

type TemplateDraft = { subject: string; body: string; enabled: boolean };

function TemplateEditor({
	selected,
	draft,
	setDraft,
	saving,
	saved,
	onSave,
	triggerLabels,
	triggerVariables,
}: {
	selected: EmailTemplate;
	draft: TemplateDraft;
	setDraft: React.Dispatch<React.SetStateAction<TemplateDraft>>;
	saving: boolean;
	saved: boolean;
	onSave: () => void;
	triggerLabels: Record<string, string>;
	triggerVariables: Record<string, string[]>;
}) {
	return (
		<Card className="p-6">
			<div className="flex items-start justify-between mb-5">
				<div>
					<h2 className="font-medium text-warm-900">{triggerLabels[selected.trigger] ?? selected.trigger}</h2>
					<p className="text-xs text-warm-400 mt-0.5 font-mono">{selected.trigger}</p>
				</div>
				<label className="flex items-center gap-2 cursor-pointer mt-0.5">
					<span className="text-sm text-warm-600">Enabled</span>
					<input
						type="checkbox"
						checked={draft.enabled}
						onChange={(e) => { setDraft((d) => ({ ...d, enabled: e.target.checked })); }}
						className="w-4 h-4 rounded accent-warm-900"
					/>
				</label>
			</div>

			<div className="mb-4">
				<label className="block text-xs font-medium text-warm-500 mb-1.5">Subject line</label>
				<input
					type="text"
					value={draft.subject}
					onChange={(e) => { setDraft((d) => ({ ...d, subject: e.target.value })); }}
					className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
				/>
			</div>

			<div className="mb-4">
				<label className="block text-xs font-medium text-warm-500 mb-1.5">Body</label>
				<textarea
					value={draft.body}
					onChange={(e) => { setDraft((d) => ({ ...d, body: e.target.value })); }}
					rows={14}
					className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300 resize-y"
				/>
			</div>

			<div className="mb-6">
				<p className="text-xs text-warm-400 mb-2">Available variables</p>
				<div className="flex flex-wrap gap-1.5">
					{(triggerVariables[selected.trigger] ?? []).map((v) => (
						<span key={v} className="px-2 py-0.5 bg-warm-100 text-warm-600 text-xs rounded font-mono">
							{v}
						</span>
					))}
				</div>
			</div>

			<div className="flex items-center gap-3">
				<button
					onClick={onSave}
					disabled={saving}
					className="px-5 py-2 bg-warm-900 text-white text-sm font-medium rounded-lg hover:bg-warm-700 disabled:opacity-50 transition-colors"
				>
					{saving ? 'Saving…' : 'Save changes'}
				</button>
				{saved && <p role="status" className="text-sm text-green-600">Saved.</p>}
			</div>
		</Card>
	);
}

export function AdminEmails() {
	const [tab, setTab] = useState<'client' | 'admin'>('client');

	// Client email state
	const [templates, setTemplates] = useState<EmailTemplate[]>([]);
	const [selected, setSelected] = useState<EmailTemplate | null>(null);
	const [draft, setDraft] = useState<TemplateDraft>({ subject: '', body: '', enabled: true });
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	// Admin notification template state
	const [adminTemplates, setAdminTemplates] = useState<EmailTemplate[]>([]);
	const [adminSelected, setAdminSelected] = useState<EmailTemplate | null>(null);
	const [adminDraft, setAdminDraft] = useState<TemplateDraft>({ subject: '', body: '', enabled: true });
	const [adminSaving, setAdminSaving] = useState(false);
	const [adminSaved, setAdminSaved] = useState(false);
	const adminSeeded = useRef(false);

	// Admin notification recipients state
	const [recipientsDraft, setRecipientsDraft] = useState<Recipient[]>(DEFAULT_RECIPIENTS);
	const [savedRecipients, setSavedRecipients] = useState<Recipient[]>(DEFAULT_RECIPIENTS);
	const [savingRecipients, setSavingRecipients] = useState(false);
	const [savedRecipientsOk, setSavedRecipientsOk] = useState(false);

	usePageTitle('Emails');

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.email as any).templates.get().then(({ data }: { data: EmailTemplate[] | null }) => {
			if (data) {
				setTemplates(data.filter((t) => !t.trigger.startsWith('admin_')));
				setAdminTemplates(data.filter((t) => t.trigger.startsWith('admin_')));
			}
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.email as any).settings.get().then(({ data }: { data: Record<string, string> | null }) => {
			if (data?.admin_notification_recipients) {
				try {
					const parsed = JSON.parse(data.admin_notification_recipients) as Recipient[];
					setRecipientsDraft(parsed);
					setSavedRecipients(parsed);
				} catch {
					// use defaults
				}
			}
		});
	}, []);

	const seedAdminTemplates = async () => {
		if (adminSeeded.current) return;
		adminSeeded.current = true;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.email as any)['admin-templates'].seed.post({});
		if (data) setAdminTemplates(data as EmailTemplate[]);
	};

	const selectTemplate = (t: EmailTemplate) => {
		setSelected(t);
		setDraft({ subject: t.subject, body: t.body, enabled: t.enabled });
		setSaved(false);
	};

	const saveTemplate = async () => {
		if (!selected) return;
		setSaving(true);
		setSaved(false);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.email as any).templates({ id: selected.id }).patch(draft);
		if (data) {
			setTemplates((ts) => ts.map((t) => (t.id === selected.id ? (data as EmailTemplate) : t)));
			setSelected(data as EmailTemplate);
			setSaved(true);
		}
		setSaving(false);
	};

	const selectAdminTemplate = (t: EmailTemplate) => {
		setAdminSelected(t);
		setAdminDraft({ subject: t.subject, body: t.body, enabled: t.enabled });
		setAdminSaved(false);
	};

	const saveAdminTemplate = async () => {
		if (!adminSelected) return;
		setAdminSaving(true);
		setAdminSaved(false);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.email as any).templates({ id: adminSelected.id }).patch(adminDraft);
		if (data) {
			setAdminTemplates((ts) => ts.map((t) => (t.id === adminSelected.id ? (data as EmailTemplate) : t)));
			setAdminSelected(data as EmailTemplate);
			setAdminSaved(true);
		}
		setAdminSaving(false);
	};

	const saveRecipients = async () => {
		setSavingRecipients(true);
		setSavedRecipientsOk(false);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.email as any).settings.patch({
			admin_notification_recipients: JSON.stringify(recipientsDraft),
		});
		if (data) {
			setSavedRecipients(recipientsDraft);
			setSavedRecipientsOk(true);
		}
		setSavingRecipients(false);
	};

	return (
		<div className="p-4 md:p-8 max-w-5xl">
			<PageHeader title="Emails" subtitle="Manage automated emails sent to clients and admin notifications." />

			{/* Tabs */}
			<div className="flex gap-1 mb-6 border-b border-warm-200">
				<button
					onClick={() => setTab('client')}
					className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
						tab === 'client'
							? 'border-warm-900 text-warm-900'
							: 'border-transparent text-warm-400 hover:text-warm-700'
					}`}
				>
					Client Emails
				</button>
				<button
					onClick={() => { setTab('admin'); seedAdminTemplates(); }}
					className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
						tab === 'admin'
							? 'border-warm-900 text-warm-900'
							: 'border-transparent text-warm-400 hover:text-warm-700'
					}`}
				>
					Admin Notifications
				</button>
			</div>

			{/* ── Client Emails tab ── */}
			{tab === 'client' && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="flex flex-col gap-1.5">
						{[...templates].sort((a, b) => (TRIGGER_LABELS[a.trigger] ?? a.trigger).localeCompare(TRIGGER_LABELS[b.trigger] ?? b.trigger)).map((t) => (
							<button
								key={t.id}
								onClick={() => selectTemplate(t)}
								className={`text-left px-4 py-3 rounded-lg text-sm transition-colors ${
									selected?.id === t.id
										? 'bg-warm-900 text-white'
										: 'bg-white text-warm-700 hover:bg-warm-50 border border-warm-200'
								}`}
							>
								<p className="font-medium">{TRIGGER_LABELS[t.trigger] ?? t.trigger}</p>
								<p className={`text-xs mt-0.5 ${selected?.id === t.id ? 'text-warm-400' : 'text-warm-400'}`}>
									{t.enabled ? 'Active' : 'Disabled'}
								</p>
							</button>
						))}
						{templates.length === 0 && (
							<p className="text-sm text-warm-400 px-1">No templates found. Run the SQL setup first.</p>
						)}
					</div>

					{selected ? (
						<div className="md:col-span-2">
							<TemplateEditor
								selected={selected}
								draft={draft}
								setDraft={setDraft}
								saving={saving}
								saved={saved}
								onSave={saveTemplate}
								triggerLabels={TRIGGER_LABELS}
								triggerVariables={TRIGGER_VARIABLES}
							/>
						</div>
					) : (
						<div className="md:col-span-2 flex items-center justify-center min-h-48 text-warm-400 text-sm">
							Select a template to edit
						</div>
					)}
				</div>
			)}

			{/* ── Admin Notifications tab ── */}
			{tab === 'admin' && (
				<div className="flex flex-col gap-6">
					{/* Recipient config */}
					<Card className="p-5">
						<div className="flex items-start justify-between flex-wrap gap-4">
							<div>
								<h2 className="font-medium text-warm-900 mb-0.5">Notification recipients</h2>
								<p className="text-xs text-warm-400">Toggle who receives admin notification emails.</p>
							</div>
							<div className="flex items-center gap-3">
								<button
									onClick={saveRecipients}
									disabled={savingRecipients || JSON.stringify(recipientsDraft) === JSON.stringify(savedRecipients)}
									className="px-4 py-2 bg-warm-900 text-white text-sm font-medium rounded-lg hover:bg-warm-700 disabled:opacity-50 transition-colors"
								>
									{savingRecipients ? 'Saving…' : 'Save'}
								</button>
								{savedRecipientsOk && <p role="status" className="text-sm text-green-600">Saved.</p>}
							</div>
						</div>
						<div className="flex flex-wrap gap-2 mt-4">
							{recipientsDraft.map((r) => (
								<label key={r.email} className="flex items-center gap-2.5 px-3 py-2 border border-warm-200 rounded-lg cursor-pointer hover:bg-warm-50">
									<input
										type="checkbox"
										checked={r.enabled}
										onChange={(e) => {
											setRecipientsDraft((prev) => prev.map((x) => x.email === r.email ? { ...x, enabled: e.target.checked } : x));
											setSavedRecipientsOk(false);
										}}
										className="w-4 h-4 rounded accent-warm-900"
									/>
									<div>
										<p className="text-sm font-medium text-warm-900">{r.label}</p>
										<p className="text-xs text-warm-400">{r.email}</p>
									</div>
								</label>
							))}
						</div>
					</Card>

					{/* Admin template editor */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="flex flex-col gap-1.5">
							{[...adminTemplates].sort((a, b) => (ADMIN_TRIGGER_LABELS[a.trigger] ?? a.trigger).localeCompare(ADMIN_TRIGGER_LABELS[b.trigger] ?? b.trigger)).map((t) => (
								<button
									key={t.id}
									onClick={() => selectAdminTemplate(t)}
									className={`text-left px-4 py-3 rounded-lg text-sm transition-colors ${
										adminSelected?.id === t.id
											? 'bg-warm-900 text-white'
											: 'bg-white text-warm-700 hover:bg-warm-50 border border-warm-200'
									}`}
								>
									<p className="font-medium">{ADMIN_TRIGGER_LABELS[t.trigger] ?? t.trigger}</p>
									<p className={`text-xs mt-0.5 ${adminSelected?.id === t.id ? 'text-warm-400' : 'text-warm-400'}`}>
										{t.enabled ? 'Active' : 'Disabled'}
									</p>
								</button>
							))}
							{adminTemplates.length === 0 && (
								<p className="text-sm text-warm-400 px-1">Loading templates…</p>
							)}
						</div>

						{adminSelected ? (
							<div className="md:col-span-2">
								<TemplateEditor
									selected={adminSelected}
									draft={adminDraft}
									setDraft={setAdminDraft}
									saving={adminSaving}
									saved={adminSaved}
									onSave={saveAdminTemplate}
									triggerLabels={ADMIN_TRIGGER_LABELS}
									triggerVariables={ADMIN_TRIGGER_VARIABLES}
								/>
							</div>
						) : (
							<div className="md:col-span-2 flex items-center justify-center min-h-48 text-warm-400 text-sm">
								Select a notification to edit
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
