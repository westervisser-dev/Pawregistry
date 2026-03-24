import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, LitterStatusBadge, EmptyState } from '@/components/ui';
import type { Dog, Litter } from '@paw-registry/shared';
import { AdminTable } from './_shared';

export function AdminLitters() {
	const [litters, setLitters] = useState<Litter[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.litters.admin.all.get().then(({ data }) => {
			if (data) setLitters(data as Litter[]);
			setLoading(false);
		});
	}, []);

	return (
		<div className="p-8">
			<PageHeader
				title="Litters"
				action={
					<Link to="/admin/litters/new" className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600">
						+ New Litter
					</Link>
				}
			/>
			{loading ? <LoadingPage /> : (
				<Card>
					<AdminTable headers={['Name', 'Status', 'Sire × Dam', 'Whelp Date', 'Available', '']}>
						{litters.map((litter) => (
							<tr key={litter.id} className="border-b border-stone-100 hover:bg-stone-50">
								<td className="py-3 px-4 font-medium text-stone-900">{litter.name}</td>
								<td className="py-3 px-4"><LitterStatusBadge status={litter.status} /></td>
								<td className="py-3 px-4 text-stone-500 text-xs">{(litter as unknown as { sire: Dog; dam: Dog }).sire?.name ?? litter.sireId} × {(litter as unknown as { sire: Dog; dam: Dog }).dam?.name ?? litter.damId}</td>
								<td className="py-3 px-4 text-stone-600">{litter.whelpDate ? new Date(litter.whelpDate).toLocaleDateString('en-ZA') : '—'}</td>
								<td className="py-3 px-4 text-stone-600">{litter.availableCount ?? '—'}</td>
								<td className="py-3 px-4">
									<Link to={`/admin/litters/${litter.id}`} className="text-sm text-brand-600 hover:underline">Edit →</Link>
								</td>
							</tr>
						))}
					</AdminTable>
					{litters.length === 0 && <EmptyState icon="🐶" title="No litters yet" />}
				</Card>
			)}
		</div>
	);
}
