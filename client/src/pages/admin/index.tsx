import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import {
	LoadingPage, Card, PageHeader, StageBadge, LitterStatusBadge,
	PuppyStatusBadge, Badge, EmptyState,
} from '@/components/ui';
import type { Dog, Litter, Client, Update } from '@paw-registry/shared';

// ─── Shared admin table wrapper ───────────────────────────────────────────────

function AdminTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-stone-200">
						{headers.map((h) => (
							<th key={h} className="text-left py-3 px-4 text-xs font-medium text-stone-400 uppercase tracking-wide">
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>{children}</tbody>
			</table>
		</div>
	);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function AdminDashboard() {
	const [counts, setCounts] = useState({ dogs: 0, litters: 0, clients: 0, enquiries: 0 });

	useEffect(() => {
		Promise.all([
			api.dogs.get({ query: {} }),
			api.litters.admin.all.get(),
			api.clients.admin.get({ query: {} }),
		]).then(([dogsRes, littersRes, clientsRes]) => {
			const dogs = (dogsRes.data as Dog[] | null) ?? [];
			const litters = (littersRes.data as Litter[] | null) ?? [];
			const clients = (clientsRes.data as Client[] | null) ?? [];
			setCounts({
				dogs: dogs.length,
				litters: litters.length,
				clients: clients.length,
				enquiries: clients.filter((c) => c.stage === 'enquiry').length,
			});
		});
	}, []);

	const stats = [
		{ label: 'Active Dogs', value: counts.dogs, icon: '🐕', to: '/admin/dogs' },
		{ label: 'Litters', value: counts.litters, icon: '🐶', to: '/admin/litters' },
		{ label: 'Total Clients', value: counts.clients, icon: '👥', to: '/admin/clients' },
		{ label: 'New Enquiries', value: counts.enquiries, icon: '📥', to: '/admin/clients?stage=enquiry' },
	];

	return (
		<div className="p-8">
			<PageHeader title="Dashboard" subtitle="Overview of your breeding programme." />
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
				{stats.map(({ label, value, icon, to }) => (
					<Link key={label} to={to}>
						<Card className="p-5 hover:shadow-sm transition-shadow">
							<div className="flex items-center justify-between mb-3">
								<span className="text-2xl">{icon}</span>
							</div>
							<p className="text-3xl font-bold text-stone-900">{value}</p>
							<p className="text-sm text-stone-400 mt-1">{label}</p>
						</Card>
					</Link>
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card className="p-5">
					<h2 className="font-medium text-stone-900 mb-4">Quick Actions</h2>
					<div className="flex flex-col gap-2">
						{[
							{ label: '+ Add a dog', to: '/admin/dogs' },
							{ label: '+ Create a litter', to: '/admin/litters' },
							{ label: '📋 View waitlist', to: '/admin/waitlist' },
							{ label: '📷 Post an update', to: '/admin/updates' },
						].map(({ label, to }) => (
							<Link
								key={to}
								to={to}
								className="px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
							>
								{label}
							</Link>
						))}
					</div>
				</Card>
			</div>
		</div>
	);
}

// ─── Dogs list ────────────────────────────────────────────────────────────────

export function AdminDogs() {
	const [dogs, setDogs] = useState<Dog[]>([]);
	const [loading, setLoading] = useState(true);
	const [toast, setToast] = useState('');
	const location = useLocation();

	useEffect(() => {
		setLoading(true);
		api.dogs.get({ query: {} }).then(({ data }) => {
			if (data) setDogs(data as Dog[]);
			setLoading(false);
		});
		if ((location.state as { toast?: string })?.toast) {
			setToast((location.state as { toast: string }).toast);
			const t = setTimeout(() => setToast(''), 3000);
			return () => clearTimeout(t);
		}
	}, [location.key]);

	return (
		<div className="p-8">
			{toast && (
				<div className="fixed bottom-6 right-6 z-50 bg-stone-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
					{toast}
				</div>
			)}
			<PageHeader
				title="Dogs"
				subtitle="Your breeding programme dogs."
				action={
					<Link to="/admin/dogs/new" className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600">
						+ Add Dog
					</Link>
				}
			/>
			{loading ? (
				<LoadingPage />
			) : (
				<Card>
					<AdminTable headers={['Dog', 'Breed', 'Sex', 'Colour', 'Status', '']}>
						{dogs.map((dog) => (
							<tr key={dog.id} className="border-b border-stone-100 hover:bg-stone-50">
								<td className="py-3 px-4">
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-full bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
											{dog.profileImageUrl
												? <img src={dog.profileImageUrl} alt={dog.name} className="w-full h-full object-cover" />
												: <span>🐕</span>
											}
										</div>
										<div>
											<p className="font-medium text-stone-900">{dog.name}</p>
											{dog.registeredName && <p className="text-xs text-stone-400">{dog.registeredName}</p>}
										</div>
									</div>
								</td>
								<td className="py-3 px-4 text-stone-600">{dog.breed}</td>
								<td className="py-3 px-4">
									<Badge variant={dog.sex === 'male' ? 'blue' : 'purple'}>{dog.sex}</Badge>
								</td>
								<td className="py-3 px-4 text-stone-600">{dog.colour}</td>
								<td className="py-3 px-4">
									<Badge variant={dog.status === 'active' ? 'green' : 'default'}>{dog.status}</Badge>
								</td>
								<td className="py-3 px-4">
									<Link to={`/admin/dogs/${dog.id}`} className="text-sm text-brand-600 hover:underline">
										Edit →
									</Link>
								</td>
							</tr>
						))}
					</AdminTable>
					{dogs.length === 0 && <EmptyState icon="🐕" title="No dogs yet" description="Add your first dog to get started." />}
				</Card>
			)}
		</div>
	);
}

// ─── Dog detail / edit ────────────────────────────────────────────────────────

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

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setPendingImage(file);
		setPreviewUrl(URL.createObjectURL(file));
	};

	const set = (key: keyof Dog, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

	if (loading) return <LoadingPage />;

	const inputCls = "w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
	const selectCls = "w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

	return (
		<div className="p-8 max-w-3xl">
			<Link to="/admin/dogs" className="text-sm text-stone-400 hover:text-stone-600 mb-6 inline-block">← Dogs</Link>
			<PageHeader title={(!id || id === 'new') ? (form.name?.trim() || 'New Dog') : (dog?.name ?? 'New Dog')} />

			<Card className="overflow-hidden">
				{/* Public facing section */}
				<div className="px-5 py-3 bg-stone-100 border-b border-stone-200">
					<h2 className="text-xs font-semibold text-amber-700 uppercase tracking-widest">Public Facing</h2>
					<p className="text-xs text-stone-500 mt-0.5">Visible to clients and on the public site</p>
				</div>
				<div className="p-6 flex flex-col gap-4">
					{/* Profile image */}
					<div>
						<label className="block text-xs font-medium text-stone-500 mb-2">Profile Image</label>
						<div className="flex items-center gap-4">
							<div className="w-20 h-20 rounded-lg border border-stone-200 bg-stone-100 overflow-hidden flex items-center justify-center flex-shrink-0">
								{previewUrl || form.profileImageUrl ? (
									<img src={previewUrl ?? form.profileImageUrl!} alt="Profile" className="w-full h-full object-cover" />
								) : (
									<span className="text-2xl">🐕</span>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-600 hover:bg-stone-50 transition-colors">
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
										className="text-xs text-stone-400 hover:text-red-500 text-left transition-colors"
									>
										Remove image
									</button>
								)}
								<p className="text-xs text-stone-400">JPEG, PNG, WebP, SVG or HEIC</p>
							</div>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Name<span className="text-red-400 ml-0.5">*</span></label>
							<input type="text" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} className={inputCls} />
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Breed<span className="text-red-400 ml-0.5">*</span></label>
							<input type="text" list="breed-options" value={form.breed ?? ''} onChange={(e) => set('breed', e.target.value)} className={inputCls} />
							<datalist id="breed-options">{knownBreeds.map((b) => <option key={b} value={b} />)}</datalist>
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Colour<span className="text-red-400 ml-0.5">*</span></label>
							<input type="text" list="colour-options" value={form.colour ?? ''} onChange={(e) => set('colour', e.target.value)} className={inputCls} />
							<datalist id="colour-options">{knownColours.map((c) => <option key={c} value={c} />)}</datalist>
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Sex</label>
							<select value={form.sex ?? 'male'} onChange={(e) => set('sex', e.target.value)} className={selectCls}>
								<option value="male">Male</option>
								<option value="female">Female</option>
							</select>
						</div>
						<div className="col-span-2">
							<label className="block text-xs font-medium text-stone-500 mb-1">Status</label>
							<select value={form.status ?? 'active'} onChange={(e) => set('status', e.target.value)} className={selectCls}>
								<option value="active">Active</option>
								<option value="retired">Retired</option>
								<option value="deceased">In Loving Memory</option>
							</select>
						</div>
					</div>
					<div>
						<label className="block text-xs font-medium text-stone-500 mb-1">Description</label>
						<textarea
							value={(form.notes as string) ?? ''}
							onChange={(e) => set('notes', e.target.value)}
							maxLength={600}
							rows={3}
							className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
						/>
						<p className="text-xs text-stone-400 mt-1 text-right">{((form.notes as string) ?? '').length}/600</p>
					</div>
				</div>

				{/* Internal/Admin section */}
				<div className="px-5 py-3 bg-stone-100 border-y border-stone-200">
					<h2 className="text-xs font-semibold text-amber-700 uppercase tracking-widest">Internal / Admin</h2>
					<p className="text-xs text-stone-500 mt-0.5">Not visible to clients</p>
				</div>
				<div className="p-6 flex flex-col gap-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Date of Birth<span className="text-red-400 ml-0.5">*</span></label>
							<input type="date" value={form.dob ?? ''} onChange={(e) => set('dob', e.target.value)} className={inputCls} />
						</div>
						<div className="flex flex-col justify-center">
							<label className="block text-xs font-medium text-stone-500 mb-2">Microchipped</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={!!form.microchipNumber}
									onChange={(e) => set('microchipNumber', e.target.checked ? 'yes' : null)}
									className="w-4 h-4 rounded border-stone-300 text-brand-500 focus:ring-brand-300"
								/>
								<span className="text-sm text-stone-600">{form.microchipNumber ? 'Yes' : 'No'}</span>
							</label>
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Reg Name</label>
							<input type="text" value={form.registeredName ?? ''} onChange={(e) => set('registeredName', e.target.value)} className={inputCls} />
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Reg No</label>
							<input type="text" value={form.registrationNumber ?? ''} onChange={(e) => set('registrationNumber', e.target.value)} className={inputCls} />
						</div>
					</div>
				</div>
			</Card>

				{formError && (
					<p className="text-sm text-red-600">{formError}</p>
				)}
				<div>
					<button
						onClick={save}
						disabled={saving}
						className="px-6 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save Changes'}
					</button>
				</div>
		</div>
	);
}

// ─── Litters list ─────────────────────────────────────────────────────────────

export function AdminLitters() {
	const [litters, setLitters] = useState<Litter[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.litters.admin.all.get().then(({ data }) => {
			if (data) setLitters(data as Litter[]);
			setLoading(false);
		});
	}, []);

	return (
		<div className="p-8">
			<PageHeader
				title="Litters"
				action={
					<Link to="/admin/litters/new" className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600">
						+ New Litter
					</Link>
				}
			/>
			{loading ? <LoadingPage /> : (
				<Card>
					<AdminTable headers={['Name', 'Status', 'Sire × Dam', 'Whelp Date', 'Available', '']}>
						{litters.map((litter) => (
							<tr key={litter.id} className="border-b border-stone-100 hover:bg-stone-50">
								<td className="py-3 px-4 font-medium text-stone-900">{litter.name}</td>
								<td className="py-3 px-4"><LitterStatusBadge status={litter.status} /></td>
								<td className="py-3 px-4 text-stone-500 text-xs">{litter.sireId} × {litter.damId}</td>
								<td className="py-3 px-4 text-stone-600">{litter.whelpDate ?? '—'}</td>
								<td className="py-3 px-4 text-stone-600">{litter.availableCount ?? '—'}</td>
								<td className="py-3 px-4">
									<Link to={`/admin/litters/${litter.id}`} className="text-sm text-brand-600 hover:underline">Edit →</Link>
								</td>
							</tr>
						))}
					</AdminTable>
					{litters.length === 0 && <EmptyState icon="🐶" title="No litters yet" />}
				</Card>
			)}
		</div>
	);
}

export function AdminLitterDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [litter, setLitter] = useState<Litter & { sire: Dog; dam: Dog; puppies: unknown[] } | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState('');
	const [newPuppy, setNewPuppy] = useState({ collarColour: '', sex: 'male' as const, colour: '' });

	// New-litter form state
	const [dogs, setDogs] = useState<Dog[]>([]);
	const [newForm, setNewForm] = useState<{ name: string; sireId: string; damId: string; status: string; expectedDate: string; notes: string; isPublic: boolean }>({
		name: '', sireId: '', damId: '', status: 'planned', expectedDate: '', notes: '', isPublic: false,
	});
	const [pendingImage, setPendingImage] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;
		if (id === 'new') {
			api.dogs.get().then(({ data }) => {
				if (data) setDogs(data as Dog[]);
				setLoading(false);
			});
			return;
		}
		setLoading(true);
		setLitter(null);
		api.litters({ id }).get().then(({ data }) => {
			if (data) setLitter(data as typeof litter);
			setLoading(false);
		});
	}, [id]);

	const createLitter = async () => {
		setFormError('');
		if (!newForm.name.trim() || !newForm.sireId || !newForm.damId) {
			setFormError('Name, Sire, and Dam are required.');
			return;
		}
		setSaving(true);
		try {
			const { data, error } = await api.litters.post({
				name: newForm.name,
				sireId: newForm.sireId,
				damId: newForm.damId,
				status: newForm.status as 'planned' | 'confirmed' | 'born' | 'weaning' | 'ready' | 'completed',
				...(newForm.expectedDate ? { expectedDate: newForm.expectedDate } : {}),
				...(newForm.notes ? { notes: newForm.notes } : {}),
				isPublic: newForm.isPublic,
			});
			if (error) { setFormError('Failed to save. Please try again.'); return; }
			if (data) {
				const newId = (data as Litter).id;
				if (pendingImage) {
					await api.litters({ id: newId }).images.post({ file: pendingImage });
				}
				navigate('/admin/litters');
			}
		} catch {
			setFormError('Failed to save. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	const updateStatus = async (status: string) => {
		if (!id) return;
		setSaving(true);
		const { data } = await api.litters({ id }).patch({ status } as Parameters<ReturnType<typeof api.litters>['patch']>[0]);
		if (data) setLitter(data as typeof litter);
		setSaving(false);
	};

	const togglePublic = async () => {
		if (!id || !litter) return;
		const next = !litter.isPublic;
		await api.litters({ id }).patch({ isPublic: next });
		setLitter((l) => l ? { ...l, isPublic: next } : l);
	};

	const addPuppy = async () => {
		if (!id || !newPuppy.collarColour || !newPuppy.colour) return;
		const { data } = await api.litters({ id }).puppies.post(newPuppy);
		if (data && litter) {
			setLitter({ ...litter, puppies: [...litter.puppies, data as unknown] });
			setNewPuppy({ collarColour: '', sex: 'male', colour: '' });
		}
	};

	if (loading) return <LoadingPage />;

	// ── New litter form ────────────────────────────────────────────────────────
	if (id === 'new') {
		const setF = (key: keyof typeof newForm, value: string) => setNewForm((f) => ({ ...f, [key]: value }));
		return (
			<div className="p-8 max-w-3xl">
				<Link to="/admin/litters" className="text-sm text-stone-400 hover:text-stone-600 mb-6 inline-block">← Litters</Link>
				<PageHeader title="New Litter" />
				<Card className="p-6 flex flex-col gap-4">
					{/* Cover image */}
					<div>
						<label className="block text-xs font-medium text-stone-500 mb-2">Cover Image</label>
						<div className="flex items-center gap-4">
							<div className="w-20 h-20 rounded-lg border border-stone-200 bg-stone-100 overflow-hidden flex items-center justify-center flex-shrink-0">
								{previewUrl ? (
									<img src={previewUrl} alt="Cover" className="w-full h-full object-cover" />
								) : (
									<span className="text-2xl">🐾</span>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-600 hover:bg-stone-50 transition-colors">
									<span>Choose image</span>
									<input
										type="file"
										accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,.heic,image/heic"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (!file) return;
											setPendingImage(file);
											setPreviewUrl(URL.createObjectURL(file));
										}}
										className="hidden"
									/>
								</label>
								{previewUrl && (
									<button
										type="button"
										onClick={() => { setPendingImage(null); setPreviewUrl(null); }}
										className="text-xs text-stone-400 hover:text-red-500 text-left transition-colors"
									>
										Remove image
									</button>
								)}
								<p className="text-xs text-stone-400">JPEG, PNG, WebP, SVG or HEIC</p>
							</div>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="col-span-2">
							<label className="block text-xs font-medium text-stone-500 mb-1">
								Litter Name<span className="text-red-400 ml-0.5">*</span>
							</label>
							<input
								type="text"
								value={newForm.name}
								onChange={(e) => setF('name', e.target.value)}
								placeholder="e.g. Autumn 2025 Litter"
								className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">
								Sire (Father)<span className="text-red-400 ml-0.5">*</span>
							</label>
							<select
								value={newForm.sireId}
								onChange={(e) => setF('sireId', e.target.value)}
								className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							>
								<option value="">Select sire…</option>
								{dogs.filter((d) => d.sex === 'male').map((d) => (
									<option key={d.id} value={d.id}>{d.name}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">
								Dam (Mother)<span className="text-red-400 ml-0.5">*</span>
							</label>
							<select
								value={newForm.damId}
								onChange={(e) => setF('damId', e.target.value)}
								className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							>
								<option value="">Select dam…</option>
								{dogs.filter((d) => d.sex === 'female').map((d) => (
									<option key={d.id} value={d.id}>{d.name}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Status</label>
							<select
								value={newForm.status}
								onChange={(e) => setF('status', e.target.value)}
								className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none"
							>
								{['planned', 'confirmed', 'born', 'weaning', 'ready', 'completed'].map((s) => (
									<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-stone-500 mb-1">Expected Date</label>
							<input
								type="date"
								value={newForm.expectedDate}
								onChange={(e) => setF('expectedDate', e.target.value)}
								className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none"
							/>
						</div>
						<div className="col-span-2">
							<label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
							<textarea
								value={newForm.notes}
								onChange={(e) => setF('notes', e.target.value)}
								rows={3}
								className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none resize-none"
							/>
						</div>
					</div>
					<label className="flex items-center gap-3 cursor-pointer select-none">
						<input
							type="checkbox"
							checked={newForm.isPublic}
							onChange={(e) => setNewForm((f) => ({ ...f, isPublic: e.target.checked }))}
							className="w-4 h-4 accent-brand-500"
						/>
						<span className="text-sm text-stone-700">Visible on public site</span>
					</label>
					{formError && <p className="text-sm text-red-600">{formError}</p>}
					<button
						onClick={createLitter}
						disabled={saving}
						className="self-start px-6 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Create Litter'}
					</button>
				</Card>
			</div>
		);
	}

	if (!litter) return <div className="p-8 text-stone-500">Litter not found.</div>;

	// Eden Treaty auto-deserialises ISO date strings to Date objects — convert back to readable strings
	const fmtDate = (d: Date | string | null | undefined) =>
		d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

	const statuses = ['planned', 'confirmed', 'born', 'weaning', 'ready', 'completed'];

	return (
		<div className="p-8 max-w-4xl">
			<PageHeader
				title={litter.name}
				subtitle={`${(litter as typeof litter & { sire: Dog }).sire?.name ?? '—'} × ${(litter as typeof litter & { dam: Dog }).dam?.name ?? '—'}`}
				action={
					<button onClick={() => navigate('/admin/litters')} className="text-sm text-stone-500 hover:text-stone-700">
						← Back
					</button>
				}
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				<Card className="p-6 md:col-span-2">
					<h3 className="font-semibold text-stone-800 mb-4">Cover Image</h3>
					<div className="flex items-center gap-4">
						<div className="w-20 h-20 rounded-lg border border-stone-200 bg-stone-100 overflow-hidden flex items-center justify-center flex-shrink-0">
							{previewUrl || litter.coverImageUrl ? (
								<img src={previewUrl ?? litter.coverImageUrl!} alt="Cover" className="w-full h-full object-cover" />
							) : (
								<span className="text-2xl">🐾</span>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-600 hover:bg-stone-50 transition-colors">
								<span>Choose image</span>
								<input
									type="file"
									accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,.heic,image/heic"
									onChange={async (e) => {
										const file = e.target.files?.[0];
										if (!file || !id) return;
										setPreviewUrl(URL.createObjectURL(file));
										const { data } = await api.litters({ id }).images.post({ file });
										if (data) setLitter(data as typeof litter);
									}}
									className="hidden"
								/>
							</label>
							{(previewUrl || litter.coverImageUrl) && (
								<button
									type="button"
									onClick={() => { setPreviewUrl(null); setLitter((l) => l ? { ...l, coverImageUrl: null } : l); }}
									className="text-xs text-stone-400 hover:text-red-500 text-left transition-colors"
								>
									Remove image
								</button>
							)}
							<p className="text-xs text-stone-400">JPEG, PNG, WebP, SVG or HEIC</p>
						</div>
					</div>
				</Card>

				<Card className="p-6">
					<h3 className="font-semibold text-stone-800 mb-4">Status</h3>
					<div className="flex flex-wrap gap-2">
						{statuses.map((s) => (
							<button
								key={s}
								onClick={() => updateStatus(s)}
								disabled={saving}
								className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
									litter.status === s
										? 'bg-brand-500 text-white'
										: 'bg-stone-100 text-stone-600 hover:bg-stone-200'
								}`}
							>
								{s}
							</button>
						))}
					</div>
					<div className="mt-4 pt-4 border-t border-stone-100">
						<label className="flex items-center gap-3 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={litter.isPublic}
								onChange={togglePublic}
								className="w-4 h-4 accent-brand-500"
							/>
							<span className="text-sm text-stone-700">Visible on public site</span>
						</label>
					</div>
				</Card>

				<Card className="p-6">
					<h3 className="font-semibold text-stone-800 mb-4">Details</h3>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-stone-500">Whelp date</span>
							<span>{fmtDate(litter.whelpDate)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-stone-500">Expected</span>
							<span>{fmtDate(litter.expectedDate)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-stone-500">Puppies</span>
							<span>{litter.puppyCount ?? '—'}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-stone-500">Deposit</span>
							<span>{litter.depositAmount ? `R${litter.depositAmount}` : '—'}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-stone-500">Price</span>
							<span>{litter.purchasePrice ? `R${litter.purchasePrice}` : '—'}</span>
						</div>
					</div>
				</Card>
			</div>

			<Card className="p-6 mb-6">
				<h3 className="font-semibold text-stone-800 mb-4">Puppies ({litter.puppies.length})</h3>
				{litter.puppies.length === 0 ? (
					<EmptyState icon="🐶" title="No puppies recorded yet" />
				) : (
					<div className="space-y-2">
						{(litter.puppies as Array<{ id: string; collarColour: string; sex: string; colour: string; status: string; currentWeight: number | null }>).map((p) => (
							<div key={p.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
								<div className="flex items-center gap-3">
									<span className="w-4 h-4 rounded-full border border-stone-300 inline-block" style={{ background: p.collarColour }} />
									<span className="text-sm font-medium text-stone-800">{p.colour} {p.sex}</span>
								</div>
								<PuppyStatusBadge status={p.status} />
							</div>
						))}
					</div>
				)}

				<div className="mt-4 pt-4 border-t border-stone-100">
					<p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Add puppy</p>
					<div className="flex gap-2">
						<input
							placeholder="Collar colour"
							value={newPuppy.collarColour}
							onChange={(e) => setNewPuppy((p) => ({ ...p, collarColour: e.target.value }))}
							className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
						/>
						<input
							placeholder="Coat colour"
							value={newPuppy.colour}
							onChange={(e) => setNewPuppy((p) => ({ ...p, colour: e.target.value }))}
							className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
						/>
						<select
							value={newPuppy.sex}
							onChange={(e) => setNewPuppy((p) => ({ ...p, sex: e.target.value as 'male' | 'female' }))}
							className="px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
						>
							<option value="male">M</option>
							<option value="female">F</option>
						</select>
						<button
							onClick={addPuppy}
							className="px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
						>
							Add
						</button>
					</div>
				</div>
			</Card>
		</div>
	);
}

// ─── Clients list ─────────────────────────────────────────────────────────────

export function AdminClients() {
	const [clients, setClients] = useState<Client[]>([]);
	const [stage, setStage] = useState('');
	const [loading, setLoading] = useState(true);

	const load = (s: string) => {
		setLoading(true);
		api.clients.admin.get({ query: s ? { stage: s } : {} }).then(({ data }) => {
			if (data) setClients(data as Client[]);
			setLoading(false);
		});
	};

	useEffect(() => { load(''); }, []);

	const stages = ['', 'enquiry', 'reviewed', 'waitlisted', 'matched', 'placed', 'declined'];

	return (
		<div className="p-8">
			<PageHeader title="Clients" subtitle="All applications and client relationships." />

			<div className="flex gap-2 mb-6 flex-wrap">
				{stages.map((s) => (
					<button
						key={s}
						onClick={() => { setStage(s); load(s); }}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
							stage === s ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
						}`}
					>
						{s || 'All'}
					</button>
				))}
			</div>

			{loading ? <LoadingPage /> : (
				<Card>
					<AdminTable headers={['Name', 'Preference', 'Stage', 'Applied', '']}>
						{clients.map((client) => {
							const pbs = (client.applicationData as Record<string, unknown>)?.preferredBreedSize as string | undefined;
							const parsed = formatBreedSize(pbs);
							return (
								<tr key={client.id} className="border-b border-stone-100 hover:bg-stone-50">
									<td className="py-3 px-4">
										<p className="font-medium text-stone-900">{client.firstName} {client.lastName}</p>
										<p className="text-xs text-stone-400">{client.email}</p>
									</td>
									<td className="py-3 px-4">
										{parsed ? (
											<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-full text-xs font-semibold text-brand-700 whitespace-nowrap">
												🐾 {parsed.breed}{parsed.size ? ` · ${parsed.size}` : ''}
											</span>
										) : <span className="text-stone-300 text-xs">—</span>}
									</td>
									<td className="py-3 px-4"><StageBadge stage={client.stage} /></td>
									<td className="py-3 px-4 text-stone-400 text-xs">
										{new Date(client.createdAt).toLocaleDateString()}
									</td>
									<td className="py-3 px-4">
										<Link to={`/admin/clients/${client.id}`} className="text-sm text-brand-600 hover:underline">
											View →
										</Link>
									</td>
								</tr>
							);
						})}
					</AdminTable>
					{clients.length === 0 && <EmptyState icon="👥" title="No clients" />}
				</Card>
			)}
		</div>
	);
}

// ─── Application view helpers ─────────────────────────────────────────────────

const BREED_LABELS: Record<string, string> = {
	f1_goldendoodle: 'F1 Goldendoodle',
	f1b_goldendoodle: 'F1b Goldendoodle',
	f1_border_doodle: 'F1 Border Doodle',
	f1_mini_biewer_doodle: 'F1 Mini Biewer Doodle',
	red_tuxedo_french_poodle: 'Red Tuxedo French Poodle',
};

const SIZE_LABELS: Record<string, string> = {
	standard: 'Standard',
	miniature: 'Miniature',
	dwarf: 'Dwarf',
	border_doodle: 'Border Doodle',
	biewer_doodle: 'Biewer Doodle',
	standard_poodle: 'Standard Poodle',
	moyen_poodle: 'Moyen Poodle',
};

function formatBreedSize(raw: string | null | undefined): { breed: string; size: string | null } | null {
	if (!raw) return null;
	const [breedRaw, sizeRaw] = raw.split(' - ');
	return {
		breed: BREED_LABELS[breedRaw] ?? breedRaw,
		size: sizeRaw ? (SIZE_LABELS[sizeRaw] ?? sizeRaw) : null,
	};
}

function BreedSizeDisplay({ raw }: { raw: string | null | undefined }) {
	const parsed = formatBreedSize(raw);
	if (!parsed) return <span className="text-stone-300">—</span>;
	return (
		<span className="text-stone-800">
			<span className="font-medium">{parsed.breed}</span>
			{parsed.size && <span className="text-stone-400"> · {parsed.size}</span>}
		</span>
	);
}

function AppField({ label, value }: { label: string; value: unknown }) {
	const display = () => {
		if (value === null || value === undefined || value === '') return <span className="text-stone-300">—</span>;
		if (typeof value === 'boolean') return value
			? <span className="text-green-600 font-medium">Yes</span>
			: <span className="text-stone-400">No</span>;
		if (Array.isArray(value)) return value.length ? String(value.join(', ')) : <span className="text-stone-300">—</span>;
		const str = String(value);
		if (str === 'true') return <span className="text-green-600 font-medium">Yes</span>;
		if (str === 'false') return <span className="text-stone-400">No</span>;
		return <span className="text-stone-800">{str}</span>;
	};
	return (
		<div className="py-2.5 border-b border-stone-100 last:border-0 grid grid-cols-2 gap-4 items-start">
			<dt className="text-xs text-stone-400 pt-0.5">{label}</dt>
			<dd className="text-sm">{display()}</dd>
		</div>
	);
}

function AppSection({ title, fields }: { title: string; fields: { label: string; value: unknown }[] }) {
	const visible = fields.filter(({ value }) => value !== null && value !== undefined && value !== '');
	if (visible.length === 0) return null;
	return (
		<div>
			<p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">{title}</p>
			<dl className="divide-y divide-stone-100">
				{visible.map(({ label, value }) => (
					<AppField key={label} label={label} value={value} />
				))}
			</dl>
		</div>
	);
}

// ─── Client detail ────────────────────────────────────────────────────────────

export function AdminClientDetail() {
	const { id } = useParams<{ id: string }>();
	const [client, setClient] = useState<Client | null>(null);
	const [loading, setLoading] = useState(true);
	const [newMsg, setNewMsg] = useState('');
	const [sending, setSending] = useState(false);

	const load = () => {
		if (!id) return;
		api.clients.admin({ id }).get().then(({ data }) => {
			if (data) setClient(data as Client);
			setLoading(false);
		});
	};

	useEffect(() => { load(); }, [id]);

	const updateStage = async (stage: string) => {
		if (!id) return;
		await api.clients.admin({ id }).patch({ stage: stage as Client['stage'] });
		load();
	};

	const sendMsg = async () => {
		if (!id || !newMsg.trim()) return;
		setSending(true);
		await api.messages.admin({ clientId: id }).post({ body: newMsg });
		setNewMsg('');
		setSending(false);
	};

	if (loading) return <LoadingPage />;
	if (!client) return <div className="p-8 text-stone-500">Client not found.</div>;

	const a = client.applicationData as Record<string, unknown>;

	const readyLabels: Record<string, string> = {
		asap: 'As soon as possible',
		'6_months': 'In about 6 months',
		'1_year': 'In about a year',
	};

	return (
		<div className="p-8 max-w-4xl">
			<Link to="/admin/clients" className="text-sm text-stone-400 hover:text-stone-600 mb-6 inline-block">← Clients</Link>

			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="font-serif text-2xl font-bold text-stone-900">
						{client.firstName} {client.lastName}
					</h1>
					<p className="text-stone-500 text-sm">{client.email}</p>
					{client.phone && <p className="text-stone-400 text-sm">{client.phone}</p>}
					{(client.city || client.country) && (
						<p className="text-stone-400 text-sm">{[client.city, client.country].filter(Boolean).join(', ')}</p>
					)}
					{a.preferredBreedSize && (() => {
						const p = formatBreedSize(a.preferredBreedSize as string);
						return p ? (
							<div className="mt-3 flex items-center gap-2 flex-wrap">
								<span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-xs font-semibold text-brand-700">
									🐾 {p.breed}{p.size ? ` · ${p.size}` : ''}
								</span>
								{a.preferredSex && a.preferredSex !== 'no_preference' && (
									<span className="inline-flex items-center px-2.5 py-1 bg-stone-100 rounded-full text-xs font-medium text-stone-600 capitalize">
										{String(a.preferredSex)}
									</span>
								)}
							</div>
						) : null;
					})()}
				</div>
				<StageBadge stage={client.stage} />
			</div>

			{/* Stage management */}
			<Card className="p-5 mb-6">
				<h3 className="font-medium text-stone-900 mb-3">Move Stage</h3>
				<div className="flex flex-wrap gap-2">
					{(['enquiry', 'reviewed', 'waitlisted', 'matched', 'placed', 'declined'] as const).map((s) => (
						<button
							key={s}
							onClick={() => updateStage(s)}
							className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
								client.stage === s
									? 'bg-stone-900 text-white'
									: 'bg-stone-100 text-stone-600 hover:bg-stone-200'
							}`}
						>
							{s}
						</button>
					))}
				</div>
			</Card>

			{/* Application */}
			<Card className="p-6 mb-6">
				<h3 className="font-medium text-stone-900 mb-6">Application</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<AppSection title="Personal Details" fields={[
						{ label: 'Primary caregiver', value: a.primaryCaregiver },
					]} />
					<AppSection title="Home & Life" fields={[
						{ label: 'Home ownership', value: a.residenceOwnership },
						{ label: 'Type of home', value: a.livingType },
						{ label: 'Home type (other)', value: a.otherLivingType },
						{ label: 'Has fenced yard', value: a.hasGarden },
						{ label: 'Yard size', value: a.yardSize },
						{ label: 'Pool or open driveway', value: a.hasPoolOrDriveway },
						{ label: 'Pool/driveway fenced off', value: a.poolDrivewayFenced },
						{ label: 'Neighbourhood restrictions', value: a.neighbourhoodRestrictions },
						{ label: 'Restriction details', value: a.neighbourhoodRestrictionsDetails },
						{ label: 'Dog lives indoors', value: a.dogLivesIndoors },
						{ label: 'Daytime location', value: a.puppyDaytimeLocation },
						{ label: 'Hours alone per day', value: a.hoursAlonePerDay },
						{ label: 'Someone home during the day', value: a.someoneHomeDuringDay },
						{ label: 'Alone arrangements', value: a.aloneArrangements },
						{ label: 'Activity level & hobbies', value: a.activityLevel },
						{ label: 'All family members agree', value: a.allFamilyMembersAgree },
						{ label: 'Dog allergies in household', value: a.allergiesToDogs },
						{ label: 'Has children', value: a.hasChildren },
						{ label: "Children's ages & genders", value: a.childrenGenderAges },
						{ label: 'Has other pets', value: a.hasOtherPets },
						{ label: 'Other pets', value: a.otherPetsDescription },
					]} />
					<AppSection title="Experience" fields={[
						{ label: 'Previous dog experience', value: a.previousDogExperience },
						{ label: 'Breeds owned previously', value: a.breedsOwnedPast },
						{ label: 'Experience description', value: a.experienceDescription },
						{ label: 'Returned pet to breeder', value: a.returnedPetToBreeder },
						{ label: 'Return circumstances', value: a.returnedPetDetails },
						{ label: 'Given a pet away', value: a.givenPetAway },
						{ label: 'Given away circumstances', value: a.givenPetAwayDetails },
						{ label: 'Willing for obedience classes', value: a.willingForObedienceClasses },
						{ label: 'References', value: a.references },
					]} />
					<div>
						<p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">Puppy Preferences</p>
						<dl className="divide-y divide-stone-100">
							{a.puppyPurpose && <AppField label="Purpose" value={a.puppyPurpose} />}
							{a.readyTimeframe && <AppField label="Ready timeframe" value={readyLabels[a.readyTimeframe as string] ?? a.readyTimeframe} />}
							{a.preferredBreedSize && (
								<div className="py-2.5 border-b border-stone-100 grid grid-cols-2 gap-4 items-start">
									<dt className="text-xs text-stone-400 pt-0.5">First choice</dt>
									<dd className="text-sm"><BreedSizeDisplay raw={a.preferredBreedSize as string} /></dd>
								</div>
							)}
							{a.secondChoiceBreedSize && (
								<div className="py-2.5 border-b border-stone-100 grid grid-cols-2 gap-4 items-start">
									<dt className="text-xs text-stone-400 pt-0.5">Second choice</dt>
									<dd className="text-sm"><BreedSizeDisplay raw={a.secondChoiceBreedSize as string} /></dd>
								</div>
							)}
							<AppField label="Open to other breed/size" value={a.considerOtherBreedSize} />
							{a.preferredSex && (
								<div className="py-2.5 border-b border-stone-100 grid grid-cols-2 gap-4 items-start">
									<dt className="text-xs text-stone-400 pt-0.5">Preferred sex</dt>
									<dd className="text-sm text-stone-800">
										{a.preferredSex === 'no_preference' ? 'No preference' : <span className="capitalize">{String(a.preferredSex)}</span>}
									</dd>
								</div>
							)}
							<AppField label="Open to opposite sex" value={a.considerOppositeSex} />
							{a.preferredColour && <AppField label="Preferred colour" value={a.preferredColour} />}
							<AppField label="Open to other colour" value={a.considerOtherColour} />
							<AppField label="Would consider rehome" value={a.considerRehome} />
							<AppField label="Agreed to contract" value={a.agreedToContract} />
						</dl>
					</div>
				</div>
			</Card>

			{/* Quick message */}
			<Card className="p-5">
				<h3 className="font-medium text-stone-900 mb-3">Send Message</h3>
				<div className="flex gap-3">
					<input
						value={newMsg}
						onChange={(e) => setNewMsg(e.target.value)}
						placeholder="Message to client…"
						className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
					/>
					<button
						onClick={sendMsg}
						disabled={sending || !newMsg.trim()}
						className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
					>
						{sending ? '…' : 'Send'}
					</button>
				</div>
			</Card>
		</div>
	);
}

// ─── Updates ─────────────────────────────────────────────────────────────────

export function AdminUpdates() {
	const [updates, setUpdates] = useState<Update[]>([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState({ title: '', body: '', targetType: 'litter', targetId: '', weekNumber: '', isPublished: false });
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		api.updates.admin.get().then(({ data }) => {
			if (data) setUpdates(data as Update[]);
			setLoading(false);
		});
	}, []);

	const submit = async () => {
		setSaving(true);
		await api.updates.post({
			title: form.title,
			body: form.body,
			targetType: form.targetType as 'litter' | 'puppy' | 'client',
			targetId: form.targetId,
			weekNumber: form.weekNumber ? parseInt(form.weekNumber) : undefined,
			isPublished: form.isPublished,
		});
		setSaving(false);
		setForm({ title: '', body: '', targetType: 'litter', targetId: '', weekNumber: '', isPublished: false });
		api.updates.admin.get().then(({ data }) => { if (data) setUpdates(data as Update[]); });
	};

	return (
		<div className="p-8 max-w-4xl">
			<PageHeader title="Updates" subtitle="Post puppy journal updates to clients." />

			<Card className="p-6 mb-8">
				<h2 className="font-medium text-stone-900 mb-4">New Update</h2>
				<div className="flex flex-col gap-4">
					<input
						value={form.title}
						onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
						placeholder="Title"
						className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
					/>
					<textarea
						value={form.body}
						onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
						placeholder="What's happening with the puppies this week?"
						rows={4}
						className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
					/>
					<div className="grid grid-cols-3 gap-3">
						<select
							value={form.targetType}
							onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))}
							className="px-3 py-2 border border-stone-200 rounded-lg text-sm"
						>
							<option value="litter">Litter</option>
							<option value="puppy">Puppy</option>
							<option value="client">Client</option>
						</select>
						<input
							value={form.targetId}
							onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
							placeholder="Target ID"
							className="px-3 py-2 border border-stone-200 rounded-lg text-sm"
						/>
						<input
							value={form.weekNumber}
							onChange={(e) => setForm((f) => ({ ...f, weekNumber: e.target.value }))}
							placeholder="Week # (optional)"
							type="number"
							className="px-3 py-2 border border-stone-200 rounded-lg text-sm"
						/>
					</div>
					<div className="flex items-center justify-between">
						<label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
							<input
								type="checkbox"
								checked={form.isPublished}
								onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
							/>
							Publish immediately
						</label>
						<button
							onClick={submit}
							disabled={saving || !form.title || !form.targetId}
							className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
						>
							{saving ? 'Posting…' : 'Post Update'}
						</button>
					</div>
				</div>
			</Card>

			{loading ? <LoadingPage /> : (
				<div className="flex flex-col gap-4">
					{updates.map((u) => (
						<Card key={u.id} className="p-4 flex items-start justify-between">
							<div>
								<p className="font-medium text-stone-900">{u.title}</p>
								<p className="text-sm text-stone-500 mt-1 line-clamp-1">{u.body}</p>
								<p className="text-xs text-stone-400 mt-1">
									{u.targetType} · {new Date(u.createdAt).toLocaleDateString()}
								</p>
							</div>
							<Badge variant={u.isPublished ? 'green' : 'amber'}>
								{u.isPublished ? 'Published' : 'Draft'}
							</Badge>
						</Card>
					))}
					{updates.length === 0 && <EmptyState icon="📷" title="No updates yet" />}
				</div>
			)}
		</div>
	);
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export function AdminWaitlist() {
	const [clients, setClients] = useState<Client[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.clients.admin.get({ query: { stage: 'waitlisted' } }).then(({ data }) => {
			if (data) setClients((data as Client[]).sort((a, b) => a.priority - b.priority));
			setLoading(false);
		});
	}, []);

	const move = async (index: number, direction: -1 | 1) => {
		const next = [...clients];
		const swapIdx = index + direction;
		if (swapIdx < 0 || swapIdx >= next.length) return;
		[next[index], next[swapIdx]] = [next[swapIdx], next[index]];
		const order = next.map((c, i) => ({ id: c.id, priority: (i + 1) * 10 }));
		setClients(next);
		await api.clients.admin.waitlist.reorder.patch({ order });
	};

	return (
		<div className="p-8 max-w-2xl">
			<PageHeader title="Waitlist" subtitle="Drag to reorder priority. Lower position = higher priority." />

			{loading ? <LoadingPage /> : (
				<Card>
					{clients.length === 0 ? (
						<EmptyState icon="📋" title="Waitlist is empty" />
					) : (
						<div className="divide-y divide-stone-100">
							{clients.map((client, i) => (
								<div key={client.id} className="flex items-center gap-4 px-5 py-4">
									<span className="text-stone-300 font-mono text-sm w-6 text-center">{i + 1}</span>
									<div className="flex-1">
										<p className="font-medium text-stone-900 text-sm">
											{client.firstName} {client.lastName}
										</p>
										<p className="text-xs text-stone-400">{client.email}</p>
									</div>
									<div className="text-xs text-stone-400">
										{(client.applicationData as Record<string, unknown>)?.preferredSex as string ?? '—'}
									</div>
									<div className="flex flex-col gap-0.5">
										<button onClick={() => move(i, -1)} className="text-stone-400 hover:text-stone-700 text-xs px-1">▲</button>
										<button onClick={() => move(i, 1)} className="text-stone-400 hover:text-stone-700 text-xs px-1">▼</button>
									</div>
									<Link to={`/admin/clients/${client.id}`} className="text-sm text-brand-600 hover:underline">
										View
									</Link>
								</div>
							))}
						</div>
					)}
				</Card>
			)}
		</div>
	);
}
