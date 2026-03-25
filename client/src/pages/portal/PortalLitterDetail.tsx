import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs } from '@paw-registry/shared';
import { LoadingPage, LitterStatusBadge, PuppyStatusBadge, Badge } from '@/components/ui';

export function PortalLitterDetail() {
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

	useEffect(() => {
		document.title = 'Litter — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	if (loading) return <LoadingPage />;
	if (!litter) return <div className="text-stone-500 p-4">Litter not found.</div>;

	return (
		<div>
			<Link to="/portal/litters" className="text-sm text-stone-400 hover:text-stone-600 mb-6 inline-block">
				← Litters
			</Link>

			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-8">
				<div>
					<div className="flex items-center gap-3 mb-1.5">
						<h1 className="font-serif text-2xl font-bold text-stone-900">{litter.name}</h1>
						{litter.breed && <Badge variant="default">{litter.breed}</Badge>}
					</div>
					<div className="flex items-center gap-3 text-sm text-stone-500">
						<LitterStatusBadge status={litter.status} />
						{litter.whelpDate && (
							<span>Born {new Date(litter.whelpDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
						)}
						{litter.expectedDate && !litter.whelpDate && (
							<span>Expected {new Date(litter.expectedDate).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</span>
						)}
					</div>
				</div>
			</div>

			{/* Parents */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
				{[
					{ label: 'Sire (Father)', dog: litter.sire },
					{ label: 'Dam (Mother)', dog: litter.dam },
				].map(({ label, dog }) => (
					<div
						key={label}
						className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-200"
					>
						<div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
							{dog?.profileImageUrl ? (
								<img src={dog.profileImageUrl} alt={dog.name} className="w-full h-full object-cover" />
							) : '🐕'}
						</div>
						<div>
							<p className="text-xs text-stone-400 uppercase tracking-wide">{label}</p>
							<p className="font-medium text-stone-900">{dog?.name}</p>
							<p className="text-xs text-stone-500">{dog?.colour} · {dog?.breed}</p>
						</div>
					</div>
				))}
			</div>

			{/* Puppies */}
			{(litter.puppies?.length ?? 0) > 0 && (
				<div className="mb-8">
					<h2 className="font-serif text-xl font-bold text-stone-900 mb-4">
						Puppies ({litter.puppies.length})
					</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
						{litter.puppies.map((puppy) => (
							<div key={puppy.id} className="bg-white rounded-xl border border-stone-200 p-4 text-center">
								<div className="text-3xl mb-2">{puppy.sex === 'male' ? '🐶' : '🐕'}</div>
								{puppy.collarColour && (
									<div className="flex items-center justify-center gap-1.5 mb-2">
										<div
											aria-hidden="true"
											className="w-3 h-3 rounded-full border border-stone-300 flex-shrink-0"
											style={{ backgroundColor: puppy.collarColour }}
										/>
										<span className="text-xs text-stone-500 capitalize">{puppy.collarColour}</span>
									</div>
								)}
								<p className="text-xs font-medium text-stone-700 capitalize">{puppy.sex}</p>
								<p className="text-xs text-stone-500 mb-2">{puppy.colour}</p>
								<PuppyStatusBadge status={puppy.status} />
							</div>
						))}
					</div>
				</div>
			)}

			{/* Gallery */}
			{!!litter.images?.length && (
				<div className="mb-8">
					<h2 className="font-serif text-xl font-bold text-stone-900 mb-4">Photos</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
						{litter.images.map((img) => (
							<div key={img.id} className="aspect-square overflow-hidden rounded-xl bg-stone-100">
								<img src={img.url} alt="Litter photo" loading="lazy" decoding="async" className="w-full h-full object-cover" />
							</div>
						))}
					</div>
				</div>
			)}

			{/* Notes */}
			{litter.notes && (
				<div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
					<p className="text-stone-700 text-sm leading-relaxed">{litter.notes}</p>
				</div>
			)}
		</div>
	);
}
