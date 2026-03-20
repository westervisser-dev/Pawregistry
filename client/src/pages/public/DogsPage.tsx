import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Badge } from '@/components/ui';
import type { Dog } from '@paw-registry/shared';

const TRUNCATE = 100;

export function DogsPage() {
	const [dogs, setDogs] = useState<Dog[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');
	const [expandedId, setExpandedId] = useState<string | null>(null);

	useEffect(() => {
		api.dogs.get({ query: {} }).then(({ data }) => {
			if (data) setDogs(data as Dog[]);
			setLoading(false);
		});
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedId(null); };
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const filtered = filter === 'all' ? dogs : dogs.filter((d) => d.sex === filter);

	return (
		<div className="max-w-6xl mx-auto px-6 py-16">
			{/* Backdrop */}
			{expandedId && (
				<div
					className="fixed inset-0 z-40 bg-black/30"
					onClick={() => setExpandedId(null)}
				/>
			)}

			<div className="mb-10">
				<h1 className="font-serif text-4xl font-bold text-stone-900 mb-3">Our Dogs</h1>
				<p className="text-stone-500 max-w-xl">
					Meet our breeding programme. All dogs are health-tested, registered, and
					selected for excellent temperament.
				</p>
			</div>

			{/* Filter */}
			<div className="flex gap-2 mb-8">
				{(['all', 'male', 'female'] as const).map((f) => (
					<button
						key={f}
						onClick={() => setFilter(f)}
						className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
							filter === f
								? 'bg-brand-500 text-white'
								: 'bg-stone-100 text-stone-600 hover:bg-stone-200'
						}`}
					>
						{f.charAt(0).toUpperCase() + f.slice(1)}
					</button>
				))}
			</div>

			{loading ? (
				<LoadingPage />
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{filtered.map((dog) => {
						const notes = dog.notes ?? '';
						const isExpanded = expandedId === dog.id;
						const isTruncated = notes.length > TRUNCATE;
						const displayNotes = isExpanded || !isTruncated
							? notes
							: notes.slice(0, TRUNCATE).trimEnd() + '…';

						return (
							<div
								key={dog.id}
								className={`group bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col transition-all duration-200 ${
									isExpanded
										? 'relative z-50 shadow-2xl -translate-y-1'
										: 'hover:shadow-md'
								}`}
							>
								<div className="h-56 bg-stone-100 overflow-hidden flex items-center justify-center flex-shrink-0">
									{dog.profileImageUrl ? (
										<img
											src={dog.profileImageUrl}
											alt={dog.name}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
										/>
									) : (
										<span className="text-5xl">🐕</span>
									)}
								</div>
								<div className="p-5 flex flex-col flex-1">
									<div className="flex items-start justify-between mb-1 gap-2">
										<h3 className="font-serif font-bold text-stone-900 text-lg leading-snug">{dog.name}</h3>
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-500 text-white whitespace-nowrap flex-shrink-0">
											{dog.breed}
										</span>
									</div>
									{dog.registeredName && (
										<p className="text-xs text-stone-400 mb-2">{dog.registeredName}</p>
									)}
									<p className="text-sm text-stone-500 capitalize">{dog.sex} · {dog.colour}</p>
									<div className="mt-2 flex-1">
										{notes && (
											<p className="text-xs text-stone-400 leading-relaxed">
												{displayNotes}
												{isTruncated && !isExpanded && (
													<button
														onClick={() => setExpandedId(dog.id)}
														className="ml-1 text-brand-500 hover:underline font-medium"
													>
														Read more
													</button>
												)}
											</p>
										)}
									</div>
									{dog.status !== 'active' && (
										<p className="text-xs mt-3">
											<Badge variant={dog.status === 'retired' ? 'amber' : 'default'}>
												{dog.status === 'deceased' ? 'In Loving Memory' : 'Retired'}
											</Badge>
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
