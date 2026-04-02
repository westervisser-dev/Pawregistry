import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs, LitterMatchResult, LitterMatchTier } from '@paw-registry/shared';
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

// ─── Component ───────────────────────────────────────────────────────────────

export function PortalLitterDetail() {
	const { id } = useParams<{ id: string }>();
	const [litter, setLitter] = useState<LitterWithDogs | null>(null);
	const [loading, setLoading] = useState(true);
	const { user } = useAuthStore();
	const [myInterestPuppyIds, setMyInterestPuppyIds] = useState<Set<string>>(new Set());
	const [submittingInterest, setSubmittingInterest] = useState<string | null>(null);
	const [interestMessage, setInterestMessage] = useState<Record<string, string>>({});
	const [eligibility, setEligibility] = useState<{ isNotified: boolean; position: number | null; notifiedUpTo: number | null } | null>(null);
	const [myMatch, setMyMatch] = useState<LitterMatchResult | null>(null);
	const [myLitterInterest, setMyLitterInterest] = useState(false);
	const [litterInterestLoading, setLitterInterestLoading] = useState(false);

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
				setEligibility({ isNotified: data.isNotified, position: data.position, notifiedUpTo: data.notifiedUpTo });
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
	}, [id, user]);

	useEffect(() => {
		document.title = 'Litter — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

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
						{litter.breed && <Badge variant="default">{litter.breed}</Badge>}
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

				{/* Litter interest toggle — shown for waitlisted+ clients */}
				{user && (eligibility?.position !== null || myLitterInterest) && (
					<button
						onClick={toggleLitterInterest}
						disabled={litterInterestLoading}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
							myLitterInterest
								? 'bg-brand-50 text-brand-600 border border-brand-300 hover:bg-brand-100'
								: 'bg-white text-warm-600 border border-warm-300 hover:bg-warm-50'
						}`}
					>
						<span aria-hidden="true">{myLitterInterest ? '★' : '☆'}</span>
						{litterInterestLoading ? 'Saving…' : myLitterInterest ? 'Interested' : 'Mark as interested'}
					</button>
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

			{/* Parents */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
				{[
					{ label: 'Sire (Father)', dog: litter.sire },
					{ label: 'Dam (Mother)', dog: litter.dam },
				].map(({ label, dog }) => (
					<div
						key={label}
						className="flex items-center gap-4 p-4 bg-white rounded-xl border border-warm-200"
					>
						<div className="w-12 h-12 rounded-full bg-warm-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
							{dog?.profileImageUrl ? (
								<img src={dog.profileImageUrl} alt={dog.name} className="w-full h-full object-cover" />
							) : '🐕'}
						</div>
						<div>
							<p className="text-xs text-warm-400 uppercase tracking-wide">{label}</p>
							<p className="font-medium text-warm-900">{dog?.name}</p>
							<p className="text-xs text-warm-500">{dog?.colour} · {dog?.breed}</p>
						</div>
					</div>
				))}
			</div>

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
						{litter.puppies.map((puppy) => (
							<div key={puppy.id} className="bg-white rounded-xl border border-warm-200 p-4 text-center">
								<div className="text-3xl mb-2">{puppy.sex === 'male' ? '🐶' : '🐕'}</div>
								{puppy.collarColour && (
									<div className="flex items-center justify-center gap-1.5 mb-2">
										<div
											aria-hidden="true"
											className="w-3 h-3 rounded-full border border-warm-300 flex-shrink-0"
											style={{ backgroundColor: puppy.collarColour }}
										/>
										<span className="text-xs text-warm-500 capitalize">{puppy.collarColour}</span>
									</div>
								)}
								<p className="text-xs font-medium text-warm-700 capitalize">{puppy.sex}</p>
								<p className="text-xs text-warm-500 mb-2">{puppy.colour}</p>
								<PuppyStatusBadge status={puppy.status} />
								{puppy.status === 'available' && user && (
									<div className="mt-2">
										{myInterestPuppyIds.has(puppy.id) ? (
											<span className="text-xs text-green-600 font-medium">Interest registered ✓</span>
										) : interestMessage[puppy.id] ? (
											<span className="text-xs text-warm-500">{interestMessage[puppy.id]}</span>
										) : eligibility && !eligibility.isNotified ? (
											<span className="text-xs text-warm-400 italic">Not yet eligible</span>
										) : (
											<button
												onClick={() => expressInterest(puppy.id)}
												disabled={submittingInterest === puppy.id}
												className="w-full mt-1 px-2 py-1.5 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
											>
												{submittingInterest === puppy.id ? 'Sending…' : 'Express Interest'}
											</button>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Gallery */}
			{!!litter.images?.length && (
				<div className="mb-8">
					<h2 className="font-serif text-xl font-bold text-warm-900 mb-4">Photos</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
						{litter.images.map((img) => (
							<div key={img.id} className="aspect-square overflow-hidden rounded-xl bg-warm-100">
								<img src={img.url} alt="Litter photo" loading="lazy" decoding="async" className="w-full h-full object-cover" />
							</div>
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
		</div>
	);
}
