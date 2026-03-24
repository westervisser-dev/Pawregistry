import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, StageBadge } from '@/components/ui';
import type { Client } from '@paw-registry/shared';

export function PortalDashboard() {
	const [client, setClient] = useState<Client | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		document.title = 'Dashboard — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		api.clients.me.get().then(({ data }) => {
			if (data) setClient(data as Client);
			setLoading(false);
		});
	}, []);

	if (loading) return <LoadingPage />;
	if (!client) return <div className="text-stone-500">No client record linked to your account.</div>;

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-stone-900">
					Welcome back, {client.firstName} 👋
				</h1>
				<p className="text-stone-600 text-sm mt-1">Here's the latest on your puppy journey.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<Card className="p-5">
					<p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Application Stage</p>
					<div className="mt-2"><StageBadge stage={client.stage} /></div>
				</Card>
				{client.puppyId && (
					<Card className="p-5">
						<p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Your Puppy</p>
						<p className="font-medium text-stone-900 mt-1">🐶 Matched</p>
					</Card>
				)}
				<Card className="p-5">
					<p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Contact</p>
					<p className="font-medium text-stone-900 mt-1 text-sm">{client.email}</p>
				</Card>
			</div>

			<Card className="p-6">
				<h2 className="font-medium text-stone-900 mb-3">Your Details</h2>
				<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
					{[
						{ label: 'Name', value: `${client.firstName} ${client.lastName}` },
						{ label: 'Email', value: client.email },
						{ label: 'Phone', value: client.phone ?? '—' },
						{ label: 'City', value: client.city ?? '—' },
						{ label: 'Country', value: client.country },
					].map(({ label, value }) => (
						<div key={label}>
							<dt className="text-stone-400">{label}</dt>
							<dd className="text-stone-800">{value}</dd>
						</div>
					))}
				</dl>
			</Card>
		</div>
	);
}
