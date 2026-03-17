import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, LitterStatusBadge, PuppyStatusBadge, Badge } from '@/components/ui';
import type { LitterWithDogs } from '@paw-registry/shared';

// ─── Litters list ─────────────────────────────────────────────────────────────

export function LittersPage() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.litters.get().then(({ data }) => {
			if (data) setLitters(data as LitterWithDogs[]);
			setLoading(false);
		});
	}, []);

	return (
		<div className="max-w-6xl mx-auto px-6 py-16">
			<div className="mb-10">
				<h1 className="font-serif text-4xl font-bold text-stone-900 mb-3">Litters</h1>
				<p className="text-stone-500 max-w-xl">
					Our current and upcoming litters. All puppies come health-checked,
					vaccinated, microchipped, and vet-cleared before going home.
				</p>
			</div>

			{loading ? (
				<LoadingPage />
			) : litters.length === 0 ? (
				<div className="text-center py-20 text-stone-500">
					<p className="text-4xl mb-4">🐾</p>
					<p className="font-medium">No litters available right now.</p>
					<p className="text-sm mt-1">
						<Link to="/apply" className="text-brand-600 hover:underline">
							Apply to join our waitlist
						</Link>{' '}
						and we'll notify you.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{litters.map((litter) => (
						<Link
							key={litter.id}
							to={`/litters/${litter.id}`}
							className="group bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
						>
							<div className="h-48 bg-stone-100 flex items-center justify-center text-4xl">🐶</div>
							<div className="p-6">
								<div className="flex items-start justify-between mb-3">
									<h2 className="font-serif text-xl font-bold text-stone-900">{litter.name}</h2>
									<LitterStatusBadge status={litter.status} />
								</div>
								<div className="text-sm text-stone-600 mb-3">
									<span className="font-medium">{litter.sire?.name}</span>
									<span className="text-stone-400 mx-2">×</span>
									<span className="font-medium">{litter.dam?.name}</span>
								</div>
								<div className="flex gap-4 text-sm text-stone-500">
									{litter.whelpDate && <span>Born {litter.whelpDate}</span>}
									{litter.expectedDate && !litter.whelpDate && (
										<span>Expected {litter.expectedDate}</span>
									)}
									{litter.availableCount != null && (
										<span className="text-brand-600 font-medium">
											{litter.availableCount} available
										</span>
									)}
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Single litter detail ─────────────────────────────────────────────────────

export function LitterPage() {
	const { id } = useParams<{ id: string }>();
	const [litter, setLitter] = useState<LitterWithDogs | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!id) return;
		api.litters({ id }).get().then(({ data }) => {
			if (data) setLitter(data as LitterWithDogs);
			setLoading(false);
		});
	}, [id]);

	if (loading) return <LoadingPage />;
	if (!litter) return <div className="p-16 text-center text-stone-500">Litter not found.</div>;

	return (
		<div className="max-w-5xl mx-auto px-6 py-16">
			<Link to="/litters" className="text-sm text-stone-500 hover:text-stone-700 mb-8 inline-block">
				← All Litters
			</Link>

			<div className="flex items-start justify-between mb-8">
				<div>
					<h1 className="font-serif text-4xl font-bold text-stone-900 mb-2">{litter.name}</h1>
					<p className="text-stone-500">{litter.sire?.name} × {litter.dam?.name}</p>
				</div>
				<LitterStatusBadge status={litter.status} />
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
				{[
					{ label: 'Whelp Date', value: litter.whelpDate ?? 'TBC' },
					{ label: 'Total Puppies', value: litter.puppyCount ?? 'TBC' },
					{ label: 'Available', value: litter.availableCount ?? 'TBC' },
					{ label: 'Price', value: litter.purchasePrice ? `R${litter.purchasePrice.toLocaleString()}` : 'On request' },
				].map(({ label, value }) => (
					<div key={label} className="bg-stone-50 rounded-xl border border-stone-200 p-4">
						<p className="text-xs text-stone-400 uppercase tracking-wide mb-1">{label}</p>
						<p className="text-xl font-semibold text-stone-900">{value}</p>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
				{[litter.sire, litter.dam].filter(Boolean).map((dog) => (
					<Link
						key={dog!.id}
						to={`/dogs/${dog!.id}`}
						className="flex items-center gap-4 bg-white border border-stone-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
					>
						<div className="w-16 h-16 rounded-full bg-stone-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
							{dog!.profileImageUrl ? (
								<img src={dog!.profileImageUrl} alt={dog!.name} className="w-full h-full object-cover" />
							) : (
								<span className="text-2xl">🐕</span>
							)}
						</div>
						<div>
							<p className="font-medium text-stone-900">{dog!.name}</p>
							<p className="text-xs text-stone-400">{dog!.sex === 'male' ? 'Sire' : 'Dam'} · {dog!.colour}</p>
						</div>
					</Link>
				))}
			</div>

			{litter.puppies?.length > 0 && (
				<section>
					<h2 className="font-serif text-2xl font-bold text-stone-900 mb-6">Puppies</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{litter.puppies.map((puppy) => (
							<div key={puppy.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
								<div className="h-32 bg-stone-100 flex items-center justify-center">
									{puppy.profileImageUrl ? (
										<img src={puppy.profileImageUrl} alt={puppy.collarColour} className="w-full h-full object-cover" />
									) : (
										<span className="text-3xl">🐶</span>
									)}
								</div>
								<div className="p-3">
									<div className="flex items-center justify-between mb-1">
										<div
											className="w-4 h-4 rounded-full border border-stone-300"
											style={{ backgroundColor: puppy.collarColour }}
										/>
										<Badge variant={puppy.sex === 'male' ? 'blue' : 'purple'}>
											{puppy.sex === 'male' ? '♂' : '♀'}
										</Badge>
									</div>
									<p className="text-sm text-stone-600 mt-1">{puppy.colour}</p>
									<div className="mt-2">
										<PuppyStatusBadge status={puppy.status} />
									</div>
								</div>
							</div>
						))}
					</div>
				</section>
			)}

			<div className="mt-12 bg-brand-50 border border-brand-200 rounded-xl p-8 text-center">
				<h3 className="font-serif text-xl font-bold text-stone-900 mb-2">Interested in this litter?</h3>
				<p className="text-stone-600 text-sm mb-6">Submit an application and we'll be in touch.</p>
				<Link
					to="/apply"
					className="inline-block px-6 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors"
				>
					Apply Now
				</Link>
			</div>
		</div>
	);
}
