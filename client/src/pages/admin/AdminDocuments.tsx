import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, EmptyState, Badge } from '@/components/ui';
import type { DocumentTemplate } from '@paw-registry/shared';

export function AdminDocuments() {
	const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [form, setForm] = useState({ name: '', description: '', category: '' });
	const [formError, setFormError] = useState('');
	const fileRef = useRef<HTMLInputElement>(null);

	const load = () => {
		api.templates.admin.get().then(({ data }) => {
			if (data) setTemplates(data as DocumentTemplate[]);
			setLoading(false);
		});
	};

	useEffect(() => { load(); }, []);

	const upload = async () => {
		setFormError('');
		const file = fileRef.current?.files?.[0];
		if (!file) { setFormError('Please select a file.'); return; }
		if (!form.name.trim()) { setFormError('Name is required.'); return; }

		setUploading(true);
		try {
			const { error } = await api.templates.admin.post({
				file,
				name: form.name.trim(),
				...(form.description.trim() ? { description: form.description.trim() } : {}),
				...(form.category.trim() ? { category: form.category.trim() } : {}),
			});
			if (error) { setFormError('Upload failed. Please try again.'); return; }
			setForm({ name: '', description: '', category: '' });
			if (fileRef.current) fileRef.current.value = '';
			load();
		} catch {
			setFormError('Upload failed. Please try again.');
		} finally {
			setUploading(false);
		}
	};

	const toggleActive = async (template: DocumentTemplate) => {
		await api.templates.admin({ id: template.id }).patch({ isActive: !template.isActive });
		load();
	};

	const deleteTemplate = async (id: string) => {
		if (!confirm('Delete this template? Clients will no longer see it.')) return;
		await api.templates.admin({ id }).delete();
		load();
	};

	return (
		<div className="p-8 max-w-4xl">
			<PageHeader
				title="Document Templates"
				subtitle="Upload template files that clients can view and download from their portal."
			/>

			<Card className="p-6 mb-8">
				<h2 className="font-medium text-stone-900 mb-4">Upload Template</h2>
				<div className="flex flex-col gap-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">
								Name<span className="text-red-400 ml-0.5">*</span>
							</label>
							<input
								type="text"
								value={form.name}
								onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
								placeholder="e.g. Puppy Purchase Agreement"
								className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
							<input
								type="text"
								value={form.category}
								onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
								placeholder="e.g. Contracts, Health, Care Guide"
								className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
						</div>
					</div>
					<div>
						<label className="block text-xs font-medium text-stone-500 mb-1">Description</label>
						<input
							type="text"
							value={form.description}
							onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
							placeholder="Brief description of this document"
							className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
						/>
					</div>
					<div>
						<label className="block text-xs font-medium text-stone-500 mb-1">
							File<span className="text-red-400 ml-0.5">*</span>
						</label>
						<input
							ref={fileRef}
							type="file"
							accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
							className="w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
						/>
					</div>
					{formError && <p className="text-sm text-red-600">{formError}</p>}
					<button
						onClick={upload}
						disabled={uploading}
						className="self-start px-5 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
					>
						{uploading ? 'Uploading…' : 'Upload Template'}
					</button>
				</div>
			</Card>

			{loading ? <LoadingPage /> : (
				<Card>
					{templates.length === 0 ? (
						<EmptyState icon="📄" title="No templates yet" description="Upload your first template above." />
					) : (
						<div className="divide-y divide-stone-100">
							{templates.map((template) => (
								<div key={template.id} className="flex items-start justify-between px-5 py-4 gap-4">
									<div className="flex items-start gap-3 flex-1 min-w-0">
										<span className="text-2xl mt-0.5">📄</span>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<p className="font-medium text-stone-900 text-sm">{template.name}</p>
												{template.category && (
													<Badge variant="default">{template.category}</Badge>
												)}
												{!template.isActive && (
													<Badge variant="amber">Hidden</Badge>
												)}
											</div>
											{template.description && (
												<p className="text-xs text-stone-500 mt-0.5">{template.description}</p>
											)}
											<p className="text-xs text-stone-400 mt-1">
												Added {new Date(template.createdAt).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 flex-shrink-0">
										<a
											href={template.fileUrl}
											target="_blank"
											rel="noreferrer"
											className="text-xs text-brand-600 hover:underline"
										>
											View
										</a>
										<button
											onClick={() => toggleActive(template)}
											className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded hover:bg-stone-100"
										>
											{template.isActive ? 'Hide' : 'Show'}
										</button>
										<button
											onClick={() => deleteTemplate(template.id)}
											className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
										>
											Delete
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</Card>
			)}
		</div>
	);
}
