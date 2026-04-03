import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, Badge, EmptyState } from '@/components/ui';
import type { Update } from '@paw-registry/shared';

export function AdminUpdates() {
	const [updates, setUpdates] = useState<Update[]>([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState({ title: '', body: '', targetType: 'litter', targetId: '', weekNumber: '', isPublished: false });
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		document.title = 'Updates — Paw Registry Admin';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		api.updates.admin.get().then(({ data }) => {
			if (data) setUpdates(data as Update[]);
			setLoading(false);
		});
	}, []);

	const submit = async () => {
		setSaving(true);
		await api.updates.post({
			title: form.title,
			body: form.body,
			targetType: form.targetType as 'litter' | 'puppy' | 'client',
			targetId: form.targetId,
			weekNumber: form.weekNumber ? parseInt(form.weekNumber) : undefined,
			isPublished: form.isPublished,
		});
		setSaving(false);
		setForm({ title: '', body: '', targetType: 'litter', targetId: '', weekNumber: '', isPublished: false });
		api.updates.admin.get().then(({ data }) => { if (data) setUpdates(data as Update[]); });
	};

	return (
		<div className="p-4 md:p-8 max-w-4xl">
			<PageHeader title="Updates" subtitle="Post puppy journal updates to clients." />

			<Card className="p-6 mb-8">
				<h2 className="font-medium text-warm-900 mb-4">New Update</h2>
				<div className="flex flex-col gap-4">
					<input
						value={form.title}
						onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
						placeholder="Title"
						className="px-3 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
					/>
					<textarea
						value={form.body}
						onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
						placeholder="What's happening with the puppies this week?"
						rows={4}
						className="px-3 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
					/>
					<div className="grid grid-cols-3 gap-3">
						<select
							value={form.targetType}
							onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))}
							className="px-3 py-2 border border-warm-200 rounded-lg text-sm"
						>
							<option value="litter">Litter</option>
							<option value="puppy">Puppy</option>
							<option value="client">Client</option>
						</select>
						<input
							value={form.targetId}
							onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
							placeholder="Target ID"
							className="px-3 py-2 border border-warm-200 rounded-lg text-sm"
						/>
						<input
							value={form.weekNumber}
							onChange={(e) => setForm((f) => ({ ...f, weekNumber: e.target.value }))}
							placeholder="Week # (optional)"
							type="number"
							className="px-3 py-2 border border-warm-200 rounded-lg text-sm"
						/>
					</div>
					<div className="flex items-center justify-between">
						<label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer">
							<input
								type="checkbox"
								checked={form.isPublished}
								onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
							/>
							Publish immediately
						</label>
						<button
							onClick={submit}
							disabled={saving || !form.title || !form.targetId}
							className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
						>
							{saving ? 'Posting…' : 'Post Update'}
						</button>
					</div>
				</div>
			</Card>

			{loading ? <LoadingPage /> : (
				<div className="flex flex-col gap-4">
					{updates.map((u) => (
						<Card key={u.id} className="p-4 flex items-start justify-between">
							<div>
								<p className="font-medium text-warm-900">{u.title}</p>
								<p className="text-sm text-warm-500 mt-1 line-clamp-1">{u.body}</p>
								<p className="text-xs text-warm-400 mt-1">
									{u.targetType} · {new Date(u.createdAt).toLocaleDateString()}
								</p>
							</div>
							<Badge variant={u.isPublished ? 'green' : 'amber'}>
								{u.isPublished ? 'Published' : 'Draft'}
							</Badge>
						</Card>
					))}
					{updates.length === 0 && <EmptyState icon="📷" title="No updates yet" />}
				</div>
			)}
		</div>
	);
}
