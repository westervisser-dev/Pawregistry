import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, StageBadge, useFocusTrap } from '@/components/ui';
import type { Client } from '@paw-registry/shared';
import { BREEDS, BREED_SIZES } from '@paw-registry/shared';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
	arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Shared admin table wrapper ───────────────────────────────────────────────

type TableHeader = string | { label: string; hideMobile?: boolean; mobileLabel?: string };

export function AdminTable({ headers, children }: { headers: TableHeader[]; children: React.ReactNode }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-black/[0.06]">
						{headers.map((h) => {
							const label = typeof h === 'string' ? h : h.label;
							const hide = typeof h === 'object' && h.hideMobile;
							const mobileLabel = typeof h === 'object' ? h.mobileLabel : undefined;
							return (
								<th key={label} className={`text-left py-3 px-2 md:px-4 text-[10.5px] font-medium text-warm-400 uppercase tracking-[0.06em]${hide ? ' hidden md:table-cell' : ''}`}>
									{mobileLabel ? (
										<>
											<span className="md:hidden">{mobileLabel}</span>
											<span className="hidden md:inline">{label}</span>
										</>
									) : label}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>{children}</tbody>
			</table>
		</div>
	);
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

export function DeleteModal({
	open,
	entityLabel,
	onClose,
	onConfirm,
	deleting,
	blockingRecords,
}: {
	open: boolean;
	entityLabel: string;
	onClose: () => void;
	onConfirm: () => void;
	deleting: boolean;
	blockingRecords: string[] | null;
}) {
	const dialogRef = useFocusTrap(open, onClose);
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
			<div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
				{blockingRecords ? (
					<>
						<h2 id="modal-title" className="font-serif text-lg text-warm-900 mb-2">Cannot delete</h2>
						<p className="text-sm text-warm-600 mb-3">
							<strong>{entityLabel}</strong> is still assigned to the following record{blockingRecords.length !== 1 ? 's' : ''}.
							Reassign or remove them first:
						</p>
						<ul className="mb-5 space-y-1">
							{blockingRecords.map((r) => (
								<li key={r} className="text-sm font-medium text-warm-800 bg-warm-50 border border-warm-200 rounded-lg px-3 py-2">
									{r}
								</li>
							))}
						</ul>
						<button onClick={onClose} className="w-full px-4 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm font-medium rounded-lg transition-colors">
							Got it
						</button>
					</>
				) : (
					<>
						<h2 id="modal-title" className="font-serif text-lg text-warm-900 mb-2">Delete {entityLabel}?</h2>
						<p className="text-sm text-warm-500 mb-6">This action cannot be undone.</p>
						<div className="flex gap-3">
							<button onClick={onClose} className="flex-1 px-4 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm font-medium rounded-lg transition-colors">
								Cancel
							</button>
							<button
								onClick={onConfirm}
								disabled={deleting}
								className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
							>
								{deleting ? 'Deleting…' : 'Delete'}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

// ─── Application view helpers ─────────────────────────────────────────────────

export function formatBreedSize(raw: string | null | undefined): { breed: string; size: string | null } | null {
	if (!raw) return null;
	const [breedRaw, sizeRaw] = raw.split(' - ');
	return {
		breed: BREEDS.find((b) => b.value === breedRaw)?.label ?? breedRaw,
		size: sizeRaw ? (BREED_SIZES[breedRaw]?.find((s) => s.value === sizeRaw)?.label ?? sizeRaw) : null,
	};
}

// ─── Action badge ─────────────────────────────────────────────────────────────

export type ClientAction = 'review_application' | 'review_documents' | 'confirm_deposit' | 'confirm_payment';

const ACTION_CONFIG: Record<ClientAction, { label: string; bg: string; text: string; border: string }> = {
	review_application: { label: 'Review application', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
	review_documents:   { label: 'Review documents',   bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200'  },
	confirm_deposit:    { label: 'Confirm deposit',     bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
	confirm_payment:    { label: 'Confirm payment',     bg: 'bg-violet-50',text: 'text-violet-700',border: 'border-violet-200'},
};

export function ActionBadge({ action }: { action: ClientAction }) {
	const cfg = ACTION_CONFIG[action];
	return (
		<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} whitespace-nowrap`}>
			<span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
			{cfg.label}
		</span>
	);
}

// ─── Deposit status inline select ────────────────────────────────────────────

const DEPOSIT_TIER_LABELS: Record<string, { label: string; cls: string }> = {
	r5000: { label: 'R5,000', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
	r500:  { label: 'R500',   cls: 'bg-blue-50 text-blue-700 border-blue-200'   },
};

export function DepositStatusSelect({ client, onUpdate }: { client: Client; onUpdate: (c: Client) => void }) {
	const [saving, setSaving] = useState(false);

	const handleChange = async (value: string) => {
		setSaving(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.clients.admin({ id: client.id }) as any).patch({ depositStatus: value });
		if (data) onUpdate(data as Client);
		setSaving(false);
	};

	const cls =
		client.depositStatus === 'paid'
			? 'bg-green-50 text-green-700 border-green-200'
			: client.depositStatus === 'pending'
			? 'bg-amber-50 text-amber-700 border-amber-200'
			: 'bg-warm-50 text-warm-500 border-warm-200';

	const tier = client.depositTier ? DEPOSIT_TIER_LABELS[client.depositTier] : null;

	return (
		<div className="flex items-center gap-1.5 flex-wrap justify-end">
			{!!tier && (
				<span className={`text-xs font-medium px-2 py-1 rounded-full border ${tier.cls}`} title="Deposit tier selected at application">
					{tier.label}
				</span>
			)}
			<select
				value={client.depositStatus}
				onChange={(e) => handleChange(e.target.value)}
				disabled={saving}
				className={`text-xs font-medium px-2 py-1 rounded-full border appearance-none cursor-pointer disabled:opacity-50 max-w-[90px] md:max-w-none ${cls}`}
			>
				<option value="none">None</option>
				<option value="pending">Pending</option>
				<option value="paid">Paid</option>
			</select>
		</div>
	);
}

// ─── Sortable client row ──────────────────────────────────────────────────────

export function SortableClientRow({ client, index, onDepositUpdate, action }: {
	client: Client;
	index: number;
	onDepositUpdate: (c: Client) => void;
	action?: ClientAction;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: client.id });
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isDragging ? 1 : undefined,
	};

	const pbs = (client.applicationData as unknown as Record<string, unknown>)?.preferredBreedSize as string | undefined;
	const parsed = formatBreedSize(pbs);

	return (
		<tr ref={setNodeRef} style={style} className="border-b border-black/[0.05] hover:bg-warm-50 bg-white transition-colors">
			<td className="py-3 px-2 md:px-4 text-warm-400 text-xs font-mono w-8 tabular-nums">{index + 1}</td>
			<td className="py-2 px-1 md:px-3 w-8">
				<button
					{...attributes}
					{...listeners}
					style={{ touchAction: 'none' }}
					className="cursor-grab active:cursor-grabbing text-warm-300 hover:text-warm-500 flex items-center justify-center min-h-[44px] min-w-[44px]"
					tabIndex={-1}
				>
					<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
						<circle cx="2.5" cy="2.5" r="1.5" />
						<circle cx="7.5" cy="2.5" r="1.5" />
						<circle cx="2.5" cy="7" r="1.5" />
						<circle cx="7.5" cy="7" r="1.5" />
						<circle cx="2.5" cy="11.5" r="1.5" />
						<circle cx="7.5" cy="11.5" r="1.5" />
					</svg>
				</button>
			</td>
			<td className="py-3 px-2 md:px-4">
				<p className="font-medium text-warm-900">{client.firstName} {client.lastName}</p>
				<p className="text-xs text-warm-400">{client.email}</p>
				{!!action && <div className="mt-1"><ActionBadge action={action} /></div>}
				{parsed && (
					<p className="text-xs text-brand-600 mt-0.5 md:hidden">🐾 {parsed.breed}{parsed.size ? ` · ${parsed.size}` : ''}</p>
				)}
			</td>
			<td className="hidden md:table-cell py-3 px-4">
				{parsed ? (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-full text-xs font-semibold text-brand-700 whitespace-nowrap">
						🐾 {parsed.breed}{parsed.size ? ` · ${parsed.size}` : ''}
					</span>
				) : <span className="text-warm-300 text-xs">—</span>}
			</td>
			<td className="hidden md:table-cell py-3 px-4"><StageBadge stage={client.stage} /></td>
			<td className="py-3 px-2 md:px-4">
				<div className="md:hidden"><StageBadge stage={client.stage} /></div>
				<div className="hidden md:block"><DepositStatusSelect client={client} onUpdate={onDepositUpdate} /></div>
			</td>
			<td className="hidden md:table-cell py-3 px-4 text-warm-400 text-xs whitespace-nowrap">
				{new Date(client.createdAt).toLocaleDateString()}
			</td>
			<td className="py-3 px-2 md:px-4">
				<Link to={`/admin/clients/${client.id}`} className="text-sm text-brand-600 hover:underline">
					View →
				</Link>
			</td>
		</tr>
	);
}

// ─── Client DnD table ─────────────────────────────────────────────────────────

export function ClientDndTable({ title, clients, onReorder, onDepositUpdate, startIndex = 0, actionMap = {} }: {
	title: string;
	clients: Client[];
	onReorder: (newOrder: Client[]) => void;
	onDepositUpdate: (c: Client) => void;
	startIndex?: number;
	actionMap?: Record<string, ClientAction>;
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIdx = clients.findIndex((c) => c.id === active.id);
		const newIdx = clients.findIndex((c) => c.id === over.id);
		onReorder(arrayMove(clients, oldIdx, newIdx));
	};

	return (
		<div>
			<div className="flex items-center gap-2 mb-3">
				<span className="text-sm font-semibold text-warm-700">{title}</span>
				<span className="text-xs text-warm-400 bg-warm-200 px-2 py-0.5 rounded-full">{clients.length}</span>
			</div>
			<Card>
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<AdminTable headers={['#', '', 'Name', { label: 'Preference', hideMobile: true }, { label: 'Stage', hideMobile: true }, { label: 'Deposit Status', mobileLabel: 'Stage' }, { label: 'Applied', hideMobile: true }, '']}>
						<SortableContext items={clients.map((c) => c.id)} strategy={verticalListSortingStrategy}>
							{clients.map((client, i) => (
								<SortableClientRow
									key={client.id}
									client={client}
									index={startIndex + i}
									onDepositUpdate={onDepositUpdate}
									action={actionMap[client.id]}
								/>
							))}
							{clients.length === 0 && (
								<tr>
									<td colSpan={8} className="py-3 px-4 text-sm text-warm-400 text-center">
										👥 No clients
									</td>
								</tr>
							)}
						</SortableContext>
					</AdminTable>
				</DndContext>
			</Card>
		</div>
	);
}

// ─── Plain read-only client table (no DnD) ───────────────────────────────────

export function ClientReadTable({ title, clients, onDepositUpdate, actionMap = {} }: {
	title: string;
	clients: Client[];
	onDepositUpdate: (c: Client) => void;
	actionMap?: Record<string, ClientAction>;
}) {
	const pbs = (c: Client) =>
		(c.applicationData as unknown as Record<string, unknown>)?.preferredBreedSize as string | undefined;

	return (
		<div>
			<div className="flex items-center gap-2 mb-3">
				<span className="text-sm font-semibold text-warm-700">{title}</span>
				<span className="text-xs text-warm-400 bg-warm-200 px-2 py-0.5 rounded-full">{clients.length}</span>
			</div>
			<Card>
				<AdminTable headers={['Name', { label: 'Preference', hideMobile: true }, { label: 'Stage', hideMobile: true }, { label: 'Deposit', mobileLabel: 'Stage' }, { label: 'Applied', hideMobile: true }, '']}>
					{clients.map((client) => {
						const parsed = formatBreedSize(pbs(client));
						const action = actionMap[client.id];
						return (
							<tr key={client.id} className="border-b border-black/[0.05] hover:bg-warm-50 bg-white transition-colors">
								<td className="py-3 px-2 md:px-4">
									<p className="font-medium text-warm-900">{client.firstName} {client.lastName}</p>
									<p className="text-xs text-warm-400">{client.email}</p>
									{!!action && <div className="mt-1"><ActionBadge action={action} /></div>}
									{parsed && (
										<p className="text-xs text-brand-600 mt-0.5 md:hidden">🐾 {parsed.breed}{parsed.size ? ` · ${parsed.size}` : ''}</p>
									)}
								</td>
								<td className="hidden md:table-cell py-3 px-4">
									{parsed ? (
										<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-full text-xs font-semibold text-brand-700 whitespace-nowrap">
											🐾 {parsed.breed}{parsed.size ? ` · ${parsed.size}` : ''}
										</span>
									) : <span className="text-warm-300 text-xs">—</span>}
								</td>
								<td className="hidden md:table-cell py-3 px-4"><StageBadge stage={client.stage} /></td>
								<td className="py-3 px-2 md:px-4">
									<div className="md:hidden"><StageBadge stage={client.stage} /></div>
									<div className="hidden md:block">
										{client.depositStatus === 'paid' ? (
											<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Deposit — Paid</span>
										) : client.depositStatus === 'pending' ? (
											<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Deposit — Selected</span>
										) : (
											<span className="text-warm-400 text-xs">No Deposit</span>
										)}
									</div>
								</td>
								<td className="hidden md:table-cell py-3 px-4 text-warm-400 text-xs whitespace-nowrap">
									{new Date(client.createdAt).toLocaleDateString()}
								</td>
								<td className="py-3 px-2 md:px-4">
									<Link to={`/admin/clients/${client.id}`} className="text-sm text-brand-600 hover:underline">
										View →
									</Link>
								</td>
							</tr>
						);
					})}
					{clients.length === 0 && (
						<tr>
							<td colSpan={6} className="py-3 px-4 text-sm text-warm-400 text-center">
								👥 No clients
							</td>
						</tr>
					)}
				</AdminTable>
			</Card>
		</div>
	);
}
