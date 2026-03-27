import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, Badge } from '@/components/ui';
import type { Document, DocumentTemplateWithChecklist } from '@paw-registry/shared';

const docTypeLabel: Record<string, string> = {
	contract: 'Contract',
	health_record: 'Health Record',
	go_home_pack: 'Go-Home Pack',
	invoice: 'Invoice',
	other: 'Document',
};

export function PortalDocuments() {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [templates, setTemplates] = useState<DocumentTemplateWithChecklist[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState<string | null>(null);

	useEffect(() => {
		document.title = 'Documents — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		Promise.all([
			api.documents.my.get(),
			api.templates.my.get(),
		]).then(([docsRes, templatesRes]) => {
			if (docsRes.data) setDocuments(docsRes.data as Document[]);
			if (templatesRes.data) setTemplates(templatesRes.data as DocumentTemplateWithChecklist[]);
			setLoading(false);
		});
	}, []);

	const uploadCompleted = async (templateId: string, file: File) => {
		setUploading(templateId);
		const { data } = await api.templates.my({ templateId }).upload.post({ file });
		if (data) {
			setTemplates((prev) =>
				prev.map((t) =>
					t.id === templateId
						? { ...t, checkedAt: new Date().toISOString(), uploadedFileUrl: (data as { uploadedFileUrl: string }).uploadedFileUrl }
						: t
				)
			);
		}
		setUploading(null);
	};

	if (loading) return <LoadingPage />;

	const checkedCount = templates.filter((t) => t.checkedAt).length;

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-warm-900">Documents</h1>
				<p className="text-warm-600 text-sm mt-1">Your contracts, health records, and go-home documents.</p>
			</div>

			{/* Client-specific documents */}
			{documents.length > 0 && (
				<section className="mb-8">
					<h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">Your Documents</h2>
					<div className="flex flex-col gap-3">
						{documents.map((doc) => (
							<Card key={doc.id} className="p-4 flex items-center justify-between">
								<div className="flex items-center gap-4">
									<span className="text-2xl" aria-hidden="true">📄</span>
									<div>
										<p className="font-medium text-warm-900 text-sm">{doc.label}</p>
										<p className="text-xs text-warm-400 mt-0.5">
											{docTypeLabel[doc.type]} · {new Date(doc.createdAt).toLocaleDateString()}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									{doc.signedAt && <Badge variant="green">Signed</Badge>}
									<a
										href={doc.fileUrl}
										target="_blank"
										rel="noreferrer"
										className="text-sm text-brand-600 font-medium hover:underline"
									>
										Download
									</a>
								</div>
							</Card>
						))}
					</div>
				</section>
			)}

			{/* Template documents checklist */}
			{templates.length > 0 && (
				<section>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide">Template Documents</h2>
						<span className="text-xs text-warm-400">{checkedCount} of {templates.length} downloaded</span>
					</div>
					<div className="mb-4 bg-warm-100 rounded-full h-1.5 overflow-hidden">
						<div
							className="h-full bg-brand-500 rounded-full transition-all duration-300"
							style={{ width: `${templates.length > 0 ? (checkedCount / templates.length) * 100 : 0}%` }}
						/>
					</div>
					<div className="flex flex-col gap-3">
						{templates.map((template) => {
							const isChecked = !!template.checkedAt;
							const isUploading = uploading === template.id;
							return (
								<Card
									key={template.id}
									className={`p-4 transition-colors ${isChecked ? 'bg-green-50/50' : ''}`}
								>
									<div className="flex items-center justify-between gap-4">
										<div className="flex items-center gap-4">
											<div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
												isChecked ? 'bg-green-500 border-green-500 text-white' : 'border-warm-300'
											}`}>
												{isChecked && (
													<svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
														<path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
													</svg>
												)}
											</div>
											<span className="text-xl" aria-hidden="true">📄</span>
											<div>
												<p className={`font-medium text-sm ${isChecked ? 'text-warm-500' : 'text-warm-900'}`}>
													{template.name}
												</p>
												{(template.category || template.description) && (
													<p className="text-xs text-warm-400 mt-0.5">
														{[template.category, template.description].filter(Boolean).join(' · ')}
													</p>
												)}
											</div>
										</div>
										<a
											href={template.fileUrl}
											target="_blank"
											rel="noreferrer"
											className="text-sm text-brand-600 font-medium hover:underline flex-shrink-0"
										>
											Download
										</a>
									</div>
									{!isChecked && (
										<div className="mt-3 pl-10">
											<label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-warm-200 text-xs text-warm-600 cursor-pointer hover:bg-warm-50 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
												<svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
													<path d="M8 2v9M4 5l4-3 4 3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
												{isUploading ? 'Uploading…' : 'Upload completed document'}
												<input
													type="file"
													className="hidden"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) uploadCompleted(template.id, file);
													}}
												/>
											</label>
										</div>
									)}
									{isChecked && template.uploadedFileUrl && (
										<div className="mt-2 pl-10">
											<a
												href={template.uploadedFileUrl}
												target="_blank"
												rel="noreferrer"
												className="text-xs text-green-600 hover:underline"
											>
												View uploaded document
											</a>
										</div>
									)}
								</Card>
							);
						})}
					</div>
				</section>
			)}

			{/* Empty state */}
			{documents.length === 0 && templates.length === 0 && (
				<Card className="p-12 text-center">
					<p className="text-4xl mb-4" aria-hidden="true">📄</p>
					<p className="text-warm-600 font-medium">No documents yet</p>
					<p className="text-warm-400 text-sm mt-1">Documents will appear here when shared by your breeder.</p>
				</Card>
			)}
		</div>
	);
}
