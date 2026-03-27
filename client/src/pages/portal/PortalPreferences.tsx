import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Card, Button } from '@/components/ui';
import type { Client, ClientApplication } from '@paw-registry/shared';
import { BREEDS, BREED_SIZES, parseBreedSize as _parseBreedSize } from '@paw-registry/shared';

function parseBreedSize(raw: string | null | undefined): { breed: string; size: string } {
	const parsed = _parseBreedSize(raw);
	return { breed: parsed?.breed ?? '', size: parsed?.size ?? '' };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PortalPreferences() {
	const navigate = useNavigate();
	const [client, setClient] = useState<Client | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	// Form state
	const [preferredBreed, setPreferredBreed] = useState('');
	const [preferredSize, setPreferredSize] = useState('');
	const [hasSecondChoice, setHasSecondChoice] = useState(false);
	const [secondBreed, setSecondBreed] = useState('');
	const [secondSize, setSecondSize] = useState('');
	const [preferredSex, setPreferredSex] = useState<'male' | 'female' | 'no_preference'>('no_preference');
	const [considerOppositeSex, setConsiderOppositeSex] = useState(false);
	const [preferredColour, setPreferredColour] = useState('');
	const [considerOtherColour, setConsiderOtherColour] = useState(false);
	const [considerOtherBreedSize, setConsiderOtherBreedSize] = useState(false);
	const [considerRehome, setConsiderRehome] = useState(false);

	useEffect(() => {
		document.title = 'Edit Preferences — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

	useEffect(() => {
		api.clients.me.get().then(({ data }) => {
			if (!data) { setLoading(false); return; }
			const c = data as Client;
			setClient(c);

			const app = c.applicationData as unknown as ClientApplication | undefined;
			if (app) {
				const first = parseBreedSize(app.preferredBreedSize);
				setPreferredBreed(first.breed);
				setPreferredSize(first.size);

				const second = parseBreedSize(app.secondChoiceBreedSize);
				if (second.breed) {
					setHasSecondChoice(true);
					setSecondBreed(second.breed);
					setSecondSize(second.size);
				}

				setPreferredSex(app.preferredSex ?? 'no_preference');
				setConsiderOppositeSex(app.considerOppositeSex ?? false);
				setPreferredColour(app.preferredColour ?? '');
				setConsiderOtherColour(app.considerOtherColour ?? false);
				setConsiderOtherBreedSize(app.considerOtherBreedSize ?? false);
				setConsiderRehome(app.considerRehome ?? false);
			}
			setLoading(false);
		});
	}, []);

	const sizeOptions = preferredBreed ? (BREED_SIZES[preferredBreed] ?? []) : [];
	const secondSizeOptions = secondBreed ? (BREED_SIZES[secondBreed] ?? []) : [];

	function handleBreedChange(breed: string) {
		setPreferredBreed(breed);
		const sizes = BREED_SIZES[breed] ?? [];
		setPreferredSize(sizes.length === 1 ? sizes[0].value : '');
	}

	function handleSecondBreedChange(breed: string) {
		setSecondBreed(breed);
		const sizes = BREED_SIZES[breed] ?? [];
		setSecondSize(sizes.length === 1 ? sizes[0].value : '');
	}

	async function handleSave() {
		setSaving(true);
		setSaved(false);

		const preferredBreedSize = preferredBreed && preferredSize
			? `${preferredBreed} - ${preferredSize}`
			: preferredBreed || null;

		const secondChoiceBreedSize = hasSecondChoice && secondBreed && secondSize
			? `${secondBreed} - ${secondSize}`
			: hasSecondChoice && secondBreed
				? secondBreed
				: null;

		await (api.clients.me.preferences as unknown as { patch: (body: Record<string, unknown>) => Promise<unknown> }).patch({
			preferredBreedSize,
			secondChoiceBreedSize,
			preferredSex,
			preferredColour: preferredColour || null,
			considerOppositeSex,
			considerOtherColour,
			considerOtherBreedSize,
			considerRehome,
		});

		setSaving(false);
		setSaved(true);
		setTimeout(() => navigate('/portal'), 1200);
	}

	if (loading) return <LoadingPage />;
	if (!client) return <div className="text-warm-500">No client record linked to your account.</div>;

	return (
		<div>
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<Link to="/portal" className="text-warm-400 hover:text-warm-600 transition-colors text-sm">
					← Back to dashboard
				</Link>
			</div>

			<h1 className="font-serif text-[24px] text-warm-900 mb-1">Edit Puppy Preferences</h1>
			<p className="text-sm text-warm-500 mb-6">Update your breed, size, and other preferences below.</p>

			<div className="flex flex-col gap-5 max-w-2xl">
				{/* ── Breed selection ── */}
				<Card className="p-6">
					<h2 className="font-serif text-[16px] text-warm-900 mb-4">Preferred Breed</h2>
					<div className="flex flex-col gap-2">
						{BREEDS.map((b) => (
							<button
								key={b.value}
								type="button"
								onClick={() => handleBreedChange(b.value)}
								className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors cursor-pointer ${
									preferredBreed === b.value
										? 'bg-brand-50 border-brand-400 text-brand-700'
										: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
								}`}
							>
								<span className="font-semibold">{b.label}</span>
								<span className="ml-2 font-normal text-warm-400">{b.detail}</span>
							</button>
						))}
					</div>

					{/* Size selector */}
					{preferredBreed && sizeOptions.length > 1 && (
						<div className="mt-4">
							<label className="block text-sm font-medium text-warm-700 mb-2">Preferred size</label>
							<div className="flex flex-col gap-2">
								{sizeOptions.map((s) => (
									<button
										key={s.value}
										type="button"
										onClick={() => setPreferredSize(s.value)}
										className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors cursor-pointer ${
											preferredSize === s.value
												? 'bg-brand-50 border-brand-400 text-brand-700'
												: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
										}`}
									>
										<span className="font-semibold">{s.label}</span>
										<span className="ml-2 font-normal text-warm-400">{s.detail}</span>
									</button>
								))}
							</div>
						</div>
					)}

					{preferredBreed && sizeOptions.length === 1 && (
						<div className="mt-4">
							<label className="block text-sm font-medium text-warm-300 mb-2">Size</label>
							<div className="px-4 py-3 rounded-lg bg-warm-50 border border-warm-200 text-sm text-warm-400">
								<span className="font-medium">{sizeOptions[0].label}</span>
								<span className="ml-2">{sizeOptions[0].detail}</span>
							</div>
						</div>
					)}
				</Card>

				{/* ── Second choice ── */}
				<Card className="p-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="font-serif text-[16px] text-warm-900">Second Choice</h2>
						<label className="flex items-center gap-2 cursor-pointer">
							<span className="text-sm text-warm-500">I have a second choice</span>
							<button
								type="button"
								onClick={() => { setHasSecondChoice(!hasSecondChoice); setSecondBreed(''); setSecondSize(''); }}
								className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer ${
									hasSecondChoice ? 'bg-brand-500' : 'bg-warm-300'
								}`}
							>
								<div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
									hasSecondChoice ? 'translate-x-[20px]' : 'translate-x-[2px]'
								}`} />
							</button>
						</label>
					</div>

					{hasSecondChoice ? (
						<>
							<div className="flex flex-col gap-2">
								{BREEDS.filter((b) => b.value !== preferredBreed).map((b) => (
									<button
										key={b.value}
										type="button"
										onClick={() => handleSecondBreedChange(b.value)}
										className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors cursor-pointer ${
											secondBreed === b.value
												? 'bg-brand-50 border-brand-400 text-brand-700'
												: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
										}`}
									>
										<span className="font-semibold">{b.label}</span>
										<span className="ml-2 font-normal text-warm-400">{b.detail}</span>
									</button>
								))}
							</div>

							{secondBreed && secondSizeOptions.length > 1 && (
								<div className="mt-4">
									<label className="block text-sm font-medium text-warm-700 mb-2">Second choice size</label>
									<div className="flex flex-col gap-2">
										{secondSizeOptions.map((s) => (
											<button
												key={s.value}
												type="button"
												onClick={() => setSecondSize(s.value)}
												className={`px-4 py-3 rounded-lg text-sm font-medium border text-left transition-colors cursor-pointer ${
													secondSize === s.value
														? 'bg-brand-50 border-brand-400 text-brand-700'
														: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
												}`}
											>
												<span className="font-semibold">{s.label}</span>
												<span className="ml-2 font-normal text-warm-400">{s.detail}</span>
											</button>
										))}
									</div>
								</div>
							)}
						</>
					) : (
						<p className="text-sm text-warm-400">Enable this to select an alternative breed/size.</p>
					)}
				</Card>

				{/* ── Sex & Colour ── */}
				<Card className="p-6">
					<h2 className="font-serif text-[16px] text-warm-900 mb-4">Sex & Colour</h2>

					<div className="mb-4">
						<label className="block text-sm font-medium text-warm-700 mb-2">Preferred sex</label>
						<div className="flex gap-2">
							{(['male', 'female', 'no_preference'] as const).map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => setPreferredSex(s)}
									className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
										preferredSex === s
											? 'bg-brand-50 border-brand-400 text-brand-700'
											: 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
									}`}
								>
									{s === 'no_preference' ? 'No preference' : s.charAt(0).toUpperCase() + s.slice(1)}
								</button>
							))}
						</div>
					</div>

					<ToggleRow
						label="I would consider the opposite sex if my preference is unavailable"
						checked={considerOppositeSex}
						onChange={setConsiderOppositeSex}
					/>

					<div className="mt-4">
						<label className="block text-sm font-medium text-warm-700 mb-1.5">Preferred colour (optional)</label>
						<input
							type="text"
							value={preferredColour}
							onChange={(e) => setPreferredColour(e.target.value)}
							placeholder="e.g. cream, apricot, chocolate and white…"
							className="w-full px-3 py-2 bg-white border border-warm-200 rounded-lg text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition-colors"
						/>
					</div>

					<ToggleRow
						label="I would consider a different colour"
						checked={considerOtherColour}
						onChange={setConsiderOtherColour}
					/>
				</Card>

				{/* ── Flexibility ── */}
				<Card className="p-6">
					<h2 className="font-serif text-[16px] text-warm-900 mb-4">Flexibility</h2>
					<div className="flex flex-col gap-3">
						<ToggleRow
							label="I would consider a different breed or size"
							checked={considerOtherBreedSize}
							onChange={setConsiderOtherBreedSize}
						/>
						<ToggleRow
							label="I would consider adopting a rehome case (an older dog whose circumstances have changed)"
							checked={considerRehome}
							onChange={setConsiderRehome}
						/>
					</div>
				</Card>

				{/* ── Actions ── */}
				<div className="flex items-center gap-3">
					<Button onClick={handleSave} disabled={saving}>
						{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save preferences'}
					</Button>
					<Link to="/portal" className="text-sm text-warm-500 hover:text-warm-700 transition-colors">
						Cancel
					</Link>
				</div>
			</div>
		</div>
	);
}

// ─── Toggle Row ──────────────────────────────────────────────────────────────

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
			<span className="text-sm text-warm-700">{label}</span>
			<button
				type="button"
				onClick={() => onChange(!checked)}
				className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 cursor-pointer ${
					checked ? 'bg-brand-500' : 'bg-warm-300'
				}`}
			>
				<div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
					checked ? 'translate-x-[20px]' : 'translate-x-[2px]'
				}`} />
			</button>
		</label>
	);
}
