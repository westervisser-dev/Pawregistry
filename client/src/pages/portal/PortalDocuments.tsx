import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, Glyph } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Client, DocumentTemplateWithChecklist } from '@paw-registry/shared';

const PAST_REVIEW_STAGES = new Set(['waitlisted', 'placed', 'puppy_reserved', 'puppy_booked', 'puppy_fully_paid']);
const POPUP_SHOWN_KEY = 'docs_complete_popup_shown';

function DocsCompletePopup({ onClose }: { onClose: () => void }) {
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		closeRef.current?.focus();
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="docs-complete-title"
				className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 flex flex-col items-center text-center gap-4"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-2xl" aria-hidden="true">
					✅
				</div>
				<div>
					<h2 id="docs-complete-title" className="font-serif text-[18px] text-warm-900 mb-2">
						Documents submitted!
					</h2>
					<p className="text-[13.5px] text-warm-600 leading-relaxed">
						Thank you for submitting your documents. Our breeder will review them soon — if everything looks good, you'll be placed onto our waiting list.
					</p>
				</div>
				<button
					ref={closeRef}
					type="button"
					onClick={onClose}
					className="w-full py-2.5 bg-warm-900 text-white text-sm font-medium rounded-lg hover:bg-warm-800 transition-colors cursor-pointer"
				>
					Got it
				</button>
			</div>
		</div>
	);
}

export function PortalDocuments() {
	const [templates, setTemplates] = useState<DocumentTemplateWithChecklist[]>([]);
	const [clientStage, setClientStage] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState<string | null>(null);
	const [showPopup, setShowPopup] = useState(false);
	const [popupSeen, setPopupSeen] = useState(() => localStorage.getItem(POPUP_SHOWN_KEY) === 'true');

	usePageTitle('Documents');

	useEffect(() => {
		Promise.all([
			api.templates.my.get(),
			api.clients.me.get(),
		]).then(([templatesRes, clientRes]) => {
			if (templatesRes.data) setTemplates(templatesRes.data as DocumentTemplateWithChecklist[]);
			if (clientRes.data) setClientStage((clientRes.data as Client).stage);
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

	// Derived values (computed before hooks that depend on them)
	const checkedCount = templates.filter((t) => t.checkedAt).length;
	const allComplete = templates.length > 0 && checkedCount === templates.length;
	const isPastReview = clientStage !== null && PAST_REVIEW_STAGES.has(clientStage);

	// Show popup once when all docs first become complete
	useEffect(() => {
		if (allComplete && !isPastReview && !popupSeen) {
			setShowPopup(true);
			setPopupSeen(true);
			localStorage.setItem(POPUP_SHOWN_KEY, 'true');
		}
	}, [allComplete, isPastReview, popupSeen]);

	if (loading) return <LoadingPage />;

	const handleDismissPopup = () => setShowPopup(false);

	return (
		<div className="max-w-[900px] mx-auto px-5 md:px-8 pt-6 md:pt-10 pb-8">
			{showPopup && <DocsCompletePopup onClose={handleDismissPopup} />}

			<div className="mb-8">
				<div className="text-[11px] uppercase tracking-[0.14em] text-warm-500 mb-2">Paperwork</div>
				<h1 className="font-serif text-[30px] md:text-[38px] text-warm-900 leading-[1.05]">Documents</h1>
				<p className="text-[13.5px] md:text-[14.5px] text-warm-600 mt-2">Your contracts, health records, and go-home documents.</p>
			</div>

			{/* Under-review banner — shown after popup dismissed, until client is waitlisted */}
			{allComplete && !isPastReview && popupSeen && (
				<div
					role="status"
					className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3.5"
				>
					<span className="text-amber-500 mt-px shrink-0" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
							<path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
						</svg>
					</span>
					<p className="text-[13px] text-amber-800 leading-relaxed">
						<span className="font-medium">Documents under review.</span> Our breeder will review your documents — if successful, you'll be placed onto the waiting list.
					</p>
				</div>
			)}

			{/* Template documents checklist */}
			{templates.length > 0 && (
				<section>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide">Template Documents</h2>
						<span className="text-xs text-warm-400">{checkedCount} of {templates.length} uploaded</span>
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
							if (isChecked) {
								return (
									<Card key={template.id} className="p-4 bg-green-50/40">
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center gap-3">
												<div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
													<svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" aria-hidden="true">
														<path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
													</svg>
												</div>
												<div>
													<p className="font-medium text-sm text-warm-700">{template.name}</p>
													<p className="text-xs text-warm-400 mt-0.5">
														Uploaded {new Date(template.checkedAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
													</p>
												</div>
											</div>
											{!!template.uploadedFileUrl && (
												<a
													href={template.uploadedFileUrl}
													target="_blank"
													rel="noreferrer"
													className="text-xs text-green-600 font-medium hover:underline flex-shrink-0 flex items-center gap-1"
												>
													View upload
													<svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
														<path d="M2 2h8v8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
													</svg>
												</a>
											)}
										</div>
									</Card>
								);
							}
							return (
								<Card key={template.id} className="p-4">
									<div className="flex items-start gap-3 mb-3">
										<span className="text-xl mt-0.5" aria-hidden="true">📄</span>
										<div>
											<p className="font-medium text-sm text-warm-900">{template.name}</p>
											{(template.category || template.description) && (
												<p className="text-xs text-warm-400 mt-0.5">
													{[template.category, template.description].filter(Boolean).join(' · ')}
												</p>
											)}
										</div>
									</div>
									<div className="border-t border-warm-100 pt-3">
										<div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
											<a
												href={template.fileUrl}
												target="_blank"
												rel="noreferrer"
												className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-warm-50 border border-warm-200 hover:bg-warm-100 transition-colors"
											>
												<span className="w-7 h-7 rounded-full bg-warm-200 text-warm-700 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
												<div className="min-w-0">
													<p className="text-[13px] font-medium text-warm-400 uppercase tracking-wide">Step 1</p>
													<p className="text-[17px] font-semibold text-warm-800">Download template</p>
												</div>
												<svg className="w-4 h-4 text-warm-400 ml-auto flex-shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
													<path d="M8 2v8M4 8l4 4 4-4M3 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
											</a>
											<div className="flex items-center justify-center py-0.5 sm:py-0 sm:px-2.5">
												<div className="flex items-center justify-center w-6 h-6 rounded-full bg-warm-100">
													<svg className="w-3 h-3 text-warm-400 rotate-90 sm:rotate-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
														<path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
													</svg>
												</div>
											</div>
											<label className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 cursor-pointer hover:bg-brand-100 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
												<span className="w-7 h-7 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
												<div className="min-w-0">
													<p className="text-[13px] font-medium text-brand-400 uppercase tracking-wide">Step 2</p>
													<p className="text-[17px] font-semibold text-brand-800">{isUploading ? 'Uploading…' : 'Upload signed copy'}</p>
												</div>
												<svg className="w-4 h-4 text-brand-400 ml-auto flex-shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
													<path d="M8 2v9M4 5l4-3 4 3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
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
									</div>
								</Card>
							);
						})}
					</div>
				</section>
			)}

			{/* Empty state */}
			{templates.length === 0 && (
				<Card className="p-12 text-center">
					<div className="w-14 h-14 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-4">
						<Glyph shape="doc" color="#9e8b78" size={22} />
					</div>
					<p className="text-warm-600 font-medium">No documents yet</p>
					<p className="text-warm-400 text-sm mt-1">Documents will appear here when shared by your breeder.</p>
				</Card>
			)}
		</div>
	);
}
