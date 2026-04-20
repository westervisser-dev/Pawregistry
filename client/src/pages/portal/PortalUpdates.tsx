import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, Glyph } from '@/components/ui';
import type { UpdateWithLitter } from '@paw-registry/shared';
import { usePageTitle } from '@/hooks/usePageTitle';

function Lightbox({ urls, initialIndex, onClose }: { urls: string[]; initialIndex: number; onClose: () => void }) {
	const [index, setIndex] = useState(initialIndex);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
			if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
			if (e.key === 'ArrowRight') setIndex((i) => Math.min(urls.length - 1, i + 1));
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [onClose, urls.length]);

	// Trap scroll behind modal
	useEffect(() => {
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = ''; };
	}, []);

	return (
		<div
			className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Image viewer"
		>
			<button
				className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl w-10 h-10 flex items-center justify-center"
				onClick={onClose}
				aria-label="Close"
			>
				✕
			</button>

			<img
				src={urls[index]}
				alt=""
				className="max-w-[90vw] max-h-[88vh] object-contain select-none"
				onClick={(e) => e.stopPropagation()}
			/>

			{urls.length > 1 && (
				<>
					<button
						className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-20 transition-colors"
						onClick={(e) => { e.stopPropagation(); setIndex((i) => i - 1); }}
						disabled={index === 0}
						aria-label="Previous image"
					>
						←
					</button>
					<button
						className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-20 transition-colors"
						onClick={(e) => { e.stopPropagation(); setIndex((i) => i + 1); }}
						disabled={index === urls.length - 1}
						aria-label="Next image"
					>
						→
					</button>
					<div className="absolute bottom-4 text-white/60 text-sm select-none">
						{index + 1} / {urls.length}
					</div>
				</>
			)}
		</div>
	);
}

function UpdateGallery({ urls }: { urls: string[] }) {
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

	if (urls.length === 0) return null;

	const MAX_VISIBLE = 5;
	const visible = urls.slice(0, MAX_VISIBLE);
	const extra = urls.length - MAX_VISIBLE;

	return (
		<>
			<div className="flex gap-2 flex-wrap mt-4">
				{visible.map((url, i) => {
					const isLast = i === MAX_VISIBLE - 1 && extra > 0;
					return (
						<button
							key={i}
							type="button"
							onClick={() => setLightboxIndex(i)}
							className="relative w-20 h-20 rounded-lg overflow-hidden bg-warm-100 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
							aria-label={isLast ? `View all ${urls.length} photos` : 'View photo'}
						>
							<img
								src={url}
								alt=""
								loading="lazy"
								decoding="async"
								className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
							/>
							{isLast && (
								<div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
									<span className="text-white font-semibold text-sm">+{extra + 1}</span>
								</div>
							)}
						</button>
					);
				})}
			</div>
			{lightboxIndex !== null && (
				<Lightbox urls={urls} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
			)}
		</>
	);
}

export function PortalUpdates() {
	const [updates, setUpdates] = useState<UpdateWithLitter[]>([]);
	const [optOuts, setOptOuts] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [togglingId, setTogglingId] = useState<string | null>(null);

	usePageTitle('Updates');

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
		<div className="max-w-[900px] mx-auto px-5 md:px-8 pt-6 md:pt-10 pb-8">
			<div className="mb-8">
				<div className="text-[11px] uppercase tracking-[0.14em] text-warm-500 mb-2">Journal</div>
				<h1 className="font-serif text-[30px] md:text-[38px] text-warm-900 leading-[1.05]">Puppy updates</h1>
				<p className="text-[13.5px] md:text-[14.5px] text-warm-600 mt-2">Your weekly journal from us to you.</p>
			</div>

			{sections.length === 0 ? (
				<Card className="p-12 text-center" role="status">
					<div className="w-14 h-14 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-4">
						<Glyph shape="bell" color="#9e8b78" size={22} />
					</div>
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
								{/* Litter heading */}
								<div className="flex items-center justify-between mb-5 pb-4 border-b border-warm-200">
									<div>
										<div className="text-[10.5px] uppercase tracking-[0.12em] text-warm-500 font-medium">
											{litter?.name ?? 'General'}
										</div>
										<p className="text-xs text-warm-400 mt-1">
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
											<Glyph shape="bell" color={isOptedOut ? '#9e8b78' : '#7a6a58'} size={12} />
											{togglingId === litterId
												? 'Saving'
												: isOptedOut
													? 'Notifications off'
													: 'Notifications on'}
										</button>
									)}
								</div>

								<div className="flex flex-col gap-5">
									{sectionUpdates.map((update) => (
										<article key={update.id} className="bg-white rounded-[16px] border border-black/[0.05] overflow-hidden">
											<div className="flex items-center justify-between px-5 md:px-6 pt-5">
												<div>
													{update.weekNumber != null && (
														<div className="text-[10.5px] uppercase tracking-[0.12em] text-[#c47420] font-medium">Week {update.weekNumber}</div>
													)}
													<div className="text-[11.5px] text-warm-500 mt-0.5">
														{update.publishedAt
															? new Date(update.publishedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
															: ''}
													</div>
												</div>
											</div>
											<h3 className="font-serif text-[22px] md:text-[26px] text-warm-900 px-5 md:px-6 mt-2 leading-[1.2]">
												{update.title}
											</h3>
											<div className="px-5 md:px-6">
												<p className="text-[13.5px] text-warm-700 py-4 leading-[1.6] whitespace-pre-line">{update.body}</p>
												<UpdateGallery urls={update.mediaUrls} />
											</div>
											<div className="h-5" />
										</article>
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
