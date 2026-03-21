import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs } from '@paw-registry/shared';
import { LoadingPage, LitterStatusBadge, PuppyStatusBadge } from '@/components/ui';

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
	if (!litter) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone-500">Litter not found.</div>;

	const availablePuppies = litter.puppies?.filter((p) => p.status === 'available') ?? [];

	return (
		<div className="max-w-5xl mx-auto px-6 py-16">
			<Link to="/litters" className="text-stone-500 hover:text-stone-700 text-sm mb-6 inline-block">
				← Back to litters
			</Link>

			{litter.coverImageUrl && (
			<div className="h-64 md:h-80 rounded-2xl overflow-hidden mb-8 bg-stone-100">
				<img src={litter.coverImageUrl} alt={litter.name} className="w-full h-full object-cover" />
			</div>
		)}

		<div className="flex items-start justify-between mb-8">
				<div>
					<h1 className="font-serif text-4xl font-bold text-stone-900 mb-2">{litter.name}</h1>
					<div className="flex items-center gap-3 text-sm text-stone-500">
						<LitterStatusBadge status={litter.status} />
						{litter.whelpDate && (
							<span>Born {new Date(litter.whelpDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
						)}
					</div>
				</div>
				{litter.purchasePrice && (
					<div className="text-right">
						<p className="text-sm text-stone-500">Purchase price</p>
						<p className="font-bold text-stone-900 text-xl">R{litter.purchasePrice.toLocaleString()}</p>
					</div>
				)}
			</div>

			{/* Parents */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
				{[
					{ label: 'Sire (Father)', dog: litter.sire },
					{ label: 'Dam (Mother)', dog: litter.dam },
				].map(({ label, dog }) => (
					<Link
						key={label}
						to={`/dogs/${dog?.id}`}
						className="flex items-center gap-4 p-5 bg-white rounded-xl border border-stone-200 hover:shadow-md transition-shadow group"
					>
						<div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-2xl flex-shrink-0">
							{dog?.profileImageUrl ? (
								<img src={dog.profileImageUrl} alt={dog.name} className="w-full h-full rounded-full object-cover" />
							) : '🐕'}
						</div>
						<div>
							<p className="text-xs text-stone-400 uppercase tracking-wide">{label}</p>
							<p className="font-serif font-bold text-stone-900 group-hover:text-brand-600 transition-colors">{dog?.name}</p>
							<p className="text-xs text-stone-500">{dog?.colour} · {dog?.breed}</p>
						</div>
					</Link>
				))}
			</div>

			{/* Puppies */}
			{(litter.puppies?.length ?? 0) > 0 && (
				<div className="mb-12">
					<h2 className="font-serif text-2xl font-bold text-stone-900 mb-6">
						The puppies ({litter.puppies.length})
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						{litter.puppies.map((puppy) => (
							<div key={puppy.id} className="bg-white rounded-xl border border-stone-200 p-4 text-center">
								<div className="text-3xl mb-2">{puppy.sex === 'male' ? '🐶' : '🐕'}</div>
								<div
									className="w-4 h-4 rounded-full mx-auto mb-2 border border-stone-300"
									style={{ backgroundColor: puppy.collarColour }}
								/>
								<p className="text-xs font-medium text-stone-700 capitalize">{puppy.sex}</p>
								<p className="text-xs text-stone-500 mb-2">{puppy.colour}</p>
								<PuppyStatusBadge status={puppy.status} />
							</div>
						))}
					</div>
				</div>
			)}

			{litter.images && litter.images.length > 0 && (
				<div className="mb-12">
					<h2 className="font-serif text-2xl font-bold text-stone-900 mb-6">Photos</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{litter.images.map((img) => (
							<div key={img.id} className="aspect-square overflow-hidden rounded-xl bg-stone-100">
								<img src={img.url} alt="Litter photo" className="w-full h-full object-cover" />
							</div>
						))}
					</div>
				</div>
			)}

			{litter.notes && (
				<div className="bg-brand-50 border border-brand-100 rounded-xl p-6 mb-12">
					<p className="text-stone-700 leading-relaxed">{litter.notes}</p>
				</div>
			)}

			<div className="bg-stone-900 text-white rounded-2xl p-10 text-center">
				<h2 className="font-serif text-2xl font-bold mb-2">
					{availablePuppies.length > 0 ? 'Interested in this litter?' : 'Join the waitlist'}
				</h2>
				<p className="text-stone-400 mb-6 text-sm max-w-md mx-auto">
					{availablePuppies.length > 0
						? `${availablePuppies.length} ${availablePuppies.length === 1 ? 'puppy' : 'puppies'} still available. Submit an application and we'll be in touch.`
						: 'This litter is fully reserved. Apply to be considered for future litters.'}
				</p>
				<Link to="/apply" className="inline-block px-8 py-3 bg-brand-500 hover:bg-brand-400 text-white font-medium rounded-xl transition-colors">
					Apply now
				</Link>
			</div>
		</div>
	);
}
