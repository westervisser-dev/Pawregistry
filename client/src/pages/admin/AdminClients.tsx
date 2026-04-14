import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, PageHeader } from '@/components/ui';
import type { Client, ClientStage } from '@paw-registry/shared';
import { ClientDndTable, ClientReadTable, type ClientAction } from './_shared';
import { usePageTitle } from '@/hooks/usePageTitle';

const PRE_WAITLIST_STAGES: ClientStage[] = ['enquired', 'approved', 'rejected'];

export function AdminClients() {
	const [clients, setClients] = useState<Client[]>([]);
	const [stage, setStage] = useState('');
	const [loading, setLoading] = useState(true);
	const [actionMap, setActionMap] = useState<Record<string, ClientAction>>({});

	usePageTitle('Clients');

	const load = (s: string) => {
		setLoading(true);
		api.clients.admin.get({ query: s ? { stage: s as Client['stage'] } : {} }).then(({ data }) => {
			if (data) setClients((data as Client[]).sort((a, b) => a.priority - b.priority));
			setLoading(false);
		});
	};

	// Fetch attention flags once on mount — stage filter doesn't affect this
	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.clients.admin as any).attention.get().then(({ data }: { data: { docsCompleteIds: string[] } | null }) => {
			if (!data) return;
			const map: Record<string, ClientAction> = {};
			for (const id of data.docsCompleteIds) map[id] = 'review_documents';
			setActionMap(map);
		});
	}, []);

	useEffect(() => { load(''); }, []);

	const stages: Array<Client['stage'] | ''> = [
		'', 'enquired', 'approved', 'rejected',
		'waitlisted', 'match_requested', 'matched', 'matched_paid',
	];

	const stageLabels: Record<string, string> = {
		'': 'All',
		enquired: 'Enquired',
		approved: 'Approved',
		rejected: 'Rejected',
		waitlisted: 'Waitlisted',
		match_requested: 'Match Requested',
		matched: 'Matched',
		matched_paid: 'Matched & Paid',
	};

	// Derive per-client action badge — priority: review_documents > review_application
	const getAction = (c: Client): ClientAction | undefined => {
		if (actionMap[c.id] === 'review_documents') return 'review_documents';
		if (c.stage === 'enquired') return 'review_application';
		return undefined;
	};

	const computedActionMap = Object.fromEntries(
		clients.flatMap((c) => {
			const a = getAction(c);
			return a ? [[c.id, a]] : [];
		}),
	) as Record<string, ClientAction>;

	// Active queue: all stages from waitlisted through matched (position persists until matched_paid)
	const ACTIVE_QUEUE_STAGES = ['waitlisted', 'match_requested', 'matched'];
	const queueClients = clients.filter((c) => (ACTIVE_QUEUE_STAGES as string[]).includes(c.stage));
	const depositQueueClients = queueClients
		.filter((c) => c.depositStatus === 'paid')
		.sort((a, b) => {
			// R5000 before R500
			if (a.depositTier !== b.depositTier) {
				if (a.depositTier === 'r5000') return -1;
				if (b.depositTier === 'r5000') return 1;
			}
			// Within same tier: oldest depositChosenAt first
			const aTime = a.depositChosenAt ? new Date(a.depositChosenAt).getTime() : new Date(a.createdAt).getTime();
			const bTime = b.depositChosenAt ? new Date(b.depositChosenAt).getTime() : new Date(b.createdAt).getTime();
			return aTime - bTime;
		});
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

	return (
		<div className="p-4 md:p-8">
			<PageHeader title="Clients" subtitle="All applications and client relationships." />

			{/* Mobile: dropdown */}
			<div className="md:hidden relative z-10 mb-6">
				<select
					className="w-full px-3 py-2.5 rounded-lg border border-warm-200 bg-white text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none"
					value={stage}
					onChange={(e) => { const s = e.target.value; setStage(s); load(s); }}
				>
					{stages.map((s) => (
						<option key={s || 'all'} value={s}>{stageLabels[s]}</option>
					))}
				</select>
			</div>
			{/* Desktop: pills */}
			<div className="hidden md:flex gap-2 mb-6 flex-wrap">
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

			{loading ? <LoadingPage /> : (
				<div className="flex flex-col gap-8">
					<ClientDndTable
						title="Waitlisted — Deposit"
						clients={depositQueueClients}
						onReorder={handleDepositReorder}
						actionMap={computedActionMap}
					/>
					<ClientDndTable
						title="Waitlisted — No Deposit"
						clients={noDepositQueueClients}
						onReorder={handleNoDepositReorder}
						startIndex={depositQueueClients.length}
						actionMap={computedActionMap}
					/>
					<ClientReadTable
						title="Not Yet Waitlisted"
						clients={notYetWaitlistedClients}
						actionMap={computedActionMap}
					/>
					<ClientReadTable
						title="Completed"
						clients={completedClients}
						actionMap={computedActionMap}
					/>
				</div>
			)}
		</div>
	);
}
