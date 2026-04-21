import { useEffect, useMemo, useState } from 'react';
import { X, ChevronDown, ChevronUp, Mail, Users, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useFocusTrap } from '@/components/ui';
import type { EmailTemplate } from '@paw-registry/shared';

type EligibleClient = {
	id: string;
	firstName: string;
	lastName: string;
	city: string | null;
	depositStatus: string;
	waitlistPosition?: number | null;
	matchReasons?: string[];
};

type Segment = {
	key: 'interested' | 'matched' | 'waitlist';
	label: string;
	description: string;
	clients: EligibleClient[];
};

export type LaunchLitterModalMode = 'launch' | 'topup';

export function LaunchLitterModal({
	open,
	mode,
	litterName,
	litterBreedLabel,
	segments,
	sending,
	onClose,
	onConfirm,
}: {
	open: boolean;
	mode: LaunchLitterModalMode;
	litterName: string;
	litterBreedLabel: string | null;
	segments: Segment[];
	sending: boolean;
	onClose: () => void;
	onConfirm: (clientIds: string[]) => Promise<void> | void;
}) {
	const dialogRef = useFocusTrap(open, onClose);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
	const [previewOpen, setPreviewOpen] = useState(false);
	const [template, setTemplate] = useState<EmailTemplate | null>(null);

	// Seed selection on open: all eligible clients selected by default
	useEffect(() => {
		if (!open) return;
		const all = new Set<string>();
		segments.forEach((s) => s.clients.forEach((c) => all.add(c.id)));
		setSelectedIds(all);
		setCollapsed({});
		setPreviewOpen(false);
	}, [open, segments]);

	// Lazy-load the email template for preview
	useEffect(() => {
		if (!open || template) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.email as any).templates.get().then(({ data }: { data: EmailTemplate[] | null }) => {
			if (data) {
				const t = data.find((x) => x.trigger === 'litter_notified') ?? null;
				setTemplate(t);
			}
		}).catch(() => { /* ignore */ });
	}, [open, template]);

	const totalEligible = useMemo(() => segments.reduce((sum, s) => sum + s.clients.length, 0), [segments]);
	const selectedCount = selectedIds.size;

	const toggleClient = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	};

	const selectAllInSegment = (segment: Segment) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			segment.clients.forEach((c) => next.add(c.id));
			return next;
		});
	};

	const clearSegment = (segment: Segment) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			segment.clients.forEach((c) => next.delete(c.id));
			return next;
		});
	};

	const handleConfirm = async () => {
		if (selectedCount === 0) return;
		await onConfirm([...selectedIds]);
	};

	// Build preview with the first selected client's first name
	const previewVars = useMemo(() => {
		let firstName = 'there';
		for (const s of segments) {
			const match = s.clients.find((c) => selectedIds.has(c.id));
			if (match) { firstName = match.firstName; break; }
		}
		return {
			first_name: firstName,
			litter_name: litterName,
			litter_breed: litterBreedLabel ?? 'TBC',
			litter_link: 'https://<your-portal>/portal/litters/...',
			portal_link: 'https://<your-portal>/portal',
		};
	}, [segments, selectedIds, litterName, litterBreedLabel]);

	const interpolate = (str: string, vars: Record<string, string>) =>
		str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '{{' + key + '}}');

	if (!open) return null;

	const title = mode === 'launch' ? 'Open ' + litterName + ' for puppy reservations' : 'Notify new waitlist additions';
	const ctaLabel = sending
		? 'Sending...'
		: mode === 'launch'
			? 'Send to ' + selectedCount + ' client' + (selectedCount === 1 ? '' : 's') + ' - Open for puppy reservations'
			: 'Notify ' + selectedCount + ' new client' + (selectedCount === 1 ? '' : 's');

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="launch-modal-title"
				className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
			>
				{/* Header */}
				<div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-warm-100">
					<div className="min-w-0">
						<h2 id="launch-modal-title" className="font-serif text-lg text-warm-900 leading-tight truncate">
							{title}
						</h2>
						{mode === 'launch' && (
							<p className="mt-1.5 text-sm text-warm-600">
								Clients can&apos;t reserve puppies in this litter until you notify them. Confirming will email the
								selected clients and open the litter for reservations.
							</p>
						)}
						{mode === 'topup' && (
							<p className="mt-1.5 text-sm text-warm-600">
								These clients joined the waitlist after this litter was opened. Notifying them lets them reserve.
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-warm-100 flex items-center justify-center text-warm-500"
						aria-label="Close"
					>
						<X size={16} aria-hidden="true" />
					</button>
				</div>

				{/* Body — scrolls */}
				<div className="flex-1 overflow-y-auto p-6 space-y-4">
					{totalEligible === 0 ? (
						<div className="text-sm text-warm-500 text-center py-10">
							No eligible clients to notify right now.
						</div>
					) : (
						segments.map((segment) => {
							const isCollapsed = !!collapsed[segment.key];
							const segSelected = segment.clients.filter((c) => selectedIds.has(c.id)).length;
							const Icon = segment.key === 'interested' ? Sparkles : segment.key === 'matched' ? Users : Mail;

							return (
								<div key={segment.key} className="border border-warm-200 rounded-xl overflow-hidden">
									<button
										type="button"
										onClick={() => setCollapsed((prev) => ({ ...prev, [segment.key]: !isCollapsed }))}
										className="w-full flex items-center gap-3 px-4 py-3 bg-warm-50 hover:bg-warm-100 transition-colors"
									>
										<Icon size={15} className="text-warm-500 flex-shrink-0" aria-hidden="true" />
										<div className="flex-1 text-left min-w-0">
											<div className="text-sm font-semibold text-warm-900">
												{segment.label}
												<span className="ml-2 text-xs font-normal text-warm-500">
													{segSelected} of {segment.clients.length} selected
												</span>
											</div>
											<div className="text-[11.5px] text-warm-500 mt-0.5">{segment.description}</div>
										</div>
										{isCollapsed ? (
											<ChevronDown size={15} className="text-warm-400" aria-hidden="true" />
										) : (
											<ChevronUp size={15} className="text-warm-400" aria-hidden="true" />
										)}
									</button>

									{!isCollapsed && segment.clients.length > 0 && (
										<>
											<div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-warm-100 bg-white">
												{segSelected > 0 && (
													<button
														type="button"
														onClick={() => clearSegment(segment)}
														className="text-[11px] text-warm-400 font-medium hover:text-warm-600"
													>
														Clear
													</button>
												)}
												<button
													type="button"
													onClick={() => selectAllInSegment(segment)}
													className="text-[11px] text-brand-500 font-medium hover:text-brand-600"
												>
													Select all
												</button>
											</div>
											<ul className="divide-y divide-warm-100">
												{segment.clients.map((client) => {
													const isChecked = selectedIds.has(client.id);
													return (
														<li key={client.id}>
															<label className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-warm-50 transition-colors">
																<input
																	type="checkbox"
																	checked={isChecked}
																	onChange={() => toggleClient(client.id)}
																	className="mt-[3px] w-4 h-4 accent-brand-500 flex-shrink-0"
																/>
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-2 flex-wrap">
																		<span className="text-sm font-medium text-warm-900">
																			{client.firstName} {client.lastName}
																		</span>
																		{client.waitlistPosition != null && (
																			<span className="text-[10.5px] text-warm-400">
																				#{client.waitlistPosition}
																			</span>
																		)}
																		{client.depositStatus === 'paid' && (
																			<span className="text-[10px] font-semibold px-1.5 py-[1px] rounded-full bg-green-50 text-green-700">
																				Deposit paid
																			</span>
																		)}
																		{client.depositStatus === 'pending' && (
																			<span className="text-[10px] font-semibold px-1.5 py-[1px] rounded-full bg-amber-50 text-amber-700">
																				Deposit pending
																			</span>
																		)}
																	</div>
																	{(client.city || (client.matchReasons && client.matchReasons.length > 0)) && (
																		<div className="text-[11.5px] text-warm-500 mt-0.5 truncate">
																			{client.city && <span>{client.city}</span>}
																			{client.city && client.matchReasons && client.matchReasons.length > 0 && (
																				<span className="mx-1.5 text-warm-300">&middot;</span>
																			)}
																			{client.matchReasons && client.matchReasons.length > 0 && (
																				<span>{client.matchReasons.join(', ')}</span>
																			)}
																		</div>
																	)}
																</div>
															</label>
														</li>
													);
												})}
											</ul>
										</>
									)}
								</div>
							);
						})
					)}

					{/* Template preview */}
					{template && (
						<div className="border border-warm-200 rounded-xl overflow-hidden">
							<button
								type="button"
								onClick={() => setPreviewOpen((v) => !v)}
								className="w-full flex items-center gap-3 px-4 py-3 bg-warm-50 hover:bg-warm-100 transition-colors"
							>
								<Mail size={15} className="text-warm-500 flex-shrink-0" aria-hidden="true" />
								<div className="flex-1 text-left">
									<div className="text-sm font-semibold text-warm-900">Preview email</div>
									<div className="text-[11.5px] text-warm-500 mt-0.5">
										Based on the &quot;litter_notified&quot; template
									</div>
								</div>
								{previewOpen ? (
									<ChevronUp size={15} className="text-warm-400" aria-hidden="true" />
								) : (
									<ChevronDown size={15} className="text-warm-400" aria-hidden="true" />
								)}
							</button>
							{previewOpen && (
								<div className="p-4 bg-white border-t border-warm-100 space-y-2">
									<div>
										<div className="text-[10.5px] font-semibold uppercase tracking-wider text-warm-400 mb-1">Subject</div>
										<div className="text-sm text-warm-900">{interpolate(template.subject, previewVars)}</div>
									</div>
									<div>
										<div className="text-[10.5px] font-semibold uppercase tracking-wider text-warm-400 mb-1">Body</div>
										<pre className="text-[12.5px] text-warm-700 whitespace-pre-wrap font-sans leading-relaxed">
											{interpolate(template.body, previewVars)}
										</pre>
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-4 border-t border-warm-100 bg-warm-50/50">
					<button
						type="button"
						onClick={onClose}
						disabled={sending}
						className="px-4 py-2 text-sm text-warm-600 hover:text-warm-900 font-medium disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={sending || selectedCount === 0}
						className="px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{ctaLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
