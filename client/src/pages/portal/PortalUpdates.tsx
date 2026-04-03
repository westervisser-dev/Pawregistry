import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, Badge } from '@/components/ui';
import type { UpdateWithLitter } from '@paw-registry/shared';

function UpdateGallery({ urls }: { urls: string[] }) {
	if (urls.length === 0) return null;

	if (urls.length === 1) {
		return (
			<div className="aspect-[4/3] overflow-hidden bg-warm-100">
				<img src={urls[0]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
			</div>
		);
	}

	if (urls.length === 2) {
		return (
			<div className="grid grid-cols-2 gap-0.5">
				{urls.map((url, i) => (
					<div key={i} className="aspect-square overflow-hidden bg-warm-100">
						<img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
					</div>
				))}
			</div>
		);
	}

	if (urls.length === 3) {
		return (
			<div className="flex gap-0.5">
				<div className="w-2/3 aspect-square overflow-hidden bg-warm-100">
					<img src={urls[0]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
				</div>
				<div className="flex-1 flex flex-col gap-0.5">
					{urls.slice(1).map((url, i) => (
						<div key={i} className="flex-1 overflow-hidden bg-warm-100">
							<img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
						</div>
					))}
				</div>
			</div>
		);
	}

	// 4+ images: 2×2 grid, last cell shows +N if more than 4
	const shown = urls.slice(0, 4);
	const extra = urls.length - 4;
	return (
		<div className="grid grid-cols-2 gap-0.5">
			{shown.map((url, i) => (
				<div key={i} className="relative aspect-square overflow-hidden bg-warm-100">
					<img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
					{i === 3 && extra > 0 && (
						<div className="absolute inset-0 bg-black/40 flex items-center justify-center">
							<span className="text-white font-semibold text-xl">+{extra}</span>
						</div>
					)}
				</div>
			))}
		</div>
	);
}

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

	// Group updates by litterId; null = general announcements
	const grouped = new Map<string | null, UpdateWithLitter[]>();
	for (const update of updates) {
		const key = update.litterId ?? null;
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key)!.push(update);
	}

	// General section first, then litter sections
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
				<div className="flex flex-col gap-12">
					{sections.map(([litterId, sectionUpdates]) => {
						const litter = sectionUpdates[0]?.litter;
						const isOptedOut = !!litterId && optOuts.includes(litterId);

						return (
							<section key={litterId ?? 'general'} aria-label={litter?.name ?? 'General'}>
								{/* Litter heading */}
								<div className="flex items-center justify-between mb-5 pb-4 border-b border-warm-200">
									<div>
										<h2 className="font-serif font-bold text-warm-900 text-xl">
											{litter?.name ?? 'General'}
										</h2>
										<p className="text-xs text-warm-400 mt-0.5">
											{sectionUpdates.length} {sectionUpdates.length === 1 ? 'update' : 'updates'}
										</p>
									</div>
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
											<UpdateGallery urls={update.mediaUrls} />
											<div className="p-6">
												<div className="flex items-center gap-3 mb-3">
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
