import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, StageBadge, Badge } from '@/components/ui';
import type { Client } from '@paw-registry/shared';

const STAGES = [
	{
		key: 'enquired',
		label: 'Enquired',
		variant: 'default' as const,
		icon: '📝',
		description: 'Your application has been received. Our team will review your details and reach out if we need anything further.',
		trigger: 'Happens automatically once you complete the onboarding form.',
	},
	{
		key: 'approved',
		label: 'Approved',
		variant: 'blue' as const,
		icon: '✅',
		description: 'Your application has been reviewed and approved — great news! You\'ll now be asked to complete a set of supporting documents.',
		trigger: 'Set by our team after reviewing your application.',
	},
	{
		key: 'waitlisted',
		label: 'Waitlisted',
		variant: 'amber' as const,
		icon: '⏳',
		description: 'You\'re on the waitlist! All your required documents have been checked off and you\'re in line for a future litter.',
		trigger: 'Happens automatically once all required documents are submitted.',
	},
	{
		key: 'placed',
		label: 'Placed',
		variant: 'green' as const,
		icon: '🐾',
		description: 'You\'ve been placed with a specific litter. We\'ll keep you updated as the puppies grow and the go-home date approaches.',
		trigger: 'Set by our team when a suitable litter becomes available for you.',
	},
	{
		key: 'match_requested',
		label: 'Match Requested',
		variant: 'purple' as const,
		icon: '🔍',
		description: 'The puppies are born and it\'s nearly time to choose! Our team has flagged you to select your puppy — we\'ll be in touch soon.',
		trigger: 'Set by our team once the litter is born and ready for matching.',
	},
	{
		key: 'matched',
		label: 'Matched',
		variant: 'purple' as const,
		icon: '💜',
		description: 'You\'ve been matched with your puppy — congratulations! Final payment and go-home arrangements will be confirmed shortly.',
		trigger: 'Happens once your puppy selection is confirmed.',
	},
	{
		key: 'matched_paid',
		label: 'Matched & Paid',
		variant: 'green' as const,
		icon: '🎉',
		description: 'Everything is in order — your puppy is ready to come home! Our team will coordinate the final handover details with you.',
		trigger: 'Confirmed once full payment has been received.',
	},
] as const;

function StagesModal({ currentStage, onClose }: { currentStage: string; onClose: () => void }) {
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
				className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
					<div>
						<h2 id="modal-title" className="font-serif text-lg font-bold text-stone-900">How do the stages work?</h2>
						<p className="text-xs text-stone-500 mt-0.5">Follow your journey from application to bringing your puppy home.</p>
					</div>
					<button
						onClick={onClose}
						aria-label="Close"
						className="text-stone-400 hover:text-stone-600 text-xl leading-none ml-4 cursor-pointer"
					>
						✕
					</button>
				</div>

				{/* Stages list */}
				<div className="overflow-y-auto px-6 py-4 space-y-4">
					{STAGES.map((stage, i) => {
						const isCurrent = stage.key === currentStage;
						const currentIdx = STAGES.findIndex(s => s.key === currentStage);
						const isPast = i < currentIdx;

						return (
							<div
								key={stage.key}
								className={`relative flex gap-4 rounded-xl p-4 border transition-colors ${
									isCurrent
										? 'border-brand-200 bg-brand-50/40'
										: isPast
											? 'border-stone-100 bg-stone-50 opacity-60'
											: 'border-stone-100 bg-white'
								}`}
							>
								{/* Timeline line */}
								{i < STAGES.length - 1 && (
									<div className="absolute left-[2.35rem] top-[3.5rem] bottom-[-1.25rem] w-px bg-stone-100 z-0" />
								)}

								{/* Icon */}
								<div className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base border ${
									isCurrent ? 'bg-white border-brand-300 shadow-sm' : 'bg-white border-stone-200'
								}`}>
									{isPast ? <span className="text-stone-400 text-sm">✓</span> : stage.icon}
								</div>

								{/* Content */}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<Badge variant={stage.variant}>{stage.label}</Badge>
										{isCurrent && (
											<span className="text-xs text-brand-600 font-medium">← You are here</span>
										)}
									</div>
									<p className="text-sm text-stone-700 leading-relaxed">{stage.description}</p>
									<p className="text-xs text-stone-400 mt-1.5 italic">{stage.trigger}</p>
								</div>
							</div>
						);
					})}
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t border-stone-100">
					<button
						onClick={onClose}
						className="w-full py-2.5 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
					>
						Got it
					</button>
				</div>
			</div>
		</div>
	);
}

export function PortalDashboard() {
	const [client, setClient] = useState<Client | null>(null);
	const [loading, setLoading] = useState(true);
	const [showStages, setShowStages] = useState(false);

	useEffect(() => {
		document.title = 'Dashboard — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		api.clients.me.get().then(({ data }) => {
			if (data) setClient(data as Client);
			setLoading(false);
		});
	}, []);

	if (loading) return <LoadingPage />;
	if (!client) return <div className="text-stone-500">No client record linked to your account.</div>;

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-stone-900">
					Welcome back, {client.firstName} 👋
				</h1>
				<p className="text-stone-600 text-sm mt-1">Here's the latest on your puppy journey.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<Card className="p-5">
					<p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Application Stage</p>
					<div className="mt-2"><StageBadge stage={client.stage} /></div>
					<button
						onClick={() => setShowStages(true)}
						className="mt-3 text-xs text-stone-400 hover:text-brand-600 underline underline-offset-2 cursor-pointer transition-colors"
					>
						How do the stages work?
					</button>
				</Card>
				{client.puppyId && (
					<Card className="p-5">
						<p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Your Puppy</p>
						<p className="font-medium text-stone-900 mt-1">🐶 Matched</p>
					</Card>
				)}
				<Card className="p-5">
					<p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Contact</p>
					<p className="font-medium text-stone-900 mt-1 text-sm">{client.email}</p>
				</Card>
			</div>

			<Card className="p-6">
				<h2 className="font-medium text-stone-900 mb-3">Your Details</h2>
				<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
					{[
						{ label: 'Name', value: `${client.firstName} ${client.lastName}` },
						{ label: 'Email', value: client.email },
						{ label: 'Phone', value: client.phone ?? '—' },
						{ label: 'City', value: client.city ?? '—' },
						{ label: 'Country', value: client.country },
					].map(({ label, value }) => (
						<div key={label}>
							<dt className="text-stone-400">{label}</dt>
							<dd className="text-stone-800">{value}</dd>
						</div>
					))}
				</dl>
			</Card>

			{showStages && (
				<StagesModal currentStage={client.stage} onClose={() => setShowStages(false)} />
			)}
		</div>
	);
}
