import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, PageHeader } from '@/components/ui';
import type { Client, ClientStage } from '@paw-registry/shared';
import { ClientDndTable, ClientReadTable } from './_shared';

const PRE_WAITLIST_STAGES: ClientStage[] = ['enquired', 'approved', 'rejected'];

export function AdminClients() {
	const [clients, setClients] = useState<Client[]>([]);
	const [stage, setStage] = useState('');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		document.title = 'Clients — Paw Registry Admin';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	const load = (s: string) => {
		setLoading(true);
		api.clients.admin.get({ query: s ? { stage: s as Client['stage'] } : {} }).then(({ data }) => {
			if (data) setClients((data as Client[]).sort((a, b) => a.priority - b.priority));
			setLoading(false);
		});
	};

	useEffect(() => { load(''); }, []);

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

	// Clients past the pre-waitlist stages live in the priority queues
	const queueClients = clients.filter((c) => !(PRE_WAITLIST_STAGES as string[]).includes(c.stage));
	const depositQueueClients = queueClients.filter((c) => c.depositStatus === 'pending' || c.depositStatus === 'paid');
	const noDepositQueueClients = queueClients.filter((c) => !c.depositStatus || c.depositStatus === 'none');
	const notYetWaitlistedClients = clients.filter((c) => (PRE_WAITLIST_STAGES as string[]).includes(c.stage));

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

	const handleDepositUpdate = (updated: Client) => {
		setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
	};

	return (
		<div className="p-8">
			<PageHeader title="Clients" subtitle="All applications and client relationships." />

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

			{loading ? <LoadingPage /> : (
				<div className="flex flex-col gap-8">
					<ClientDndTable
						title="Waitlisted — Deposit"
						clients={depositQueueClients}
						onReorder={handleDepositReorder}
						onDepositUpdate={handleDepositUpdate}
					/>
					<ClientDndTable
						title="Waitlisted — No Deposit"
						clients={noDepositQueueClients}
						onReorder={handleNoDepositReorder}
						onDepositUpdate={handleDepositUpdate}
						startIndex={depositQueueClients.length}
					/>
					<ClientReadTable
						title="Not Yet Waitlisted"
						clients={notYetWaitlistedClients}
						onDepositUpdate={handleDepositUpdate}
					/>
				</div>
			)}
		</div>
	);
}
