import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { LitterWithDogs, LitterMatchResult, LitterMatchTier, ClientStage, PuppyWithImages } from '@paw-registry/shared';
import { parseBreedSize, BREEDS, BREED_SIZES } from '@paw-registry/shared';
import { LoadingPage, LitterStatusBadge, PuppyStatusBadge, Badge } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

// ─── Match tier presentation ──────────────────────────────────────────────────

const tierCard: Record<LitterMatchTier, string> = {
	great:   'bg-green-50 border-green-200',
	good:    'bg-teal-50 border-teal-200',
	partial: 'bg-amber-50 border-amber-200',
	low:     'bg-warm-100 border-warm-200',
};

const tierDot: Record<LitterMatchTier, string> = {
	great:   'bg-green-500',
	good:    'bg-teal-500',
	partial: 'bg-amber-400',
	low:     'bg-warm-300',
};

const tierHeading: Record<LitterMatchTier, string> = {
	great:   'Great match for you',
	good:    'Good match for you',
	partial: 'Partial match',
	low:     'Low match',
};

const tierHeadingColor: Record<LitterMatchTier, string> = {
	great:   'text-green-800',
	good:    'text-teal-800',
	partial: 'text-amber-800',
	low:     'text-warm-600',
};

const tierPill: Record<LitterMatchTier, string> = {
	great:   'bg-green-100 text-green-700',
	good:    'bg-teal-100 text-teal-700',
	partial: 'bg-amber-100 text-amber-700',
	low:     'bg-warm-200 text-warm-500',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBreedLabel(raw: string | null | undefined): string | null {
	const parsed = parseBreedSize(raw);
	if (!parsed) return null;
	return BREEDS.find((b) => b.value === parsed.breed)?.label ?? parsed.breed;
}

function getSizeLabel(raw: string | null | undefined): string | null {
	const parsed = parseBreedSize(raw);
	if (!parsed?.size) return null;
	return BREED_SIZES[parsed.breed]?.find((s) => s.value === parsed.size)?.label ?? parsed.size;
}

function formatBreed(raw: string | null | undefined): string | null {
	const breed = getBreedLabel(raw);
	if (!breed) return null;
	const size = getSizeLabel(raw);
	return size ? `${breed} · ${size}` : breed;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ urls, index, onClose, onPrev, onNext }: {
	urls: string[];
	index: number;
	onClose: () => void;
	onPrev: () => void;
	onNext: () => void;
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
			if (e.key === 'ArrowLeft') onPrev();
			if (e.key === 'ArrowRight') onNext();
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [onClose, onPrev, onNext]);

	return (
		<div
			className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
			role="dialog"
			aria-modal="true"
			aria-label="Image enlarged view"
			onClick={onClose}
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-xl transition-colors"
				aria-label="Close"
			>&#x2715;</button>

			{urls.length > 1 && (
				<>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); onPrev(); }}
						className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-2xl transition-colors"
						aria-label="Previous image"
					>&#8249;</button>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); onNext(); }}
						className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-2xl transition-colors"
						aria-label="Next image"
					>&#8250;</button>
				</>
			)}

			<img
				src={urls[index]}
				alt=""
				className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			/>

			{urls.length > 1 && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
					{urls.map((_, i) => (
						<div key={i} className={`w-2 h-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`} />
					))}
				</div>
			)}
		</div>
	);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PortalLitterDetail() {
	const { id } = useParams<{ id: string }>();
	const [litter, setLitter] = useState<LitterWithDogs | null>(null);
	const [loading, setLoading] = useState(true);
	const { user } = useAuthStore();
	const [myInterestPuppyIds, setMyInterestPuppyIds] = useState<Set<string>>(new Set());
	const [submittingInterest, setSubmittingInterest] = useState<string | null>(null);
	const [interestMessage, setInterestMessage] = useState<Record<string, string>>({});
	const [eligibility, setEligibility] = useState<{ isNotified: boolean; position: number | null; notifiedUpTo: number | null; hasActivePuppyInterest: boolean } | null>(null);
	const [myMatch, setMyMatch] = useState<LitterMatchResult | null>(null);
	const [myLitterInterest, setMyLitterInterest] = useState(false);
	const [litterInterestLoading, setLitterInterestLoading] = useState(false);
	const [clientStage, setClientStage] = useState<ClientStage | null>(null);
	const [puppyImgIndexes, setPuppyImgIndexes] = useState<Record<string, number>>({});
	const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

	useEffect(() => {
		if (!id) return;
		api.litters({ id }).get().then(({ data }) => {
			if (data) setLitter(data as LitterWithDogs);
			setLoading(false);
		});
	}, [id]);

	useEffect(() => {
		if (!id || !user) return;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters({ id }) as any)['my-interests'].get().then(({ data }: { data: { interests: Array<{ puppyId: string; status: string }>; isNotified: boolean; position: number | null; notifiedUpTo: number | null } | null }) => {
			if (data) {
				setMyInterestPuppyIds(new Set(data.interests.map((i) => i.puppyId)));
				setEligibility({ isNotified: data.isNotified, position: data.position, notifiedUpTo: data.notifiedUpTo, hasActivePuppyInterest: data.hasActivePuppyInterest ?? false });
			}
		}).catch(() => {});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters({ id }) as any)['my-litter-interest'].get().then(({ data }: { data: { interested: boolean } | null }) => {
			if (data) setMyLitterInterest(data.interested);
		}).catch(() => {});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters.portal as any)['my-matches'].get().then(({ data }: { data: LitterMatchResult[] | null }) => {
			if (data) {
				const match = data.find((m) => m.litterId === id);
				if (match) setMyMatch(match);
			}
		}).catch(() => {});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.clients as any).me.get().then(({ data }: { data: { stage: ClientStage } | null }) => {
			if (data) setClientStage(data.stage);
		}).catch(() => {});
	}, [id, user]);

	// Real-time: update puppy statuses when another client expresses interest
	useEffect(() => {
		if (!id) return;

		const channel = supabase
			.channel(`litter-puppies-${id}`)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'puppies', filter: `litter_id=eq.${id}` },
				(payload) => {
					setLitter((prev) => {
						if (!prev) return prev;
						return {
							...prev,
							puppies: prev.puppies.map((p) =>
								p.id === payload.new.id ? { ...p, status: payload.new.status as string } : p
							),
						};
					});
				}
			)
			.subscribe();

		return () => { supabase.removeChannel(channel); };
	}, [id]);

	usePageTitle('Litter');

	const expressInterest = async (puppyId: string) => {
		setSubmittingInterest(puppyId);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error } = await (api.litters.puppies({ puppyId }) as any).interest.post({});
		if (!error) {
			setMyInterestPuppyIds((prev) => new Set([...prev, puppyId]));
			setInterestMessage((prev) => ({ ...prev, [puppyId]: 'Interest registered! Our team will be in touch to confirm your match.' }));
		} else {
			const body = error.value as { message?: string };
			setInterestMessage((prev) => ({ ...prev, [puppyId]: body?.message ?? 'Something went wrong.' }));
		}
		setSubmittingInterest(null);
	};

	const toggleLitterInterest = async () => {
		if (!id) return;
		setLitterInterestLoading(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.litters({ id }) as any).interest.post({});
		if (data) setMyLitterInterest((data as { interested: boolean }).interested);
		setLitterInterestLoading(false);
	};

	const isWaitlistedOrLater = !!clientStage && ['waitlisted', 'match_requested', 'matched', 'matched_paid'].includes(clientStage);
	const notifiedOrNoQueue = !eligibility || eligibility.isNotified;
	const canInteract = isWaitlistedOrLater && notifiedOrNoQueue;

	if (loading) return <LoadingPage />;
	if (!litter) return <div className="text-warm-500 p-4">Litter not found.</div>;

	return (
		<div>
			<Link to="/portal/litters" className="text-sm text-warm-400 hover:text-warm-600 mb-6 inline-block">
				← Litters
			</Link>

			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-6">
				<div>
					<div className="flex items-center gap-3 mb-1.5">
						<h1 className="font-serif text-2xl font-bold text-warm-900">{litter.name}</h1>
						{litter.breed && <Badge variant="default">{formatBreed(litter.breed)}</Badge>}
					</div>
					<div className="flex items-center gap-3 text-sm text-warm-500">
						<LitterStatusBadge status={litter.status} />
						{litter.whelpDate && (
							<span>Born {new Date(litter.whelpDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
						)}
						{litter.expectedDate && !litter.whelpDate && (
							<span>Expected {new Date(litter.expectedDate).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</span>
						)}
					</div>
				</div>

				{/* Litter interest toggle — shown for all non-rejected clients, active from waitlisted onwards */}
				{user && clientStage && clientStage !== 'rejected' && (
					<div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto">
						<button
							onClick={canInteract ? toggleLitterInterest : undefined}
							disabled={litterInterestLoading || !canInteract}
							className={`flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
								!canInteract
									? 'bg-warm-100 text-warm-400 border border-warm-200 cursor-not-allowed'
									: myLitterInterest
										? 'bg-brand-50 text-brand-600 border border-brand-300 hover:bg-brand-100 disabled:opacity-50'
										: 'bg-white text-warm-600 border border-warm-300 hover:bg-warm-50 disabled:opacity-50'
							}`}
						>
							<span aria-hidden="true">{myLitterInterest ? '★' : '☆'}</span>
							{litterInterestLoading ? 'Saving…' : myLitterInterest ? 'Interested' : 'Mark as interested'}
						</button>
						{!isWaitlistedOrLater && (
							<p className="text-xs text-warm-400 text-left sm:text-right">
								You must be on the waitlist to mark interest
							</p>
						)}
						{isWaitlistedOrLater && !notifiedOrNoQueue && (
							<p className="text-xs text-warm-400 text-left sm:text-right">
								You haven't been invited to this litter yet
							</p>
						)}
					</div>
				)}
			</div>

			{/* Match card */}
			{myMatch && (
				<div
					className={`mb-8 p-4 rounded-xl border flex items-start gap-3 ${tierCard[myMatch.tier]}`}
					role="status"
					aria-label={`Litter match: ${tierHeading[myMatch.tier]}`}
				>
					<div
						aria-hidden="true"
						className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${tierDot[myMatch.tier]}`}
					/>
					<div>
						<p className={`text-sm font-semibold ${tierHeadingColor[myMatch.tier]}`}>
							{tierHeading[myMatch.tier]}
						</p>
						{myMatch.matchReasons.length > 0 && (
							<div className="flex flex-wrap gap-1.5 mt-2">
								{myMatch.matchReasons.map((reason) => (
									<span
										key={reason}
										className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${tierPill[myMatch.tier]}`}
									>
										{reason}
									</span>
								))}
							</div>
						)}
						{myMatch.tier === 'low' && (
							<p className="text-xs text-warm-500 mt-1.5">
								This litter doesn't match your breed preference, but you're welcome to browse.
							</p>
						)}
					</div>
				</div>
			)}

			{/* Puppies */}
			{(litter.puppies?.length ?? 0) > 0 && (
				<div className="mb-8">
					<h2 className="font-serif text-xl font-bold text-warm-900 mb-4">
						Puppies ({litter.puppies.length})
					</h2>

					{/* Waitlist eligibility notice */}
					{user && eligibility && !eligibility.isNotified && eligibility.position !== null && (
						<div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50">
							<p className="text-sm font-medium text-amber-800">You're on the waitlist</p>
							<p className="text-sm text-amber-700 mt-0.5">
								You're currently in position <strong>#{eligibility.position}</strong>.
								{eligibility.notifiedUpTo !== null && eligibility.notifiedUpTo > 0
									? ` The top ${eligibility.notifiedUpTo} client${eligibility.notifiedUpTo !== 1 ? 's' : ''} have been invited to select a puppy first.`
									: ''
								}
								{' '}We'll reach out when it's your turn.
							</p>
						</div>
					)}

					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
						{litter.puppies.map((puppy) => {
							const imgs = (puppy as PuppyWithImages).images ?? [];
							const imgIdx = puppyImgIndexes[puppy.id] ?? 0;

							return (
							<div key={puppy.id} className="bg-white rounded-xl border border-warm-200 overflow-hidden flex flex-col">
								{/* Puppy image carousel */}
								{imgs.length > 0 && (
									<div className="relative w-full aspect-square overflow-hidden bg-warm-100 flex-shrink-0">
										<img
											src={imgs[imgIdx].url}
											alt={puppy.colour ?? ''}
											loading="lazy"
											decoding="async"
											className="w-full h-full object-cover cursor-zoom-in"
											onClick={() => setLightbox({ urls: imgs.map((i) => i.url), index: imgIdx })}
										/>
										{imgs.length > 1 && (
											<>
												<button
													type="button"
													onClick={(e) => { e.stopPropagation(); setPuppyImgIndexes((prev) => ({ ...prev, [puppy.id]: imgIdx > 0 ? imgIdx - 1 : imgs.length - 1 })); }}
													className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-base shadow-md transition-colors"
													aria-label="Previous photo"
												>&#8249;</button>
												<button
													type="button"
													onClick={(e) => { e.stopPropagation(); setPuppyImgIndexes((prev) => ({ ...prev, [puppy.id]: imgIdx < imgs.length - 1 ? imgIdx + 1 : 0 })); }}
													className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-base shadow-md transition-colors"
													aria-label="Next photo"
												>&#8250;</button>
												<div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
													{imgs.map((_, i) => (
														<div key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} />
													))}
												</div>
											</>
										)}
									</div>
								)}
								{/* Collar colour accent bar */}
								<div
									className="h-1.5 w-full flex-shrink-0"
									style={{ backgroundColor: puppy.collarColour ?? '#e5e1db' }}
									aria-hidden="true"
								/>
								<div className="p-4 flex flex-col flex-1">
									{/* Collar label + sex */}
									<div className="flex items-center justify-between mb-3">
										{puppy.collarColour ? (
											<div className="flex items-center gap-1.5">
												<div
													aria-hidden="true"
													className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0"
													style={{ backgroundColor: puppy.collarColour }}
												/>
												<span className="text-xs text-warm-500 capitalize">{puppy.collarColour}</span>
											</div>
										) : <span />}
										<span className="text-xs font-medium text-warm-600 capitalize">{puppy.sex}</span>
									</div>

									{/* Colour */}
									<p className="text-sm font-semibold text-warm-900 mb-1 leading-tight">{puppy.colour ?? '—'}</p>

									{/* Status badge */}
									<div className="mb-3">
										<PuppyStatusBadge status={puppy.status} />
									</div>

									{/* CTA */}
									{puppy.status === 'available' && user && clientStage && (
										<div className="mt-auto">
											{myInterestPuppyIds.has(puppy.id) ? (
												<span className="text-xs text-green-600 font-medium">Interest registered ✓</span>
											) : interestMessage[puppy.id] ? (
												<span className="text-xs text-warm-500">{interestMessage[puppy.id]}</span>
											) : !isWaitlistedOrLater ? (
												<div>
													<button
														disabled
														className="w-full px-2 py-1.5 bg-warm-100 text-warm-400 text-xs rounded-lg cursor-not-allowed border border-warm-200"
													>
														Reserve
													</button>
													<p className="text-[10px] text-warm-400 mt-1 text-center leading-tight">
														Waitlist required
													</p>
												</div>
											) : eligibility && !eligibility.isNotified ? (
												<div>
													<button
														disabled
														className="w-full px-2 py-1.5 bg-warm-100 text-warm-400 text-xs rounded-lg cursor-not-allowed border border-warm-200"
													>
														Reserve
													</button>
													<p className="text-[10px] text-warm-400 mt-1 text-center leading-tight">
														Not yet invited
													</p>
												</div>
											) : eligibility?.hasActivePuppyInterest ? (
												<div>
													<button
														disabled
														className="w-full px-2 py-1.5 bg-warm-100 text-warm-400 text-xs rounded-lg cursor-not-allowed border border-warm-200"
													>
														Reserve
													</button>
													<p className="text-[10px] text-warm-400 mt-1 text-center leading-tight">
														Already selected a puppy
													</p>
												</div>
											) : (
												<button
													onClick={() => expressInterest(puppy.id)}
													disabled={submittingInterest === puppy.id}
													className="w-full px-2 py-1.5 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
												>
													{submittingInterest === puppy.id ? 'Reserving…' : 'Reserve'}
												</button>
											)}
										</div>
									)}
								</div>
							</div>
							); })}
					</div>
				</div>
			)}

			{/* Gallery */}
			{!!litter.images?.length && (
				<div className="mb-8">
					<h2 className="font-serif text-xl font-bold text-warm-900 mb-4">Photos</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
						{litter.images.map((img, i) => (
							<button
								key={img.id}
								type="button"
								className="aspect-square overflow-hidden rounded-xl bg-warm-100 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
								onClick={() => setLightbox({ urls: litter.images!.map((x) => x.url), index: i })}
								aria-label="Enlarge photo"
							>
								<img src={img.url} alt="Litter photo" loading="lazy" decoding="async" className="w-full h-full object-cover" />
							</button>
						))}
					</div>
				</div>
			)}

			{/* Notes */}
			{litter.notes && (
				<div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
					<p className="text-warm-700 text-sm leading-relaxed">{litter.notes}</p>
				</div>
			)}

			{/* Lightbox */}
			{lightbox && (
				<Lightbox
					urls={lightbox.urls}
					index={lightbox.index}
					onClose={() => setLightbox(null)}
					onPrev={() => setLightbox((lb) => lb ? { ...lb, index: lb.index > 0 ? lb.index - 1 : lb.urls.length - 1 } : null)}
					onNext={() => setLightbox((lb) => lb ? { ...lb, index: lb.index < lb.urls.length - 1 ? lb.index + 1 : 0 } : null)}
				/>
			)}
		</div>
	);
}
