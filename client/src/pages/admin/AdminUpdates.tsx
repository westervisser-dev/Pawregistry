import { useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, Badge, EmptyState } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Litter, UpdateWithLitter } from '@paw-registry/shared';
import { UpdateRecipientsModal, type RecipientCandidate } from './UpdateRecipientsModal';

const EMPTY_FORM = {
	litterId: '',
	title: '',
	body: '',
	weekNumber: '',
	sendEmail: false,
};

export function AdminUpdates() {
	const [updates, setUpdates] = useState<UpdateWithLitter[]>([]);
	const [litters, setLitters] = useState<Litter[]>([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState(EMPTY_FORM);
	const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([]);
	const [saving, setSaving] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [publishingId, setPublishingId] = useState<string | null>(null);
	const [publishSendEmail, setPublishSendEmail] = useState(false);
	const [uploadingId, setUploadingId] = useState<string | null>(null);
	const formFileRef = useRef<HTMLInputElement>(null);
	const updateFileRef = useRef<HTMLInputElement>(null);
	const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);

	// Recipient picker state (only meaningful when form.litterId is set)
	const [candidates, setCandidates] = useState<RecipientCandidate[]>([]);
	const [candidatesLoading, setCandidatesLoading] = useState(false);
	// null = default (all eligible); Set = admin override
	const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string> | null>(null);
	const [recipientsModalOpen, setRecipientsModalOpen] = useState(false);

	usePageTitle('Updates');

	useEffect(() => {
		Promise.all([
			api.updates.admin.get(),
			(api.litters.admin as any).all.get(),
		]).then(([updatesRes, littersRes]) => {
			if (updatesRes.data) setUpdates(updatesRes.data as UpdateWithLitter[]);
			if (littersRes.data) setLitters(littersRes.data as Litter[]);
			setLoading(false);
		});
	}, []);

	const reload = () =>
		api.updates.admin.get().then(({ data }) => { if (data) setUpdates(data as UpdateWithLitter[]); });

	// Fetch recipient candidates whenever the litter changes; reset override.
	useEffect(() => {
		setSelectedRecipientIds(null);
		if (!form.litterId) {
			setCandidates([]);
			return;
		}
		setCandidatesLoading(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		((api.updates.admin as any)['recipient-candidates'].get({ query: { litterId: form.litterId } }) as Promise<{ data: RecipientCandidate[] | null }>)
			.then(({ data }) => { if (data) setCandidates(data); })
			.finally(() => setCandidatesLoading(false));
	}, [form.litterId]);

	const defaultRecipientIds = candidates.filter((c) => !c.optedOut).map((c) => c.id);
	const recipientCount = selectedRecipientIds ? selectedRecipientIds.size : defaultRecipientIds.length;

	const addPendingFiles = (files: FileList) => {
		const newFiles = Array.from(files).map((file) => ({
			file,
			preview: URL.createObjectURL(file),
		}));
		setPendingFiles((prev) => [...prev, ...newFiles]);
	};

	const removePendingFile = (index: number) => {
		setPendingFiles((prev) => {
			URL.revokeObjectURL(prev[index].preview);
			return prev.filter((_, i) => i !== index);
		});
	};

	const clearPendingFiles = (files: { file: File; preview: string }[]) => {
		files.forEach((f) => URL.revokeObjectURL(f.preview));
		setPendingFiles([]);
	};

	const submit = async () => {
		if (!form.title) return;
		setSaving(true);

		const recipientClientIds = form.litterId && selectedRecipientIds
			? [...selectedRecipientIds]
			: null;

		const res = await api.updates.post({
			title: form.title,
			body: form.body,
			litterId: form.litterId || null,
			weekNumber: form.weekNumber ? parseInt(form.weekNumber) : undefined,
			isPublished: true,
			sendEmail: form.sendEmail,
			recipientClientIds,
		});

		const created = res.data as UpdateWithLitter | undefined;
		if (created && pendingFiles.length > 0) {
			setUploadProgress({ current: 0, total: pendingFiles.length });
			for (let i = 0; i < pendingFiles.length; i++) {
				await (api.updates as any)[created.id].media.post({ file: pendingFiles[i].file });
				setUploadProgress({ current: i + 1, total: pendingFiles.length });
			}
			setUploadProgress(null);
		}

		clearPendingFiles(pendingFiles);
		setSaving(false);
		setForm(EMPTY_FORM);
		setSelectedRecipientIds(null);
		reload();
	};

	const publishDraft = async (update: UpdateWithLitter) => {
		setPublishingId(update.id);
		await (api.updates as any)[update.id].patch({
			isPublished: true,
			sendEmail: publishSendEmail,
		});
		setPublishingId(null);
		setPublishSendEmail(false);
		reload();
	};

	const deleteUpdate = async (id: string) => {
		if (!confirm('Delete this update? This cannot be undone.')) return;
		setDeletingId(id);
		await (api.updates as any)[id].delete();
		setDeletingId(null);
		reload();
	};

	const uploadMedia = async (updateId: string, file: File) => {
		setUploadingId(updateId);
		await (api.updates as any)[updateId].media.post({ file });
		setUploadingId(null);
		reload();
	};

	const removeMedia = async (updateId: string, url: string) => {
		await (api.updates as any)[updateId].media.delete({ url });
		reload();
	};

	return (
		<div className="p-4 md:p-8 max-w-4xl">
			<PageHeader title="Updates" subtitle="Post puppy journal updates to clients." />

			{/* Create form */}
			<Card className="p-6 mb-8">
				<h2 className="font-medium text-warm-900 mb-4">New Update</h2>
				<div className="flex flex-col gap-4">
					<select
						value={form.litterId}
						onChange={(e) => setForm((f) => ({ ...f, litterId: e.target.value }))}
						className="px-3 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
					>
						<option value="">General announcement (all portal clients)</option>
						{litters.map((l) => (
							<option key={l.id} value={l.id}>{l.name}</option>
						))}
					</select>
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

					{/* Photo attachments */}
					<div>
						{pendingFiles.length > 0 && (
							<div className="flex gap-2 flex-wrap mb-3">
								{pendingFiles.map(({ preview }, i) => (
									<div key={i} className="relative w-20 h-20 group">
										<img
											src={preview}
											alt=""
											className="w-full h-full object-cover rounded-lg border border-warm-200"
										/>
										<button
											type="button"
											onClick={() => removePendingFile(i)}
											className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-warm-800 text-white text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
											aria-label="Remove photo"
										>
											✕
										</button>
									</div>
								))}
							</div>
						)}
						<button
							type="button"
							onClick={() => formFileRef.current?.click()}
							className="text-sm text-warm-500 hover:text-warm-700 border border-dashed border-warm-300 rounded-lg px-4 py-2 w-full text-center transition-colors hover:border-warm-400"
						>
							+ Add photos
						</button>
						<input
							ref={formFileRef}
							type="file"
							accept="image/*,video/*"
							multiple
							className="hidden"
							onChange={(e) => {
								if (e.target.files) addPendingFiles(e.target.files);
								e.target.value = '';
							}}
						/>
					</div>

					<input
						value={form.weekNumber}
						onChange={(e) => setForm((f) => ({ ...f, weekNumber: e.target.value }))}
						placeholder="Week # (optional)"
						type="number"
						min={1}
						className="px-3 py-2 border border-warm-200 rounded-lg text-sm w-40"
					/>
					{form.litterId && (
						<button
							type="button"
							onClick={() => setRecipientsModalOpen(true)}
							disabled={candidatesLoading || candidates.length === 0}
							className="flex items-center gap-2.5 px-3 py-2.5 border border-warm-200 rounded-lg text-sm hover:bg-warm-50 disabled:opacity-60 disabled:cursor-not-allowed text-left transition-colors"
						>
							<Users size={15} className="text-warm-500 flex-shrink-0" aria-hidden="true" />
							<span className="flex-1 text-warm-700">
								{candidatesLoading
									? 'Loading recipients…'
									: candidates.length === 0
										? 'No clients are associated with this litter yet'
										: (
											<>
												<span className="tabular-nums font-medium text-warm-900">{recipientCount}</span>
												{' of '}
												<span className="tabular-nums">{candidates.length}</span>
												{' clients will receive this update'}
												{form.sendEmail && ' and email'}
											</>
										)}
							</span>
							{candidates.length > 0 && !candidatesLoading && (
								<span className="text-[11.5px] font-medium text-brand-500">Review</span>
							)}
						</button>
					)}
					<label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer">
						<input
							type="checkbox"
							checked={form.sendEmail}
							onChange={(e) => setForm((f) => ({ ...f, sendEmail: e.target.checked }))}
						/>
						Notify clients by email
					</label>
					<div className="flex flex-col gap-2">
						{uploadProgress && (
							<div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
								<div
									className="h-full bg-brand-500 rounded-full transition-all duration-300"
									style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
								/>
							</div>
						)}
						<div className="flex justify-end">
							<button
								onClick={submit}
								disabled={saving || !form.title}
								className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 min-w-36 text-center"
							>
								{uploadProgress
									? `Uploading ${uploadProgress.current}/${uploadProgress.total}…`
									: saving
										? 'Posting…'
										: 'Post Update'}
							</button>
						</div>
					</div>
				</div>
			</Card>

			{loading ? <LoadingPage /> : (
				<div className="flex flex-col gap-4">
					{updates.map((u) => (
						<Card key={u.id} className="p-4">
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap mb-1">
										<span className="text-xs text-warm-400 font-medium">
											{u.litter?.name ?? 'General'}
										</span>
										{!!u.weekNumber && (
											<Badge variant="amber">Week {u.weekNumber}</Badge>
										)}
										<Badge variant={u.isPublished ? 'green' : 'amber'}>
											{u.isPublished ? 'Published' : 'Draft'}
										</Badge>
										{!!u.emailSentAt && (
											<Badge variant="green">Email sent</Badge>
										)}
									</div>
									<p className="font-medium text-warm-900">{u.title}</p>
									<p className="text-sm text-warm-500 mt-0.5 line-clamp-2">{u.body}</p>
									<p className="text-xs text-warm-400 mt-1">
										{new Date(u.createdAt).toLocaleDateString()}
									</p>
								</div>
								<button
									onClick={() => deleteUpdate(u.id)}
									disabled={deletingId === u.id}
									className="text-xs text-warm-400 hover:text-red-500 shrink-0 disabled:opacity-50"
									aria-label="Delete update"
								>
									{deletingId === u.id ? '…' : '✕'}
								</button>
							</div>

							{/* Media thumbnails */}
							{u.mediaUrls.length > 0 && (
								<div className="flex gap-2 mt-3 flex-wrap">
									{u.mediaUrls.map((url) => (
										<div key={url} className="relative group w-16 h-16">
											<img src={url} alt="" className="w-full h-full object-cover rounded-md" />
											<button
												onClick={() => removeMedia(u.id, url)}
												className="absolute inset-0 bg-black/50 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
												aria-label="Remove image"
											>
												✕
											</button>
										</div>
									))}
								</div>
							)}

							{/* Actions */}
							<div className="flex items-center gap-3 mt-3 pt-3 border-t border-warm-100">
								<button
									onClick={() => { setPendingUploadId(u.id); updateFileRef.current?.click(); }}
									disabled={uploadingId === u.id}
									className="text-xs text-warm-500 hover:text-warm-700 disabled:opacity-50"
								>
									{uploadingId === u.id ? 'Uploading…' : '+ Add photo'}
								</button>

								{!u.isPublished && (
									<div className="flex items-center gap-3 ml-auto">
										<label className="flex items-center gap-1.5 text-xs text-warm-500 cursor-pointer">
											<input
												type="checkbox"
												checked={publishingId === u.id ? publishSendEmail : false}
												onChange={(e) => { setPublishingId(u.id); setPublishSendEmail(e.target.checked); }}
											/>
											Send email
										</label>
										<button
											onClick={() => publishDraft(u)}
											disabled={publishingId === u.id}
											className="px-3 py-1 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
										>
											{publishingId === u.id ? 'Publishing…' : 'Publish'}
										</button>
									</div>
								)}
							</div>
						</Card>
					))}
					{updates.length === 0 && <EmptyState icon="📷" title="No updates yet" />}
				</div>
			)}

			{/* Hidden file input for existing-update media */}
			<input
				ref={updateFileRef}
				type="file"
				accept="image/*,video/*"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file && pendingUploadId) {
						uploadMedia(pendingUploadId, file);
						setPendingUploadId(null);
					}
					e.target.value = '';
				}}
			/>

			<UpdateRecipientsModal
				open={recipientsModalOpen}
				litterName={litters.find((l) => l.id === form.litterId)?.name ?? ''}
				candidates={candidates}
				initialSelected={selectedRecipientIds ?? new Set(defaultRecipientIds)}
				sendEmail={form.sendEmail}
				onClose={() => setRecipientsModalOpen(false)}
				onConfirm={(ids) => {
					setSelectedRecipientIds(ids);
					setRecipientsModalOpen(false);
				}}
			/>
		</div>
	);
}
