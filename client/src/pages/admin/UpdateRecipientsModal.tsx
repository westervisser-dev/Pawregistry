import { useEffect, useMemo, useState } from 'react';
import { X, ChevronDown, ChevronUp, Mail, Users, Sparkles, UserCheck } from 'lucide-react';
import { useFocusTrap } from '@/components/ui';

export type RecipientCandidate = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	city: string | null;
	depositStatus: string;
	waitlistPosition: number | null;
	segments: ('interested' | 'matched' | 'direct' | 'notified')[];
	optedOut: boolean;
};

const SEGMENT_META = {
	interested: {
		label: 'Expressed interest',
		description: 'Clients who ticked "Interested" on this litter.',
		Icon: Sparkles,
	},
	matched: {
		label: 'Puppy-matched',
		description: 'Clients matched to a specific puppy in this litter.',
		Icon: UserCheck,
	},
	direct: {
		label: 'Directly assigned',
		description: 'Clients whose account is linked to this litter.',
		Icon: Users,
	},
	notified: {
		label: 'Launch-invited',
		description: 'Clients invited when you opened this litter for reservations.',
		Icon: Mail,
	},
} as const;

const SEGMENT_ORDER: RecipientCandidate['segments'][number][] = ['matched', 'direct', 'interested', 'notified'];

export function UpdateRecipientsModal({
	open,
	litterName,
	candidates,
	initialSelected,
	sendEmail,
	onClose,
	onConfirm,
}: {
	open: boolean;
	litterName: string;
	candidates: RecipientCandidate[];
	initialSelected: Set<string>;
	sendEmail: boolean;
	onClose: () => void;
	onConfirm: (selectedIds: Set<string>) => void;
}) {
	const dialogRef = useFocusTrap(open, onClose);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelected);
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (open) {
			setSelectedIds(new Set(initialSelected));
			setCollapsed({});
		}
	}, [open, initialSelected]);

	// Assign each candidate to exactly one segment (by highest-priority order)
	const segments = useMemo(() => {
		const buckets: Record<string, RecipientCandidate[]> = {
			matched: [], direct: [], interested: [], notified: [],
		};
		const placed = new Set<string>();
		for (const key of SEGMENT_ORDER) {
			for (const c of candidates) {
				if (placed.has(c.id)) continue;
				if (c.segments.includes(key)) {
					buckets[key].push(c);
					placed.add(c.id);
				}
			}
		}
		return SEGMENT_ORDER
			.map((key) => ({ key, ...SEGMENT_META[key], clients: buckets[key] }))
			.filter((s) => s.clients.length > 0);
	}, [candidates]);

	const total = candidates.length;
	const selectedCount = selectedIds.size;

	const toggleClient = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	};

	const selectAllInSegment = (clients: RecipientCandidate[]) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			clients.forEach((c) => { if (!c.optedOut) next.add(c.id); });
			return next;
		});
	};

	const clearSegment = (clients: RecipientCandidate[]) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			clients.forEach((c) => next.delete(c.id));
			return next;
		});
	};

	const selectAll = () => {
		const next = new Set<string>();
		candidates.forEach((c) => { if (!c.optedOut) next.add(c.id); });
		setSelectedIds(next);
	};

	const clearAll = () => setSelectedIds(new Set());

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="recipients-modal-title"
				className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
			>
				<div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-warm-100">
					<div className="min-w-0">
						<h2 id="recipients-modal-title" className="font-serif text-lg text-warm-900 leading-tight truncate">
							Who will see this update?
						</h2>
						<p className="mt-1.5 text-sm text-warm-600">
							{litterName
								? 'Selected clients will see this update in their portal' + (sendEmail ? ' and receive the email.' : '.')
								: 'All portal clients will see this update.'}
						</p>
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

				<div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-warm-100 bg-warm-50/60">
					<span className="text-xs text-warm-600 tabular-nums">
						{selectedCount} of {total} selected
					</span>
					<div className="flex items-center gap-3">
						<button type="button" onClick={clearAll} className="text-[11.5px] font-medium text-warm-500 hover:text-warm-700">
							Clear all
						</button>
						<button type="button" onClick={selectAll} className="text-[11.5px] font-medium text-brand-500 hover:text-brand-600">
							Select all
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-6 space-y-3">
					{segments.length === 0 ? (
						<div className="text-sm text-warm-500 text-center py-10">
							No clients are associated with this litter yet.
						</div>
					) : (
						segments.map((segment) => {
							const isCollapsed = !!collapsed[segment.key];
							const segSelected = segment.clients.filter((c) => selectedIds.has(c.id)).length;
							const Icon = segment.Icon;

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
										{isCollapsed
											? <ChevronDown size={15} className="text-warm-400" aria-hidden="true" />
											: <ChevronUp size={15} className="text-warm-400" aria-hidden="true" />}
									</button>

									{!isCollapsed && (
										<>
											<div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-warm-100 bg-white">
												{segSelected > 0 && (
													<button
														type="button"
														onClick={() => clearSegment(segment.clients)}
														className="text-[11px] text-warm-400 font-medium hover:text-warm-600"
													>
														Clear
													</button>
												)}
												<button
													type="button"
													onClick={() => selectAllInSegment(segment.clients)}
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
															<label className={'flex items-start gap-3 px-4 py-2.5 hover:bg-warm-50 transition-colors ' + (client.optedOut ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer')}>
																<input
																	type="checkbox"
																	checked={isChecked}
																	disabled={client.optedOut}
																	onChange={() => toggleClient(client.id)}
																	className="mt-[3px] w-4 h-4 accent-brand-500 flex-shrink-0"
																/>
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-2 flex-wrap">
																		<span className="text-sm font-medium text-warm-900">
																			{client.firstName} {client.lastName}
																		</span>
																		{client.waitlistPosition != null && (
																			<span className="text-[10.5px] text-warm-400 tabular-nums">
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
																		{client.optedOut && sendEmail && (
																			<span className="text-[10px] font-semibold px-1.5 py-[1px] rounded-full bg-warm-100 text-warm-600">
																				Opted out of email
																			</span>
																		)}
																	</div>
																	<div className="text-[11.5px] text-warm-500 mt-0.5 truncate">
																		{client.email}
																		{client.city && <span className="mx-1.5 text-warm-300">&middot;</span>}
																		{client.city}
																	</div>
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
				</div>

				<div className="flex items-center justify-end gap-3 p-4 border-t border-warm-100 bg-warm-50/50">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm text-warm-600 hover:text-warm-900 font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => onConfirm(selectedIds)}
						className="px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors"
					>
						Done &middot; {selectedCount} selected
					</button>
				</div>
			</div>
		</div>
	);
}
