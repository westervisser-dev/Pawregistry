import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, Badge } from '@/components/ui';
import type { UpdateWithLitter } from '@paw-registry/shared';

export function PortalUpdates() {
	const [updates, setUpdates] = useState<UpdateWithLitter[]>([]);
	const [optOuts, setOptOuts] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [togglingId, setTogglingId] = useState<string | null>(null);

	useEffect(() => {
		document.title = 'Updates — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		Promise.all([
			api.updates.my.get(),
			(api.updates.my as any)['opt-outs'].get(),
		]).then(([updatesRes, optOutsRes]) => {
			if (updatesRes.data) setUpdates(updatesRes.data as UpdateWithLitter[]);
			if (optOutsRes.data) setOptOuts(optOutsRes.data as string[]);
			setLoading(false);
		});
	}, []);

	const toggleOptOut = async (litterId: string) => {
		setTogglingId(litterId);
		const isOptedOut = optOuts.includes(litterId);

		if (isOptedOut) {
			await (api.updates.my as any)['opt-out'][litterId].delete();
			setOptOuts((prev) => prev.filter((id) => id !== litterId));
		} else {
			await (api.updates.my as any)['opt-out'][litterId].post({});
			setOptOuts((prev) => [...prev, litterId]);
		}

		setTogglingId(null);
	};

	if (loading) return <LoadingPage />;

	// Group updates by litterId. null = general.
	const grouped = new Map<string | null, UpdateWithLitter[]>();
	for (const update of updates) {
		const key = update.litterId ?? null;
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key)!.push(update);
	}

	// Sort: general first, then litters in order of most recent update
	const sections = [...grouped.entries()].sort(([a], [b]) => {
		if (a === null) return -1;
		if (b === null) return 1;
		return 0;
	});

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-warm-900">Puppy Updates</h1>
				<p className="text-warm-600 text-sm mt-1">Your puppy journal from us to you.</p>
			</div>

			{sections.length === 0 ? (
				<Card className="p-12 text-center" role="status">
					<p className="text-4xl mb-4" aria-hidden="true">📷</p>
					<p className="text-warm-600 font-medium">No updates yet</p>
					<p className="text-warm-400 text-sm mt-1">We'll post updates here as your puppy grows.</p>
				</Card>
			) : (
				<div className="flex flex-col gap-10">
					{sections.map(([litterId, sectionUpdates]) => {
						const litter = sectionUpdates[0]?.litter;
						const isOptedOut = !!litterId && optOuts.includes(litterId);

						return (
							<section key={litterId ?? 'general'} aria-label={litter?.name ?? 'General'}>
								{/* Section header */}
								<div className="flex items-center justify-between mb-4">
									<h2 className="font-serif font-bold text-warm-900 text-lg">
										{litter?.name ?? 'General'}
									</h2>
									{!!litterId && (
										<button
											onClick={() => toggleOptOut(litterId)}
											disabled={togglingId === litterId}
											className={[
												'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50',
												isOptedOut
													? 'border-warm-200 text-warm-400 hover:text-warm-600 hover:border-warm-300'
													: 'border-warm-200 text-warm-600 hover:text-warm-800',
											].join(' ')}
											title={isOptedOut ? 'Re-enable email notifications' : 'Disable email notifications for this litter'}
										>
											<span aria-hidden="true">{isOptedOut ? '🔕' : '🔔'}</span>
											{togglingId === litterId
												? 'Saving…'
												: isOptedOut
													? 'Notifications off'
													: 'Notifications on'}
										</button>
									)}
								</div>

								<div className="flex flex-col gap-6">
									{sectionUpdates.map((update) => (
										<Card key={update.id} className="overflow-hidden">
											{update.mediaUrls.length > 0 && (
												<div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
													{update.mediaUrls.map((url, i) => (
														<div key={i} className="aspect-square bg-warm-100 overflow-hidden">
															<img
																src={url}
																alt=""
																loading="lazy"
																decoding="async"
																className="w-full h-full object-cover"
															/>
														</div>
													))}
												</div>
											)}
											<div className="p-6">
												<div className="flex items-center gap-3 mb-2">
													{!!update.weekNumber && (
														<Badge variant="amber">Week {update.weekNumber}</Badge>
													)}
													<span className="text-xs text-warm-400">
														{update.publishedAt
															? new Date(update.publishedAt).toLocaleDateString()
															: ''}
													</span>
												</div>
												<h3 className="font-serif font-bold text-warm-900 text-lg mb-2">
													{update.title}
												</h3>
												<p className="text-warm-600 text-sm leading-relaxed whitespace-pre-line">
													{update.body}
												</p>
											</div>
										</Card>
									))}
								</div>
							</section>
						);
					})}
				</div>
			)}
		</div>
	);
}
