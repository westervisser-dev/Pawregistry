import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, PageHeader } from '@/components/ui';
import type { Client, ClientStage } from '@paw-registry/shared';
import { ClientDndTable, ClientReadTable, type ClientAction } from './_shared';

const PRE_WAITLIST_STAGES: ClientStage[] = ['enquired', 'approved', 'rejected'];

// Map action → the section anchor in the client detail page
const ACTION_HASH: Record<string, string> = {
	review_application: 'stage',
	review_documents:   'documents',
	confirm_deposit:    'deposit',
	confirm_payment:    'stage',
};

const ACTION_LABELS: Record<string, { title: string; subtitle: string; color: string }> = {
	review_application: {
		title: 'New applications to review',
		subtitle: 'These clients have submitted an application and are waiting for approval or rejection.',
		color: 'bg-amber-50 border-amber-200 text-amber-800',
	},
	review_documents: {
		title: 'Documents ready to review',
		subtitle: 'These clients have uploaded all required documents. Review them and move to waitlisted when satisfied.',
		color: 'bg-blue-50 border-blue-200 text-blue-800',
	},
	confirm_deposit: {
		title: 'Deposits to confirm',
		subtitle: 'These clients have requested a deposit. Mark as paid once payment is received.',
		color: 'bg-green-50 border-green-200 text-green-800',
	},
	confirm_payment: {
		title: 'Awaiting payment confirmation',
		subtitle: 'These clients have been matched with a puppy. Confirm payment to complete the process.',
		color: 'bg-violet-50 border-violet-200 text-violet-800',
	},
};

