import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, Badge, EmptyState } from '@/components/ui';
import type { Litter, UpdateWithLitter } from '@paw-registry/shared';

const EMPTY_FORM = {
	litterId: '',
	title: '',
	body: '',
	weekNumber: '',
	isPublished: false,
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

	useEffect(() => {
		document.title = 'Updates — Paw Registry Admin';
		return () => { document.title = 'Paw Registry'; };
	}, []);

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

		const res = await api.updates.post({
			title: form.title,
			body: form.body,
			litterId: form.litterId || null,
			weekNumber: form.weekNumber ? parseInt(form.weekNumber) : undefined,
			isPublished: form.isPublished,
			sendEmail: form.sendEmail,
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
					<div className="flex flex-col gap-2">
						<label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer">
							<input
								type="checkbox"
								checked={form.isPublished}
								onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked, sendEmail: e.target.checked ? f.sendEmail : false }))}
							/>
							Publish immediately
						</label>
						{form.isPublished && (
							<label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer ml-5">
								<input
									type="checkbox"
									checked={form.sendEmail}
									onChange={(e) => setForm((f) => ({ ...f, sendEmail: e.target.checked }))}
								/>
								Notify clients by email
							</label>
						)}
					</div>
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
		</div>
	);
}
