import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, PageHeader } from '@/components/ui';
import type { Dog, Litter, Client } from '@paw-registry/shared';

export function AdminDashboard() {
	const [counts, setCounts] = useState({ dogs: 0, litters: 0, clients: 0, enquiries: 0 });

	useEffect(() => {
		Promise.all([
			api.dogs.get({ query: {} }),
			api.litters.admin.all.get(),
			api.clients.admin.get({ query: {} }),
		]).then(([dogsRes, littersRes, clientsRes]) => {
			const dogs = (dogsRes.data as Dog[] | null) ?? [];
			const litters = (littersRes.data as Litter[] | null) ?? [];
			const clients = (clientsRes.data as Client[] | null) ?? [];
			setCounts({
				dogs: dogs.length,
				litters: litters.length,
				clients: clients.length,
				enquiries: clients.filter((c) => c.stage === 'enquired').length,
			});
		});
	}, []);

	const stats = [
		{ label: 'Active Dogs', value: counts.dogs, icon: '🐕', to: '/admin/dogs' },
		{ label: 'Litters', value: counts.litters, icon: '🐶', to: '/admin/litters' },
		{ label: 'Total Clients', value: counts.clients, icon: '👥', to: '/admin/clients' },
		{ label: 'New Enquiries', value: counts.enquiries, icon: '📥', to: '/admin/clients?stage=enquired' },
	];

	return (
		<div className="p-8">
			<PageHeader title="Dashboard" subtitle="Overview of your breeding programme." />
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
				{stats.map(({ label, value, icon, to }) => (
					<Link key={label} to={to}>
						<Card className="p-5 hover:shadow-sm transition-shadow">
							<div className="flex items-center justify-between mb-3">
								<span className="text-2xl">{icon}</span>
							</div>
							<p className="text-3xl font-bold text-stone-900">{value}</p>
							<p className="text-sm text-stone-400 mt-1">{label}</p>
						</Card>
					</Link>
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card className="p-5">
					<h2 className="font-medium text-stone-900 mb-4">Quick Actions</h2>
					<div className="flex flex-col gap-2">
						{[
							{ label: '+ Add a dog', to: '/admin/dogs' },
							{ label: '+ Create a litter', to: '/admin/litters' },
							{ label: '📋 View waiting list', to: '/admin/clients' },
							{ label: '📷 Post an update', to: '/admin/updates' },
						].map(({ label, to }) => (
							<Link
								key={to}
								to={to}
								className="px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
							>
								{label}
							</Link>
						))}
					</div>
				</Card>
			</div>
		</div>
	);
}
