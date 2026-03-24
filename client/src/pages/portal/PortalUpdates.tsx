import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, Badge } from '@/components/ui';
import type { Update } from '@paw-registry/shared';

export function PortalUpdates() {
	const [updates, setUpdates] = useState<Update[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		document.title = 'Updates — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		api.updates.my.get().then(({ data }) => {
			if (data) setUpdates(data as Update[]);
			setLoading(false);
		});
	}, []);

	if (loading) return <LoadingPage />;

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-stone-900">Puppy Updates</h1>
				<p className="text-stone-600 text-sm mt-1">Your puppy journal from us to you.</p>
			</div>

			{updates.length === 0 ? (
				<Card className="p-12 text-center">
					<p className="text-4xl mb-4" aria-hidden="true">📷</p>
					<p className="text-stone-600 font-medium">No updates yet</p>
					<p className="text-stone-400 text-sm mt-1">We'll post updates here as your puppy grows.</p>
				</Card>
			) : (
				<div className="flex flex-col gap-6">
					{updates.map((update) => (
						<Card key={update.id} className="overflow-hidden">
							{update.mediaUrls.length > 0 && (
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
									{update.mediaUrls.slice(0, 3).map((url, i) => (
										<div key={i} className="aspect-square bg-stone-100 overflow-hidden">
											<img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
										</div>
									))}
								</div>
							)}
							<div className="p-6">
								<div className="flex items-center gap-3 mb-2">
									{update.weekNumber && (
										<Badge variant="amber">Week {update.weekNumber}</Badge>
									)}
									<span className="text-xs text-stone-400">
										{update.publishedAt ? new Date(update.publishedAt).toLocaleDateString() : ''}
									</span>
								</div>
								<h2 className="font-serif font-bold text-stone-900 text-lg mb-2">{update.title}</h2>
								<p className="text-stone-600 text-sm leading-relaxed">{update.body}</p>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