export function AdminClients() {
	const [searchParams, setSearchParams] = useSearchParams();
	const actionFilter = searchParams.get('action') as ClientAction | null;

	const [clients, setClients] = useState<Client[]>([]);
	const [stage, setStage] = useState('');
	const [loading, setLoading] = useState(true);
	const [actionMap, setActionMap] = useState<Record<string, ClientAction>>({});
	const [docsCompleteIds, setDocsCompleteIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		document.title = 'Clients — Paw Registry Admin';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	// Always load all clients so action filters can be applied client-side
	const load = (s: string) => {
		setLoading(true);
		api.clients.admin.get({ query: s ? { stage: s as Client['stage'] } : {} }).then(({ data }) => {
			if (data) setClients((data as Client[]).sort((a, b) => a.priority - b.priority));
			setLoading(false);
		});
	};

	// Fetch attention flags once on mount
	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.clients.admin as any).attention.get().then(({ data }: { data: { docsCompleteIds: string[] } | null }) => {
			if (!data) return;
			const ids = new Set<string>(data.docsCompleteIds);
			setDocsCompleteIds(ids);
			const map: Record<string, ClientAction> = {};
			for (const id of ids) map[id] = 'review_documents';
			setActionMap(map);
		});
	}, []);

	useEffect(() => { load(''); }, []);

	// When action filter is active, always ensure we have all clients loaded
	useEffect(() => {
		if (actionFilter) load('');
	}, [actionFilter]);

	const stages: Array<Client['stage'] | ''> = [
		'', 'enquired', 'approved', 'rejected',
		'waitlisted', 'placed', 'match_requested', 'matched', 'matched_paid',
	];

	const stageLabels: Record<string, string> = {
		'': 'All',
		enquired: 'Enquired',
		approved: 'Approved',
		rejected: 'Rejected',
		waitlisted: 'Waitlisted',
		placed: 'Placed',
		match_requested: 'Match Requested',
		matched: 'Matched',
		matched_paid: 'Matched & Paid',
	};

	// Derive per-client action badge — priority: confirm_payment > review_documents > confirm_deposit > review_application
	const getAction = (c: Client): ClientAction | undefined => {
		if (c.stage === 'matched') return 'confirm_payment';
		if (actionMap[c.id] === 'review_documents') return 'review_documents';
		if (c.depositStatus === 'pending') return 'confirm_deposit';
		if (c.stage === 'enquired') return 'review_application';
		return undefined;
	};

	const computedActionMap = Object.fromEntries(
		clients.flatMap((c) => {
			const a = getAction(c);
			return a ? [[c.id, a]] : [];
		}),
	) as Record<string, ClientAction>;

	// ── Action-filtered view ──────────────────────────────────────────────────
	const filteredClients = actionFilter
		? actionFilter === 'review_application' ? clients.filter((c) => c.stage === 'enquired')
		: actionFilter === 'review_documents'   ? clients.filter((c) => docsCompleteIds.has(c.id))
		: actionFilter === 'confirm_deposit'    ? clients.filter((c) => c.depositStatus === 'pending')
		: actionFilter === 'confirm_payment'    ? clients.filter((c) => c.stage === 'matched')
		: null
		: null;

	const handleDepositUpdate = (updated: Client) => {
		setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
	};

	// ── Normal sectioned view ─────────────────────────────────────────────────
	const ACTIVE_QUEUE_STAGES = ['waitlisted', 'placed', 'match_requested', 'matched'];
	const queueClients = clients.filter((c) => (ACTIVE_QUEUE_STAGES as string[]).includes(c.stage));
	const depositQueueClients = queueClients.filter((c) => c.depositStatus === 'pending' || c.depositStatus === 'paid');
	const noDepositQueueClients = queueClients.filter((c) => !c.depositStatus || c.depositStatus === 'none');
	const notYetWaitlistedClients = clients.filter((c) => (PRE_WAITLIST_STAGES as string[]).includes(c.stage));
	const completedClients = clients.filter((c) => c.stage === 'matched_paid');

	const handleDepositReorder = async (newOrder: Client[]) => {
		const waitlistOnly = [...newOrder, ...noDepositQueueClients];
		setClients([...waitlistOnly, ...notYetWaitlistedClients]);
		await api.clients.admin.waitlist.reorder.patch({
			order: waitlistOnly.map((c, i) => ({ id: c.id, priority: (i + 1) * 10 })),
		});
	};

	const handleNoDepositReorder = async (newOrder: Client[]) => {
		const waitlistOnly = [...depositQueueClients, ...newOrder];
		setClients([...waitlistOnly, ...notYetWaitlistedClients]);
		await api.clients.admin.waitlist.reorder.patch({
			order: waitlistOnly.map((c, i) => ({ id: c.id, priority: (i + 1) * 10 })),
		});
	};

	const actionLabel = actionFilter ? ACTION_LABELS[actionFilter] : null;

	return (
		<div className="p-8">
			<PageHeader title="Clients" subtitle="All applications and client relationships." />

			{/* ── Action filter banner ────────────────────────────────── */}
			{actionLabel && (
				<div className={`mb-6 flex items-start justify-between gap-4 rounded-xl border px-5 py-4 ${actionLabel.color}`}>
					<div>
						<p className="text-sm font-semibold">{actionLabel.title}</p>
						<p className="text-xs mt-0.5 opacity-80">{actionLabel.subtitle}</p>
					</div>
					<button
						onClick={() => setSearchParams({})}
						className="shrink-0 text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity mt-0.5"
					>
						← All clients
					</button>
				</div>
			)}

			{/* ── Stage filter tabs — hidden in action filter mode ───── */}
			{!actionFilter && (
				<div className="flex gap-2 mb-6 flex-wrap">
					{stages.map((s) => (
						<button
							key={s || 'all'}
							onClick={() => { setStage(s); load(s); }}
							className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
								stage === s ? 'bg-brand-500 text-white' : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
							}`}
						>
							{stageLabels[s]}
						</button>
					))}
				</div>
			)}

			{loading ? <LoadingPage /> : filteredClients ? (
				/* ── Focused filtered list ────────────────────────────── */
				<ClientReadTable
					title={`${filteredClients.length} ${filteredClients.length === 1 ? 'client' : 'clients'}`}
					clients={filteredClients}
					onDepositUpdate={handleDepositUpdate}
					actionMap={computedActionMap}
					detailHash={actionFilter ? ACTION_HASH[actionFilter] : undefined}
				/>
			) : (
				/* ── Normal sectioned view ────────────────────────────── */
				<div className="flex flex-col gap-8">
					<ClientDndTable
						title="Waitlisted — Deposit"
						clients={depositQueueClients}
						onReorder={handleDepositReorder}
						onDepositUpdate={handleDepositUpdate}
						actionMap={computedActionMap}
					/>
					<ClientDndTable
						title="Waitlisted — No Deposit"
						clients={noDepositQueueClients}
						onReorder={handleNoDepositReorder}
						onDepositUpdate={handleDepositUpdate}
						startIndex={depositQueueClients.length}
						actionMap={computedActionMap}
					/>
					<ClientReadTable
						title="Not Yet Waitlisted"
						clients={notYetWaitlistedClients}
						onDepositUpdate={handleDepositUpdate}
						actionMap={computedActionMap}
					/>
					<ClientReadTable
						title="Completed"
						clients={completedClients}
						onDepositUpdate={handleDepositUpdate}
						actionMap={computedActionMap}
					/>
				</div>
			)}
		</div>
	);
}
