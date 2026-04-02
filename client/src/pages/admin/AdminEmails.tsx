import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, PageHeader } from '@/components/ui';
import type { EmailTemplate } from '@paw-registry/shared';

// ─── Metadata ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
	stage_enquired: 'Application Received',
	stage_approved: 'Application Approved',
	stage_waitlisted: 'Added to Waitlist',
	stage_match_requested: 'Puppy Selection',
	stage_matched: 'Puppy Selected',
	stage_matched_paid: 'Payment Confirmed',
};

const TRIGGER_VARIABLES: Record<string, string[]> = {
	stage_enquired: ['{{first_name}}', '{{full_name}}'],
	stage_approved: ['{{first_name}}', '{{full_name}}', '{{documents_link}}', '{{portal_link}}'],
	stage_waitlisted: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
	stage_match_requested: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
	stage_matched: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
	stage_matched_paid: ['{{first_name}}', '{{full_name}}', '{{portal_link}}'],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminEmails() {
	const [templates, setTemplates] = useState<EmailTemplate[]>([]);
	const [selected, setSelected] = useState<EmailTemplate | null>(null);
	const [draft, setDraft] = useState({ subject: '', body: '', enabled: true });
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		document.title = 'Emails — Paw Registry Admin';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.email as any).templates.get().then(({ data }: { data: EmailTemplate[] | null }) => {
			if (data) setTemplates(data);
		});
	}, []);

	const select = (t: EmailTemplate) => {
		setSelected(t);
		setDraft({ subject: t.subject, body: t.body, enabled: t.enabled });
		setSaved(false);
	};

	const save = async () => {
		if (!selected) return;
		setSaving(true);
		setSaved(false);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.email as any).templates({ id: selected.id }).patch(draft);
		if (data) {
			setTemplates(ts => ts.map(t => t.id === selected.id ? (data as EmailTemplate) : t));
			setSelected(data as EmailTemplate);
			setSaved(true);
		}
		setSaving(false);
	};

	return (
		<div className="p-8 max-w-5xl">
			<PageHeader title="Emails" subtitle="Manage automated emails sent to clients when their stage changes." />

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Template list */}
				<div className="flex flex-col gap-1.5">
					{templates.map(t => (
						<button
							key={t.id}
							onClick={() => select(t)}
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
										onChange={e => { setDraft(d => ({ ...d, enabled: e.target.checked })); setSaved(false); }}
										className="w-4 h-4 rounded accent-warm-900"
									/>
								</label>
							</div>

							<div className="mb-4">
								<label className="block text-xs font-medium text-warm-500 mb-1.5">Subject line</label>
								<input
									type="text"
									value={draft.subject}
									onChange={e => { setDraft(d => ({ ...d, subject: e.target.value })); setSaved(false); }}
									className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
								/>
							</div>

							<div className="mb-4">
								<label className="block text-xs font-medium text-warm-500 mb-1.5">Body</label>
								<textarea
									value={draft.body}
									onChange={e => { setDraft(d => ({ ...d, body: e.target.value })); setSaved(false); }}
									rows={14}
									className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300 resize-y"
								/>
							</div>

							<div className="mb-6">
								<p className="text-xs text-warm-400 mb-2">Available variables</p>
								<div className="flex flex-wrap gap-1.5">
									{(TRIGGER_VARIABLES[selected.trigger] ?? []).map(v => (
										<span key={v} className="px-2 py-0.5 bg-warm-100 text-warm-600 text-xs rounded font-mono">
											{v}
										</span>
									))}
								</div>
							</div>

							<div className="flex items-center gap-3">
								<button
									onClick={save}
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
		</div>
	);
}
