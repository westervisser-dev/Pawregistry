import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, Badge, EmptyState } from '@/components/ui';
import type { Dog } from '@paw-registry/shared';
import { AdminTable } from './_shared';

export function AdminDogs() {
	const [dogs, setDogs] = useState<Dog[]>([]);
	const [loading, setLoading] = useState(true);
	const [toast, setToast] = useState('');
	const location = useLocation();

	useEffect(() => {
		setLoading(true);
		api.dogs.get({ query: {} }).then(({ data }) => {
			if (data) setDogs(data as Dog[]);
			setLoading(false);
		});
		if ((location.state as { toast?: string })?.toast) {
			setToast((location.state as { toast: string }).toast);
			const t = setTimeout(() => setToast(''), 3000);
			return () => clearTimeout(t);
		}
	}, [location.key]);

	return (
		<div className="p-8">
			{toast && (
				<div className="fixed bottom-6 right-6 z-50 bg-warm-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
					{toast}
				</div>
			)}
			<PageHeader
				title="Dogs"
				subtitle="Your breeding programme dogs."
				action={
					<Link to="/admin/dogs/new" className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600">
						+ Add Dog
					</Link>
				}
			/>
			{loading ? (
				<LoadingPage />
			) : (
				<Card>
					<AdminTable headers={['Dog', 'Breed', 'Sex', 'Colour', 'Status', '']}>
						{dogs.map((dog) => (
							<tr key={dog.id} className="border-b border-black/[0.05] hover:bg-warm-50">
								<td className="py-3 px-4">
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-full bg-warm-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
											{dog.profileImageUrl
												? <img src={dog.profileImageUrl} alt={dog.name} className="w-full h-full object-cover" />
												: <span>🐕</span>
											}
										</div>
										<div>
											<p className="font-medium text-warm-900">{dog.name}</p>
											{dog.registeredName && <p className="text-xs text-warm-400">{dog.registeredName}</p>}
										</div>
									</div>
								</td>
								<td className="py-3 px-4 text-warm-600">{dog.breed}</td>
								<td className="py-3 px-4">
									<Badge variant={dog.sex === 'male' ? 'blue' : 'purple'}>{dog.sex}</Badge>
								</td>
								<td className="py-3 px-4 text-warm-600">{dog.colour}</td>
								<td className="py-3 px-4">
									<Badge variant={dog.status === 'active' ? 'green' : 'default'}>{dog.status}</Badge>
								</td>
								<td className="py-3 px-4">
									<Link to={`/admin/dogs/${dog.id}`} className="text-sm text-brand-600 hover:underline">
										Edit →
									</Link>
								</td>
							</tr>
						))}
					</AdminTable>
					{dogs.length === 0 && <EmptyState icon="🐕" title="No dogs yet" description="Add your first dog to get started." />}
				</Card>
			)}
		</div>
	);
}
