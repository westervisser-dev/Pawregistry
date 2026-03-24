import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card } from '@/components/ui';
import type { GoHomeChecklist } from '@paw-registry/shared';

export function PortalChecklist() {
	const [checklist, setChecklist] = useState<GoHomeChecklist | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		document.title = 'Checklist — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		api.checklists.my.get().then(({ data }) => {
			if (data) setChecklist(data as GoHomeChecklist);
			setLoading(false);
		});
	}, []);

	if (loading) return <LoadingPage />;

	const items = checklist
		? [
			{ label: 'Vet check completed', done: checklist.vetCheckDone },
			{ label: 'Microchip registered', done: checklist.microchipRegistered },
			{ label: 'Contract signed', done: checklist.contractSigned },
			{ label: 'Deposit paid', done: checklist.depositPaid },
			{ label: 'Balance paid', done: checklist.balancePaid },
			{ label: 'Puppy pack prepared', done: checklist.puppyPackPrepared },
		]
		: [];

	const completed = items.filter((i) => i.done).length;

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-stone-900">Go-Home Checklist</h1>
				<p className="text-stone-600 text-sm mt-1">Everything that needs to happen before pickup day.</p>
			</div>

			{!checklist ? (
				<Card className="p-12 text-center">
					<p className="text-4xl mb-4" aria-hidden="true">✅</p>
					<p className="text-stone-600 font-medium">No checklist yet</p>
					<p className="text-stone-400 text-sm mt-1">Your breeder will set this up once you're matched.</p>
				</Card>
			) : (
				<Card className="p-6">
					<div className="flex items-center justify-between mb-6">
						<span className="text-sm text-stone-500">{completed} of {items.length} complete</span>
						<div className="flex-1 mx-4 bg-stone-100 rounded-full h-2 overflow-hidden">
							<div
								className="h-full bg-brand-500 rounded-full transition-all"
								style={{ width: `${(completed / items.length) * 100}%` }}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-3">
						{items.map(({ label, done }) => (
							<div key={label} className="flex items-center gap-3">
								<div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
									done ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-300'
								}`} aria-hidden="true">
									{done ? '✓' : '○'}
								</div>
								<span className={`text-sm ${done ? 'text-stone-500 line-through' : 'text-stone-800'}`}>
									{label}
								</span>
							</div>
						))}
					</div>
					{checklist.goHomeDate && (
						<div className="mt-6 pt-4 border-t border-stone-100">
							<p className="text-sm text-stone-500">
								Go-home date: <span className="font-medium text-stone-900">{checklist.goHomeDate}</span>
							</p>
						</div>
					)}
				</Card>
			)}
		</div>
	);
}
