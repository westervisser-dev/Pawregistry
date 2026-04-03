import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader } from '@/components/ui';
import type { Dog } from '@paw-registry/shared';
import { DeleteModal } from './_shared';

export function AdminDogDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [dog, setDog] = useState<Dog | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState('');
	const [form, setForm] = useState<Partial<Dog>>({ sex: 'male', status: 'active' });
	const [knownBreeds, setKnownBreeds] = useState<string[]>([]);
	const [knownColours, setKnownColours] = useState<string[]>([]);
	const [pendingImage, setPendingImage] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteBlocking, setDeleteBlocking] = useState<string[] | null>(null);

	useEffect(() => {
		api.dogs.get().then(({ data }) => {
			if (data) {
				const dogs = data as Dog[];
				setKnownBreeds([...new Set(dogs.map((d) => d.breed).filter(Boolean))].sort());
				setKnownColours([...new Set(dogs.map((d) => d.colour).filter(Boolean))].sort());
			}
		});
	}, []);

	useEffect(() => {
		if (!id || id === 'new') { setLoading(false); return; }
		api.dogs({ id }).get().then(({ data }) => {
			if (data) {
				const dog = data as Dog;
				const normalizedDob = dog.dob ? new Date(dog.dob).toISOString().split('T')[0] : '';
				setDog(dog);
				setForm({ ...dog, dob: normalizedDob });
			}
			setLoading(false);
		});
	}, [id]);

	const save = async () => {
		setFormError('');
		if (!form.name?.trim() || !form.breed?.trim() || !form.colour?.trim() || !String(form.dob ?? '').trim()) {
			setFormError('Name, Breed, Colour, and Date of Birth are required.');
			return;
		}
		setSaving(true);

		// Strip read-only/server-generated fields before sending
		const patchBody = {
			name: form.name,
			callName: form.callName ?? null,
			registeredName: form.registeredName ?? null,
			breed: form.breed,
			sex: form.sex,
			dob: form.dob,
			colour: form.colour,
			status: form.status,
			sireId: form.sireId ?? null,
			damId: form.damId ?? null,
			microchipNumber: form.microchipNumber ?? null,
			registrationNumber: form.registrationNumber ?? null,
			notes: form.notes ?? null,
		};

		if (id && id !== 'new') {
			const { data, error } = await api.dogs({ id }).patch(patchBody as Parameters<ReturnType<typeof api.dogs>['patch']>[0]);
			if (error) {
				setFormError('Failed to save. Please try again.');
			} else if (data) {
				if (pendingImage) {
					const updated = await api.dogs({ id }).images.post({ file: pendingImage, isProfile: 'true' });
					if (updated.data) setDog(updated.data as Dog);
					else setDog(data as Dog);
				} else {
					setDog(data as Dog);
				}
			}
		} else {
			const { data, error } = await api.dogs.post(form as Parameters<typeof api.dogs.post>[0]);
			if (error) {
				setFormError('Failed to save. Please try again.');
			} else if (data) {
				const newId = (data as Dog).id;
				if (pendingImage) {
					await api.dogs({ id: newId }).images.post({ file: pendingImage, isProfile: 'true' });
				}
				navigate('/admin/dogs', { state: { toast: `${form.name ?? 'Dog'} saved successfully.` } });
			}
		}
		setSaving(false);
	};

	const deleteDog = async () => {
		if (!id) return;
		setDeleting(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error } = await (api.dogs({ id }) as any).delete();
		if (error) {
			const body = error.value as { blockingRecords?: string[] };
			setDeleteBlocking(body.blockingRecords ?? ['Unknown error']);
		} else {
			navigate('/admin/dogs', { state: { toast: `${dog?.name ?? 'Dog'} deleted.` } });
		}
		setDeleting(false);
	};

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setPendingImage(file);
		setPreviewUrl(URL.createObjectURL(file));
	};

	const set = (key: keyof Dog, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

	if (loading) return <LoadingPage />;

	const inputCls = "w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
	const selectCls = "w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

	return (
		<div className="p-4 md:p-8 max-w-3xl">
			<Link to="/admin/dogs" className="text-sm text-warm-400 hover:text-warm-600 mb-6 inline-block">← Dogs</Link>
			<PageHeader title={(!id || id === 'new') ? (form.name?.trim() || 'New Dog') : (dog?.name ?? 'New Dog')} />

			<Card className="overflow-hidden">
				{/* Public facing section */}
				<div className="px-5 py-3 bg-warm-100 border-b border-warm-200">
					<h2 className="text-xs font-semibold text-amber-700 uppercase tracking-widest">Public Facing</h2>
					<p className="text-xs text-warm-500 mt-0.5">Visible to clients and on the public site</p>
				</div>
				<div className="p-6 flex flex-col gap-4">
					{/* Profile image */}
					<div>
						<label className="block text-xs font-medium text-warm-500 mb-2">Profile Image</label>
						<div className="flex items-center gap-4">
							<div className="w-20 h-20 rounded-lg border border-warm-200 bg-warm-100 overflow-hidden flex items-center justify-center flex-shrink-0">
								{previewUrl || form.profileImageUrl ? (
									<img src={previewUrl ?? form.profileImageUrl!} alt="Profile" className="w-full h-full object-cover" />
								) : (
									<span className="text-2xl">🐕</span>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-xs text-warm-600 hover:bg-warm-50 transition-colors">
									<span>Choose image</span>
									<input
										type="file"
										accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,.heic,image/heic"
										onChange={handleImageChange}
										className="hidden"
									/>
								</label>
								{(previewUrl || form.profileImageUrl) && (
									<button
										type="button"
										onClick={() => { setPendingImage(null); setPreviewUrl(null); set('profileImageUrl', null); }}
										className="text-xs text-warm-400 hover:text-red-500 text-left transition-colors"
									>
										Remove image
									</button>
								)}
								<p className="text-xs text-warm-400">JPEG, PNG, WebP, SVG or HEIC</p>
							</div>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Name<span className="text-red-400 ml-0.5">*</span></label>
							<input type="text" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} className={inputCls} />
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Breed<span className="text-red-400 ml-0.5">*</span></label>
							<input type="text" list="breed-options" value={form.breed ?? ''} onChange={(e) => set('breed', e.target.value)} className={inputCls} />
							<datalist id="breed-options">{knownBreeds.map((b) => <option key={b} value={b} />)}</datalist>
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Colour<span className="text-red-400 ml-0.5">*</span></label>
							<input type="text" list="colour-options" value={form.colour ?? ''} onChange={(e) => set('colour', e.target.value)} className={inputCls} />
							<datalist id="colour-options">{knownColours.map((c) => <option key={c} value={c} />)}</datalist>
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Sex</label>
							<select value={form.sex ?? 'male'} onChange={(e) => set('sex', e.target.value)} className={selectCls}>
								<option value="male">Male</option>
								<option value="female">Female</option>
							</select>
						</div>
						<div className="col-span-2">
							<label className="block text-xs font-medium text-warm-500 mb-1">Status</label>
							<select value={form.status ?? 'active'} onChange={(e) => set('status', e.target.value)} className={selectCls}>
								<option value="active">Active</option>
								<option value="retired">Retired</option>
								<option value="deceased">In Loving Memory</option>
							</select>
						</div>
					</div>
					<div>
						<label className="block text-xs font-medium text-warm-500 mb-1">Description</label>
						<textarea
							value={(form.notes as string) ?? ''}
							onChange={(e) => set('notes', e.target.value)}
							maxLength={600}
							rows={3}
							className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
						/>
						<p className="text-xs text-warm-400 mt-1 text-right">{((form.notes as string) ?? '').length}/600</p>
					</div>
				</div>

				{/* Internal/Admin section */}
				<div className="px-5 py-3 bg-warm-100 border-y border-warm-200">
					<h2 className="text-xs font-semibold text-amber-700 uppercase tracking-widest">Internal / Admin</h2>
					<p className="text-xs text-warm-500 mt-0.5">Not visible to clients</p>
				</div>
				<div className="p-6 flex flex-col gap-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Date of Birth<span className="text-red-400 ml-0.5">*</span></label>
							<input type="date" value={form.dob ?? ''} onChange={(e) => set('dob', e.target.value)} className={inputCls} />
						</div>
						<div className="flex flex-col justify-center">
							<label className="block text-xs font-medium text-warm-500 mb-2">Microchipped</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={!!form.microchipNumber}
									onChange={(e) => set('microchipNumber', e.target.checked ? 'yes' : null)}
									className="w-4 h-4 rounded border-warm-300 text-brand-500 focus:ring-brand-300"
								/>
								<span className="text-sm text-warm-600">{form.microchipNumber ? 'Yes' : 'No'}</span>
							</label>
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Reg Name</label>
							<input type="text" value={form.registeredName ?? ''} onChange={(e) => set('registeredName', e.target.value)} className={inputCls} />
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Reg No</label>
							<input type="text" value={form.registrationNumber ?? ''} onChange={(e) => set('registrationNumber', e.target.value)} className={inputCls} />
						</div>
					</div>
				</div>
			</Card>

				{formError && (
					<p className="text-sm text-red-600">{formError}</p>
				)}
				<div className="mt-8">
					<button
						onClick={save}
						disabled={saving}
						className="px-6 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save Changes'}
					</button>
				</div>
				{id && id !== 'new' && (
					<button
						onClick={() => { setDeleteBlocking(null); setDeleteOpen(true); }}
						className="inline-flex items-center gap-2 mt-8 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 hover:border-red-300 transition-colors"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
						Delete dog
					</button>
				)}
			<DeleteModal
				open={deleteOpen}
				entityLabel={dog?.name ?? 'this dog'}
				onClose={() => setDeleteOpen(false)}
				onConfirm={deleteDog}
				deleting={deleting}
				blockingRecords={deleteBlocking}
			/>
		</div>
	);
}
