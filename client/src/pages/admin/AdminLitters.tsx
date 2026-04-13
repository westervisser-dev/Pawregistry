import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, LitterStatusBadge, EmptyState } from '@/components/ui';
import type { Litter } from '@paw-registry/shared';
import { AdminTable } from './_shared';

export function AdminLitters() {
	const [litters, setLitters] = useState<Litter[]>([]);
	const [loading, setLoading] = useState(true);
	const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});

	useEffect(() => {
		api.litters.admin.all.get().then(({ data }) => {
			if (data) {
				const statusOrder: Record<string, number> = { planned: 0, available: 1, booked: 2, completed: 3 };
				setLitters((data as Litter[]).sort((a, b) => {
					const sd = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
					return sd !== 0 ? sd : a.name.localeCompare(b.name);
				}));
			}
			setLoading(false);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters.admin as any)['matching-counts'].get().then(({ data }: { data: Record<string, number> | null }) => {
			if (data) setMatchCounts(data);
		});
	}, []);

	return (
		<div className="p-4 md:p-8">
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
					<AdminTable headers={['Name', 'Status', 'Matches', { label: 'Public ?', hideMobile: true }, '']}>
						{litters.map((litter) => (
							<tr key={litter.id} className="border-b border-black/[0.05] hover:bg-warm-50">
								<td className="py-3 px-4">
									<p className="font-medium text-warm-900">{litter.name}</p>
								</td>
								<td className="py-3 px-4"><LitterStatusBadge status={litter.status} /></td>
								<td className="py-3 px-4">
									{matchCounts[litter.id] != null ? (
										matchCounts[litter.id] > 0 ? (
											<span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
												👥 {matchCounts[litter.id]}
											</span>
										) : (
											<span className="text-xs text-warm-300">0</span>
										)
									) : (
										<span className="text-xs text-warm-300">—</span>
									)}
								</td>
								<td className="hidden md:table-cell py-3 px-4">
									{litter.isPublic
										? <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Yes</span>
										: <span className="inline-flex items-center text-xs font-medium text-warm-500 bg-warm-100 px-2 py-0.5 rounded-full">No</span>
									}
								</td>
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
