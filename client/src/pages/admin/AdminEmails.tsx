import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, PageHeader } from '@/components/ui';
import type { EmailTemplate } from '@paw-registry/shared';
import { usePageTitle } from '@/hooks/usePageTitle';

// ─── Metadata ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
	stage_enquired: 'Application Received',
	stage_approved: 'Application Approved',
	stage_waitlisted: 'Added to Waitlist',
	stage_puppy_reserved: 'Puppy Reserved',
	stage_puppy_booked: 'Puppy Booked',
	stage_puppy_fully_paid: 'Puppy Fully Paid',
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

const ADMIN_NOTIFICATION_TYPES = [
	{ label: 'New application submitted', description: 'Client completes the application form' },
	{ label: 'Deposit received', description: 'Client pays their deposit via Paystack' },
	{ label: 'Booking payment received', description: 'Client pays their booking deposit' },
	{ label: 'Final payment received', description: 'Client completes their final payment' },
	{ label: 'Instalment payment received', description: 'Client pays an instalment toward their balance' },
	{ label: 'Puppy interest expressed', description: 'Client expresses interest in a puppy (booking window opened)' },
	{ label: 'Puppy auto-booked', description: 'Client with R5,000 deposit expresses interest — auto-booked' },
	{ label: 'Booking window expired', description: '24h booking window expires without payment' },
	{ label: 'All documents uploaded', description: 'Client uploads all required documents' },
	{ label: 'Final payment requested', description: 'Admin sends a final payment request to client' },
	{ label: 'Instalment plan created', description: 'Admin creates a multi-instalment payment plan' },
	{ label: 'Puppy booked (stage change)', description: 'Admin manually sets client stage to Puppy Booked' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminEmails() {
	const [tab, setTab] = useState<'client' | 'admin'>('client');

	// Client email state
	const [templates, setTemplates] = useState<EmailTemplate[]>([]);
	const [selected, setSelected] = useState<EmailTemplate | null>(null);
	const [draft, setDraft] = useState({ subject: '', body: '', enabled: true });
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	// Admin settings state
	const [adminEmail, setAdminEmail] = useState('');
	const [adminEmailDraft, setAdminEmailDraft] = useState('');
	const [savingAdmin, setSavingAdmin] = useState(false);
	const [savedAdmin, setSavedAdmin] = useState(false);

	usePageTitle('Emails');

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.email as any).templates.get().then(({ data }: { data: EmailTemplate[] | null }) => {
			if (data) setTemplates(data);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.email as any).settings.get().then(({ data }: { data: Record<string, string> | null }) => {
			if (data?.admin_email) {
				setAdminEmail(data.admin_email);
				setAdminEmailDraft(data.admin_email);
			}
		});
	}, []);

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

	const saveAdminEmail = async () => {
		setSavingAdmin(true);
		setSavedAdmin(false);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.email as any).settings.patch({ admin_email: adminEmailDraft });
		if (data) {
			setAdminEmail((data as Record<string, string>).admin_email ?? adminEmailDraft);
			setSavedAdmin(true);
		}
		setSavingAdmin(false);
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
					onClick={() => setTab('admin')}
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
					{/* Template list */}
					<div className="flex flex-col gap-1.5">
						{templates.map((t) => (
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

					{/* Editor */}
					{selected ? (
						<div className="md:col-span-2">
							<Card className="p-6">
								<div className="flex items-start justify-between mb-5">
									<div>
										<h2 className="font-medium text-warm-900">{TRIGGER_LABELS[selected.trigger] ?? selected.trigger}</h2>
										<p className="text-xs text-warm-400 mt-0.5 font-mono">{selected.trigger}</p>
									</div>
									<label className="flex items-center gap-2 cursor-pointer mt-0.5">
										<span className="text-sm text-warm-600">Enabled</span>
										<input
											type="checkbox"
											checked={draft.enabled}
											onChange={(e) => { setDraft((d) => ({ ...d, enabled: e.target.checked })); setSaved(false); }}
											className="w-4 h-4 rounded accent-warm-900"
										/>
									</label>
								</div>

								<div className="mb-4">
									<label className="block text-xs font-medium text-warm-500 mb-1.5">Subject line</label>
									<input
										type="text"
										value={draft.subject}
										onChange={(e) => { setDraft((d) => ({ ...d, subject: e.target.value })); setSaved(false); }}
										className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
									/>
								</div>

								<div className="mb-4">
									<label className="block text-xs font-medium text-warm-500 mb-1.5">Body</label>
									<textarea
										value={draft.body}
										onChange={(e) => { setDraft((d) => ({ ...d, body: e.target.value })); setSaved(false); }}
										rows={14}
										className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300 resize-y"
									/>
								</div>

								<div className="mb-6">
									<p className="text-xs text-warm-400 mb-2">Available variables</p>
									<div className="flex flex-wrap gap-1.5">
										{(TRIGGER_VARIABLES[selected.trigger] ?? []).map((v) => (
											<span key={v} className="px-2 py-0.5 bg-warm-100 text-warm-600 text-xs rounded font-mono">
												{v}
											</span>
										))}
									</div>
								</div>

								<div className="flex items-center gap-3">
									<button
										onClick={saveTemplate}
										disabled={saving}
										className="px-5 py-2 bg-warm-900 text-white text-sm font-medium rounded-lg hover:bg-warm-700 disabled:opacity-50 transition-colors"
									>
										{saving ? 'Saving…' : 'Save changes'}
									</button>
									{saved && <p role="status" className="text-sm text-green-600">Saved.</p>}
								</div>
							</Card>
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
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Settings panel */}
					<div className="md:col-span-1">
						<Card className="p-6">
							<h2 className="font-medium text-warm-900 mb-1">Notification email</h2>
							<p className="text-xs text-warm-400 mb-4">All admin notifications are sent to this address.</p>
							<input
								type="email"
								value={adminEmailDraft}
								onChange={(e) => { setAdminEmailDraft(e.target.value); setSavedAdmin(false); }}
								placeholder="you@example.com"
								className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 mb-3"
							/>
							<div className="flex items-center gap-3">
								<button
									onClick={saveAdminEmail}
									disabled={savingAdmin || adminEmailDraft === adminEmail}
									className="px-4 py-2 bg-warm-900 text-white text-sm font-medium rounded-lg hover:bg-warm-700 disabled:opacity-50 transition-colors"
								>
									{savingAdmin ? 'Saving…' : 'Save'}
								</button>
								{savedAdmin && <p role="status" className="text-sm text-green-600">Saved.</p>}
							</div>
						</Card>
					</div>

					{/* Notification types list */}
					<div className="md:col-span-2">
						<p className="text-xs font-medium text-warm-500 mb-3 uppercase tracking-wide">Notifications you receive</p>
						<div className="flex flex-col gap-2">
							{ADMIN_NOTIFICATION_TYPES.map((n) => (
								<div key={n.label} className="flex items-start gap-3 px-4 py-3 bg-white border border-warm-200 rounded-lg">
									<div className="w-1.5 h-1.5 rounded-full bg-warm-400 mt-1.5 shrink-0" aria-hidden="true" />
									<div>
										<p className="text-sm font-medium text-warm-900">{n.label}</p>
										<p className="text-xs text-warm-400 mt-0.5">{n.description}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
