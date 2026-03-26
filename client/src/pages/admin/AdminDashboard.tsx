import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, PageHeader } from '@/components/ui';
import type { Dog, Litter, Client } from '@paw-registry/shared';

export function AdminDashboard() {
	const [counts, setCounts] = useState({ dogs: 0, litters: 0, clients: 0, enquiries: 0 });
	const [recentEnquiries, setRecentEnquiries] = useState<Pick<Client, 'id' | 'firstName' | 'lastName' | 'email' | 'createdAt'>[]>([]);

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
			setRecentEnquiries(
				clients
					.filter((c) => c.stage === 'enquired')
					.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
					.slice(0, 5),
			);
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
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

			<div>
				<p className="text-sm font-medium text-stone-500 mb-3">Quick Actions</p>
				<div className="flex flex-wrap gap-3">
					{[
						{ label: '+ Add Dog', to: '/admin/dogs/new' },
						{ label: '+ Create Litter', to: '/admin/litters' },
						{ label: 'View Waiting List', to: '/admin/clients' },
						{ label: 'Post Update', to: '/admin/updates' },
					].map(({ label, to }) => (
						<Link
							key={to}
							to={to}
							className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
						>
							{label}
						</Link>
					))}
				</div>
			</div>

			<div className="mt-8">
				<p className="text-sm font-medium text-stone-500 mb-3">Recent Enquiries</p>
				<Card>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-stone-100">
								<th className="text-left px-4 py-2.5 text-xs font-medium text-stone-400 uppercase tracking-wide">Name</th>
								<th className="text-left px-4 py-2.5 text-xs font-medium text-stone-400 uppercase tracking-wide">Email</th>
								<th className="text-left px-4 py-2.5 text-xs font-medium text-stone-400 uppercase tracking-wide">Applied</th>
								<th className="px-4 py-2.5" />
							</tr>
						</thead>
						<tbody>
							{recentEnquiries.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-stone-400 text-sm">
										No pending enquiries
									</td>
								</tr>
							) : (
								recentEnquiries.map((client) => (
									<tr key={client.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
										<td className="px-4 py-3 font-medium text-stone-900">
											{client.firstName} {client.lastName}
										</td>
										<td className="px-4 py-3 text-stone-500">{client.email}</td>
										<td className="px-4 py-3 text-stone-400 whitespace-nowrap">
											{new Date(client.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
										</td>
										<td className="px-4 py-3 text-right">
											<Link to={`/admin/clients/${client.id}`} className="text-brand-600 hover:underline">
												Review →
											</Link>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</Card>
			</div>
		</div>
	);
}
