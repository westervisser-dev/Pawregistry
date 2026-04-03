import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LitterWithDogs } from '@paw-registry/shared';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingPage, LitterStatusBadge, EmptyState, BreedBadge } from '@/components/ui';

function LitterGateModal({ onClose }: { onClose: () => void }) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
				className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="text-4xl mb-4">🐾</div>
				<h2 id="modal-title" className="font-serif text-xl font-bold text-warm-900 mb-3">
					Application required
				</h2>
				<p className="text-warm-600 text-sm leading-relaxed mb-6">
					To view litter details, please complete the application form so that we may add you as a prospective client.
					If you've already applied, you can access full litter details from your client portal.
				</p>
				<div className="flex flex-col sm:flex-row gap-3">
					<Link
						to="/apply"
						className="flex-1 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
					>
						Apply now
					</Link>
					<Link
						to="/login"
						onClick={onClose}
						className="flex-1 px-5 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm font-medium rounded-xl transition-colors"
					>
						Go to portal
					</Link>
				</div>
				<button
					onClick={onClose}
					className="mt-4 text-xs text-warm-400 hover:text-warm-600 underline underline-offset-2 cursor-pointer"
				>
					Dismiss
				</button>
			</div>
		</div>
	);
}

function PawPrint({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 100 100" fill="currentColor" className={className} aria-hidden="true">
			<ellipse cx="50" cy="68" rx="26" ry="22" />
			<ellipse cx="24" cy="40" rx="11" ry="14" />
			<ellipse cx="42" cy="30" rx="11" ry="14" />
			<ellipse cx="60" cy="30" rx="11" ry="14" />
			<ellipse cx="77" cy="40" rx="11" ry="14" />
		</svg>
	);
}

export function LittersPage() {
	const [litters, setLitters] = useState<LitterWithDogs[]>([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);

	usePageTitle('Available Litters');

	useEffect(() => {
		api.litters.get().then(({ data }) => {
			if (data) setLitters(data as LitterWithDogs[]);
			setLoading(false);
		});
	}, []);

	if (loading) return <LoadingPage />;

	return (
		<div className="relative">
		<div className="pointer-events-none select-none absolute inset-0 overflow-hidden z-0">
			<PawPrint className="absolute -top-6 -right-16 w-[520px] opacity-[0.09] text-warm-400 rotate-[18deg]" />
			<PawPrint className="absolute top-[30%] -left-20 w-[400px] opacity-[0.07] text-warm-400 -rotate-[25deg]" />
			<PawPrint className="absolute bottom-32 -right-10 w-[320px] opacity-[0.08] text-warm-400 rotate-[8deg]" />
			<PawPrint className="absolute top-[60%] right-[15%] w-[220px] opacity-[0.06] text-warm-400 rotate-[45deg]" />
			<PawPrint className="absolute bottom-10 left-[20%] w-[180px] opacity-[0.06] text-warm-400 -rotate-[10deg]" />
			<PawPrint className="absolute top-[12%] left-[30%] w-[140px] opacity-[0.05] text-warm-400 rotate-[30deg]" />
		</div>
		<div className="relative z-10 max-w-6xl mx-auto px-6 py-16">

			<div className="mb-12">
				<h1 className="font-serif text-4xl font-bold text-warm-900 mb-2">Our litters</h1>
				<p className="text-warm-500 max-w-lg">
					Planned and current litters from our health-tested breeding programme.
				</p>
			</div>

			{litters.length === 0 ? (
				<EmptyState icon="🐶" title="No litters listed right now" description="Check back soon, or apply to join our waitlist." />
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
					{litters.map((litter) => {
						const hasAvailable = (litter.availableCount ?? 0) > 0;

						return (
							<button
								key={litter.id}
								type="button"
								onClick={() => setShowModal(true)}
								className="group bg-white rounded-2xl border border-warm-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 flex flex-col text-left w-full"
							>
								<div className="p-5 flex flex-col flex-1 relative">
									<div className="mb-2">
										<h2 className="font-serif text-lg font-bold text-warm-900 group-hover:text-brand-600 transition-colors leading-snug mb-1.5">
											{litter.name}
										</h2>
										<div className="flex flex-wrap items-center gap-1.5">
											{litter.breed && <BreedBadge breed={litter.breed} />}
											<LitterStatusBadge status={litter.status} />
										</div>
									</div>

									<div className="flex flex-col gap-1 flex-1">
										{(litter.sire?.name || litter.dam?.name) && (
											<p className="text-sm text-warm-500">
												{litter.sire?.name} × {litter.dam?.name}
											</p>
										)}
										{litter.expectedDate && !litter.whelpDate && (
											<p className="text-xs text-warm-400">
												Expected {new Date(litter.expectedDate).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
											</p>
										)}
										{litter.whelpDate && (
											<p className="text-xs text-warm-400">
												Born {new Date(litter.whelpDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
											</p>
										)}
									</div>

									{hasAvailable && (
										<p className="mt-3 text-sm font-semibold text-brand-600 pr-6">
											{litter.availableCount} {litter.availableCount === 1 ? 'puppy' : 'puppies'} available
										</p>
									)}

									<span className="absolute bottom-4 right-5 text-xs text-warm-300 group-hover:text-warm-400 group-hover:translate-x-0.5 transition-all duration-150">
										→
									</span>
								</div>
							</button>
						);
					})}
				</div>
			)}

			{/* Waitlist CTA */}
			<div className="mt-16 bg-brand-50 border border-brand-100 rounded-2xl overflow-hidden flex flex-col md:flex-row">
				<div className="p-8 md:p-12 flex-1">
					<h2 className="font-serif text-2xl font-bold text-warm-900 mb-2">Join our waitlist</h2>
					<p className="text-warm-500 mb-6 text-sm leading-relaxed">
						Litters fill quickly. Submit an application and we'll be in touch when a suitable match becomes available.
					</p>
					<Link to="/apply" className="inline-block px-7 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors text-sm">
						Apply now
					</Link>
				</div>
				<div className="hidden md:block w-72 flex-shrink-0 bg-warm-100">
					<img
						src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=500&q=85&auto=format&fit=crop"
						alt="Two doodle dogs together"
						loading="lazy"
						decoding="async"
						className="w-full h-full object-cover"
					/>
				</div>
			</div>

			{showModal && <LitterGateModal onClose={() => setShowModal(false)} />}
		</div>
		</div>
	);
}
