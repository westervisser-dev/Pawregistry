import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, Badge, PuppyStatusBadge, EmptyState } from '@/components/ui';
import type { Dog, Litter, LitterImage, MatchingClient } from '@paw-registry/shared';
import { BREEDS, BREED_SIZES, buildBreedSize, parseBreedSize, getBreedSizeLabel } from '@paw-registry/shared';
import { DeleteModal } from './_shared';

export function AdminLitterDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [litter, setLitter] = useState<Litter & { sire: Dog; dam: Dog; puppies: unknown[]; images: LitterImage[] } | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState('');
	const [newPuppy, setNewPuppy] = useState({ collarColour: '', sex: 'male' as const, colour: '' });
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteBlocking, setDeleteBlocking] = useState<string[] | null>(null);
	const [matchingClients, setMatchingClients] = useState<MatchingClient[]>([]);
	const [matchingLoading, setMatchingLoading] = useState(false);
	const [litterInterests, setLitterInterests] = useState<Array<{
		id: string; puppyId: string; clientId: string; status: string; createdAt: string;
		client: { id: string; firstName: string; lastName: string; email: string; city: string | null; stage: string; depositStatus: string };
	}>>([]);
	const [expandedPuppy, setExpandedPuppy] = useState<string | null>(null);
	const [updatingPuppyId, setUpdatingPuppyId] = useState<string | null>(null);
	const [approvingInterestId, setApprovingInterestId] = useState<string | null>(null);
	const [notifications, setNotifications] = useState<Array<{
		id: string; litterId: string; clientId: string; notifiedAt: string; createdAt: string;
		client: { id: string; firstName: string; lastName: string; email: string; city: string | null; priority: number; depositStatus: string };
	}>>([]);
	const [notifyCount, setNotifyCount] = useState(1);
	const [notifyConfirming, setNotifyConfirming] = useState(false);
	const [notifying, setNotifying] = useState(false);

	// New-litter form state
	const [dogs, setDogs] = useState<Dog[]>([]);
	const [newForm, setNewForm] = useState<{ name: string; breedKey: string; sizeKey: string; sireId: string; damId: string; status: string; expectedDate: string; notes: string; isPublic: boolean }>({
		name: '', breedKey: '', sizeKey: '', sireId: '', damId: '', status: 'planned', expectedDate: '', notes: '', isPublic: false,
	});
	const [galleryImages, setGalleryImages] = useState<LitterImage[]>([]);
	const [galleryError, setGalleryError] = useState('');
	const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
	const [pendingPuppies, setPendingPuppies] = useState<Array<{ collarColour: string; sex: 'male' | 'female'; colour: string }>>([]);
	const [newPuppyDraft, setNewPuppyDraft] = useState({ collarColour: '', sex: 'male' as const, colour: '' });

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
			if (data) {
				const d = data as typeof litter;
				setLitter(d);
				setGalleryImages(d?.images ?? []);
			}
			setLoading(false);
		});
		// Fetch matching clients
		setMatchingLoading(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters({ id }) as any)['matching-clients'].get().then(({ data }: { data: MatchingClient[] | null }) => {
			if (data) setMatchingClients(data);
			setMatchingLoading(false);
		}).catch(() => setMatchingLoading(false));
		// Fetch puppy interests
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters.admin as any).interests({ litterId: id }).get().then(({ data }: { data: typeof litterInterests | null }) => {
			if (data) setLitterInterests(data);
		}).catch(() => {});
		// Fetch litter notifications
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters.admin as any).notifications({ litterId: id }).get().then(({ data }: { data: typeof notifications | null }) => {
			if (data) setNotifications(data);
		}).catch(() => {});
	}, [id]);

	const createLitter = async () => {
		setFormError('');
		if (!newForm.name.trim() || !newForm.breedKey || !newForm.sireId || !newForm.damId) {
			setFormError('Name, Breed, Sire, and Dam are required.');
			return;
		}
		setSaving(true);
		try {
			const breedValue = newForm.breedKey ? buildBreedSize(newForm.breedKey, newForm.sizeKey || null) : null;
			const { data, error } = await api.litters.post({
				name: newForm.name,
				...(breedValue ? { breed: breedValue } : {}),
				sireId: newForm.sireId,
				damId: newForm.damId,
				status: newForm.status as 'planned' | 'confirmed' | 'born' | 'weaning' | 'available' | 'completed',
				...(newForm.expectedDate ? { expectedDate: newForm.expectedDate } : {}),
				...(newForm.notes ? { notes: newForm.notes } : {}),
				isPublic: newForm.isPublic,
			});
			if (error) { setFormError('Failed to save. Please try again.'); return; }
			if (data) {
				const newId = (data as Litter).id;
				for (const file of pendingPhotos.slice(0, 30)) {
					await api.litters({ id: newId }).gallery.post({ file });
				}
				for (const puppy of pendingPuppies) {
					await api.litters({ id: newId }).puppies.post(puppy);
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
		await api.litters({ id }).patch({ status } as Parameters<ReturnType<typeof api.litters>['patch']>[0]);
		// Re-fetch full litter to pick up any synced puppy statuses
		const { data: fresh } = await api.litters({ id }).get();
		if (fresh) setLitter(fresh as typeof litter);
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

	const deleteLitter = async () => {
		if (!id) return;
		setDeleting(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error } = await (api.litters({ id }) as any).delete();
		if (error) {
			const body = error.value as { blockingRecords?: string[] };
			setDeleteBlocking(body.blockingRecords ?? ['Unknown error']);
		} else {
			navigate('/admin/litters', { state: { toast: `${litter?.name ?? 'Litter'} deleted.` } });
		}
		setDeleting(false);
	};

	const updatePuppyStatus = async (puppyId: string, status: string) => {
		setUpdatingPuppyId(puppyId);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.litters.puppies({ puppyId }) as any).patch({ status });
		if (data && litter) {
			setLitter({
				...litter,
				puppies: litter.puppies.map((p: unknown) => {
					const pp = p as { id: string };
					return pp.id === puppyId ? { ...pp, status } : pp;
				}),
			});
		}
		setUpdatingPuppyId(null);
	};

	const handleInterestAction = async (interestId: string, status: 'approved' | 'rejected') => {
		setApprovingInterestId(interestId);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data } = await (api.litters.admin as any).interests({ litterId: interestId }).patch({ status });
		if (data) {
			// Refresh interests list
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.litters.admin as any).interests({ litterId: id }).get().then(({ data: fresh }: { data: typeof litterInterests | null }) => {
				if (fresh) setLitterInterests(fresh);
			});
			// If approved, update puppy status in local state
			if (status === 'approved') {
				const interest = litterInterests.find((i) => i.id === interestId);
				if (interest && litter) {
					setLitter({
						...litter,
						puppies: litter.puppies.map((p: unknown) => {
							const pp = p as { id: string; status: string };
							return pp.id === interest.puppyId ? { ...pp, status: 'reserved' } : pp;
						}),
					});
				}
			}
		}
		setApprovingInterestId(null);
	};

	const timeAgo = (dateStr: string) => {
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	};

	const notifiedMap = Object.fromEntries(notifications.map((n) => [n.clientId, n.notifiedAt]));

	const handleNotify = async () => {
		if (!id) return;
		setNotifying(true);
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (api.litters.admin as any).notifications({ litterId: id }).post({ count: notifyCount });
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.litters.admin as any).notifications({ litterId: id }).get().then(({ data: fresh }: { data: typeof notifications | null }) => {
				if (fresh) setNotifications(fresh);
			});
		} catch { /* ignore */ }
		setNotifying(false);
		setNotifyConfirming(false);
	};

	if (loading) return <LoadingPage />;

	// ── New litter form ────────────────────────────────────────────────────────
	if (id === 'new') {
		const setF = (key: keyof typeof newForm, value: string) => setNewForm((f) => ({ ...f, [key]: value }));
		return (
			<div className="p-8 max-w-3xl">
				<Link to="/admin/litters" className="text-sm text-warm-400 hover:text-warm-600 mb-6 inline-block">← Litters</Link>
				<PageHeader title="New Litter" />
				<Card className="p-6 flex flex-col gap-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">
								Litter Name<span className="text-red-400 ml-0.5">*</span>
							</label>
							<input
								type="text"
								value={newForm.name}
								onChange={(e) => setF('name', e.target.value)}
								placeholder="e.g. Autumn 2025 Litter"
								className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Breed<span className="text-red-400 ml-0.5">*</span></label>
							<select
								value={newForm.breedKey}
								onChange={(e) => {
									const breed = e.target.value;
									const sizes = BREED_SIZES[breed] ?? [];
									const autoSize = sizes.length === 1 ? sizes[0].value : '';
									setNewForm((f) => ({ ...f, breedKey: breed, sizeKey: autoSize }));
								}}
								className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							>
								<option value="">Select breed…</option>
								{BREEDS.map((b) => (
									<option key={b.value} value={b.value}>{b.label}</option>
								))}
							</select>
							{newForm.breedKey && (BREED_SIZES[newForm.breedKey]?.length ?? 0) > 1 && (
								<select
									value={newForm.sizeKey}
									onChange={(e) => setNewForm((f) => ({ ...f, sizeKey: e.target.value }))}
									className="w-full mt-2 px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
								>
									<option value="">Select size…</option>
									{(BREED_SIZES[newForm.breedKey] ?? []).map((s) => (
										<option key={s.value} value={s.value}>{s.label}</option>
									))}
								</select>
							)}
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">
								Sire (Father)<span className="text-red-400 ml-0.5">*</span>
							</label>
							<select
								value={newForm.sireId}
								onChange={(e) => setF('sireId', e.target.value)}
								className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							>
								<option value="">Select sire…</option>
								{dogs.filter((d) => d.sex === 'male').map((d) => (
									<option key={d.id} value={d.id}>{d.name}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">
								Dam (Mother)<span className="text-red-400 ml-0.5">*</span>
							</label>
							<select
								value={newForm.damId}
								onChange={(e) => setF('damId', e.target.value)}
								className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							>
								<option value="">Select dam…</option>
								{dogs.filter((d) => d.sex === 'female').map((d) => (
									<option key={d.id} value={d.id}>{d.name}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Status</label>
							<select
								value={newForm.status}
								onChange={(e) => setF('status', e.target.value)}
								className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none"
							>
								{['planned', 'confirmed', 'born', 'weaning', 'available', 'completed'].map((s) => (
									<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-warm-500 mb-1">Expected Date</label>
							<input
								type="date"
								value={newForm.expectedDate}
								onChange={(e) => setF('expectedDate', e.target.value)}
								className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none"
							/>
						</div>
						<div className="col-span-2">
							<label className="block text-xs font-medium text-warm-500 mb-1">Notes</label>
							<textarea
								value={newForm.notes}
								onChange={(e) => setF('notes', e.target.value)}
								rows={3}
								className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none resize-none"
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
						<span className="text-sm text-warm-700">Visible on public site</span>
					</label>
					{/* Photos */}
					<div>
						<label className="block text-xs font-medium text-warm-500 mb-2">Photos</label>
						{pendingPhotos.length > 0 && (
							<div className="flex flex-wrap gap-2 mb-3">
								{pendingPhotos.map((file, i) => (
									<div key={i} className="relative w-16 h-16 flex-shrink-0">
										<img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover rounded-lg border border-warm-200" />
										<button
											type="button"
											onClick={() => setPendingPhotos((p) => p.filter((_, j) => j !== i))}
											className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs leading-none"
										>×</button>
									</div>
								))}
							</div>
						)}
						{pendingPhotos.length < 30 && (
							<label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-xs text-warm-600 hover:bg-warm-50 transition-colors">
								<span>Add photos</span>
								<input
									type="file"
									accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
									multiple
									onChange={(e) => {
										const files = Array.from(e.target.files ?? []);
										setPendingPhotos((p) => [...p, ...files].slice(0, 30));
										e.target.value = '';
									}}
									className="hidden"
								/>
							</label>
						)}
						{pendingPhotos.length > 0 && (
							<p className="text-xs text-warm-400 mt-1">{pendingPhotos.length} photo{pendingPhotos.length !== 1 ? 's' : ''} selected — uploaded after creation</p>
						)}
					</div>

					{/* Puppies */}
					<div>
						<label className="block text-xs font-medium text-warm-500 mb-2">Puppies</label>
						{pendingPuppies.length > 0 && (
							<div className="space-y-1 mb-3">
								{pendingPuppies.map((p, i) => (
									<div key={i} className="flex items-center gap-3 py-1.5 px-3 bg-warm-50 rounded-lg text-sm">
										<span className="w-3 h-3 rounded-full border border-warm-300 flex-shrink-0" style={{ background: p.collarColour }} />
										<span className="text-warm-700">{p.colour} {p.sex}</span>
										<button
											type="button"
											onClick={() => setPendingPuppies((list) => list.filter((_, j) => j !== i))}
											className="ml-auto text-warm-400 hover:text-red-500 text-xs"
										>Remove</button>
									</div>
								))}
							</div>
						)}
						<div className="flex gap-2">
							<input
								placeholder="Collar colour"
								value={newPuppyDraft.collarColour}
								onChange={(e) => setNewPuppyDraft((p) => ({ ...p, collarColour: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
							<input
								placeholder="Coat colour"
								value={newPuppyDraft.colour}
								onChange={(e) => setNewPuppyDraft((p) => ({ ...p, colour: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
							<select
								value={newPuppyDraft.sex}
								onChange={(e) => setNewPuppyDraft((p) => ({ ...p, sex: e.target.value as 'male' | 'female' }))}
								className="px-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
							>
								<option value="male">M</option>
								<option value="female">F</option>
							</select>
							<button
								type="button"
								onClick={() => {
									if (!newPuppyDraft.collarColour || !newPuppyDraft.colour) return;
									setPendingPuppies((p) => [...p, newPuppyDraft]);
									setNewPuppyDraft({ collarColour: '', sex: 'male', colour: '' });
								}}
								className="px-4 py-2 bg-warm-100 text-warm-700 text-sm rounded-lg hover:bg-warm-200 transition-colors"
							>Add</button>
						</div>
					</div>

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

	if (!litter) return <div className="p-8 text-warm-500">Litter not found.</div>;

	// Eden Treaty auto-deserialises ISO date strings to Date objects — convert back to readable strings
	const fmtDate = (d: Date | string | null | undefined) =>
		d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

	const statuses = ['planned', 'confirmed', 'born', 'weaning', 'available', 'completed'];

	return (
		<div className="p-8 max-w-4xl">
			<PageHeader
				title={<span className="flex items-center gap-3">{litter.name}{litter.breed && <Badge variant="default">{getBreedSizeLabel(litter.breed)}</Badge>}</span>}
				subtitle={`${(litter as typeof litter & { sire: Dog }).sire?.name ?? '—'} × ${(litter as typeof litter & { dam: Dog }).dam?.name ?? '—'}`}
				action={
					<button onClick={() => navigate('/admin/litters')} className="text-sm text-warm-500 hover:text-warm-700">
						← Back
					</button>
				}
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

				<Card className="p-6 md:col-span-2">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-warm-800">Gallery</h3>
						<span className="text-xs text-warm-400">{galleryImages.length}/30 photos</span>
					</div>
					<div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-4">
						{galleryImages.map((img) => (
							<div key={img.id} className="relative aspect-square">
								<img src={img.url} alt="Gallery" className="w-full h-full object-cover rounded-lg border border-warm-200" />
								<button
									type="button"
									onClick={async () => {
										setGalleryError('');
										const { error } = await api.litters({ id: id! }).gallery({ imageId: img.id }).delete();
										if (error) { setGalleryError('Failed to delete image.'); return; }
										setGalleryImages((prev) => prev.filter((i) => i.id !== img.id));
									}}
									className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs leading-none transition-colors"
									aria-label="Remove image"
								>
									×
								</button>
							</div>
						))}
						{galleryImages.length === 0 && (
							<p className="text-xs text-warm-400 col-span-full">No photos yet.</p>
						)}
					</div>
					<div className="flex items-center gap-3">
						{galleryImages.length < 30 ? (
							<label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-xs text-warm-600 hover:bg-warm-50 transition-colors">
								<span>Upload photos</span>
								<input
									type="file"
									accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
									multiple
									onChange={async (e) => {
										setGalleryError('');
										const files = Array.from(e.target.files ?? []);
										e.target.value = '';
										if (!files.length || !id) return;
										const remaining = 30 - galleryImages.length;
										for (const file of files.slice(0, remaining)) {
											const { data, error } = await api.litters({ id }).gallery.post({ file });
											if (error) { setGalleryError('One or more uploads failed.'); break; }
											if (data) setGalleryImages((prev) => [...prev, data as LitterImage]);
										}
									}}
									className="hidden"
								/>
							</label>
						) : (
							<p className="text-xs text-warm-400">Maximum of 30 photos reached.</p>
						)}
					</div>
					{galleryError && <p className="text-xs text-red-500 mt-2">{galleryError}</p>}
				</Card>

				<Card className="p-6">
					<h3 className="font-semibold text-warm-800 mb-4">Status</h3>
					<div className="flex flex-wrap gap-2">
						{statuses.map((s) => (
							<button
								key={s}
								onClick={() => updateStatus(s)}
								disabled={saving}
								className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
									litter.status === s
										? 'bg-brand-500 text-white'
										: 'bg-warm-100 text-warm-600 hover:bg-warm-200'
								}`}
							>
								{s}
							</button>
						))}
					</div>
					<div className="mt-4 pt-4 border-t border-black/[0.05]">
						<label className="flex items-center gap-3 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={litter.isPublic}
								onChange={togglePublic}
								className="w-4 h-4 accent-brand-500"
							/>
							<span className="text-sm text-warm-700">Visible on public site</span>
						</label>
					</div>
				</Card>

				<Card className="p-6">
					<h3 className="font-semibold text-warm-800 mb-4">Details</h3>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-warm-500">Whelp date</span>
							<span>{fmtDate(litter.whelpDate)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-warm-500">Expected</span>
							<span>{fmtDate(litter.expectedDate)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-warm-500">Puppies</span>
							<span>{litter.puppyCount ?? '—'}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-warm-500">Deposit</span>
							<span>{litter.depositAmount ? `R${litter.depositAmount}` : '—'}</span>
						</div>
					</div>
				</Card>
			</div>

			<Card className="p-6 mb-6">
				<h3 className="font-semibold text-warm-800 mb-4">Puppies ({litter.puppies.length})</h3>
				{litter.puppies.length === 0 ? (
					<EmptyState icon="🐶" title="No puppies recorded yet" />
				) : (
					<div className="divide-y divide-black/[0.05]">
						{(litter.puppies as Array<{ id: string; collarColour: string; sex: string; colour: string; status: string; currentWeight: number | null }>).map((p) => {
							const pendingInterests = litterInterests.filter((i) => i.puppyId === p.id && i.status === 'pending');
							const allInterests = litterInterests.filter((i) => i.puppyId === p.id);
							const isExpanded = expandedPuppy === p.id;

							return (
								<div key={p.id}>
									<div className="flex items-center gap-3 py-3">
										<span className="w-4 h-4 rounded-full border border-warm-300 flex-shrink-0" style={{ background: p.collarColour }} />
										<span className="text-sm font-medium text-warm-800 flex-1">{p.colour} · {p.sex}</span>
										{/* Inline status selector */}
										<select
											value={p.status}
											disabled={updatingPuppyId === p.id}
											onChange={(e) => updatePuppyStatus(p.id, e.target.value)}
											className="px-2 py-1 text-xs border border-warm-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-300 bg-white disabled:opacity-50"
										>
											{['available', 'reserved', 'placed', 'retained', 'not_for_sale'].map((s) => (
												<option key={s} value={s}>{s.replace('_', ' ')}</option>
											))}
										</select>
										{/* Interest count badge */}
										{allInterests.length > 0 && (
											<button
												onClick={() => setExpandedPuppy(isExpanded ? null : p.id)}
												className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
													pendingInterests.length > 0
														? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
														: 'bg-warm-100 text-warm-600 hover:bg-warm-200'
												}`}
											>
												{pendingInterests.length > 0 ? `${pendingInterests.length} pending` : `${allInterests.length} interested`}
												<span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
											</button>
										)}
									</div>
									{/* Expanded interests */}
									{isExpanded && allInterests.length > 0 && (
										<div className="mb-3 ml-7 space-y-2">
											{allInterests.map((interest) => (
												<div
													key={interest.id}
													className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
														interest.status === 'approved' ? 'bg-green-50 border border-green-200' :
														interest.status === 'rejected' ? 'bg-warm-50 border border-warm-200 opacity-60' :
														'bg-amber-50 border border-amber-200'
													}`}
												>
													<div className="flex-1 min-w-0">
														<Link to={`/admin/clients/${interest.client.id}`} className="font-medium text-warm-900 hover:text-brand-600 truncate block">
															{interest.client.firstName} {interest.client.lastName}
														</Link>
														<div className="flex items-center gap-2 mt-0.5">
															{interest.client.city && <span className="text-xs text-warm-400">{interest.client.city}</span>}
															<span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
																interest.client.depositStatus === 'paid' ? 'bg-green-100 text-green-700' :
																interest.client.depositStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
																'bg-warm-100 text-warm-600'
															}`}>
																{interest.client.depositStatus === 'paid' ? 'Deposit paid' :
																 interest.client.depositStatus === 'pending' ? 'Deposit pending' : 'No deposit'}
															</span>
														</div>
													</div>
													{interest.status === 'pending' ? (
														<div className="flex items-center gap-1.5 flex-shrink-0">
															<button
																onClick={() => handleInterestAction(interest.id, 'approved')}
																disabled={approvingInterestId === interest.id}
																className="px-2.5 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
															>
																Approve
															</button>
															<button
																onClick={() => handleInterestAction(interest.id, 'rejected')}
																disabled={approvingInterestId === interest.id}
																className="px-2.5 py-1 bg-warm-200 text-warm-700 text-xs rounded-lg hover:bg-warm-300 disabled:opacity-50 transition-colors"
															>
																Reject
															</button>
														</div>
													) : (
														<span className={`text-xs font-medium flex-shrink-0 ${
															interest.status === 'approved' ? 'text-green-600' : 'text-warm-400'
														}`}>
															{interest.status}
														</span>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}

				<div className="mt-4 pt-4 border-t border-black/[0.05]">
					{['planned', 'confirmed'].includes(litter.status) ? (
						<p className="text-xs text-warm-400">Puppies can be added once the litter is born.</p>
					) : (
						<>
							<p className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-3">Add puppy</p>
							<div className="flex gap-2">
								<input
									placeholder="Collar colour"
									value={newPuppy.collarColour}
									onChange={(e) => setNewPuppy((p) => ({ ...p, collarColour: e.target.value }))}
									className="flex-1 px-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
								/>
								<input
									placeholder="Coat colour"
									value={newPuppy.colour}
									onChange={(e) => setNewPuppy((p) => ({ ...p, colour: e.target.value }))}
									className="flex-1 px-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
								/>
								<select
									value={newPuppy.sex}
									onChange={(e) => setNewPuppy((p) => ({ ...p, sex: e.target.value as 'male' | 'female' }))}
									className="px-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
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
						</>
					)}
				</div>
			</Card>

			{/* Potential Clients */}
			<Card className="p-6 mb-6">
				<div className="flex items-center justify-between mb-3">
					<h3 className="font-semibold text-warm-800">Potential Clients</h3>
					{matchingClients.length > 0 && (
						<span className="text-xs text-warm-400">{matchingClients.length} match{matchingClients.length !== 1 ? 'es' : ''}</span>
					)}
				</div>

				{/* Notification controls */}
				{!matchingLoading && matchingClients.length > 0 && (
					<div className="mb-4 p-3 rounded-lg bg-warm-50 border border-warm-200 flex items-center justify-between gap-3">
						<p className="text-xs text-warm-600">
							{notifications.length > 0
								? `${notifications.length} client${notifications.length !== 1 ? 's' : ''} notified about this litter`
								: 'No clients notified yet — notify by waitlist position'}
						</p>
						{!notifyConfirming ? (
							<button
								onClick={() => { setNotifyCount(1); setNotifyConfirming(true); }}
								className="flex-shrink-0 px-3 py-1.5 text-xs bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors"
							>
								{notifications.length > 0 ? 'Extend to next…' : 'Notify top…'}
							</button>
						) : (
							<div className="flex items-center gap-2 flex-shrink-0">
								<span className="text-xs text-warm-600">Notify</span>
								<input
									type="number"
									min={1}
									max={matchingClients.length}
									value={notifyCount}
									onChange={(e) => setNotifyCount(Math.max(1, parseInt(e.target.value) || 1))}
									className="w-14 px-2 py-1 text-xs border border-warm-300 rounded-md text-center"
								/>
								<span className="text-xs text-warm-600">clients</span>
								<button
									onClick={handleNotify}
									disabled={notifying}
									className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-md hover:bg-brand-600 disabled:opacity-50 transition-colors"
								>
									{notifying ? 'Sending…' : 'Confirm'}
								</button>
								<button
									onClick={() => setNotifyConfirming(false)}
									className="px-3 py-1.5 text-xs border border-warm-300 text-warm-600 rounded-md hover:bg-warm-100 transition-colors"
								>
									Cancel
								</button>
							</div>
						)}
					</div>
				)}

				{matchingLoading ? (
					<p className="text-sm text-warm-400">Loading matches…</p>
				) : !litter.breed ? (
					<p className="text-sm text-warm-400">Set a breed on this litter to see matching clients.</p>
				) : matchingClients.length === 0 ? (
					<EmptyState icon="👥" title="No matching clients" />
				) : (
					<div className="space-y-2">
						{[...matchingClients].sort((a, b) => a.priority - b.priority).map((mc, i) => {
							const notifAt = notifiedMap[mc.id];
							return (
								<Link
									key={mc.id}
									to={`/admin/clients/${mc.id}`}
									className="block p-3.5 rounded-lg border border-warm-200 hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0 flex gap-3 items-start">
											<div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-8">
												<span className="text-sm font-bold text-warm-700">#{mc.waitlistPosition ?? i + 1}</span>
												<span className="text-[9px] font-medium text-warm-400 uppercase tracking-wide leading-none">wait</span>
												<span className="text-[9px] font-medium text-warm-400 uppercase tracking-wide leading-none">list</span>
											</div>
											<div className="min-w-0">
												<div className="flex items-center gap-1.5 flex-wrap">
													<span className="font-medium text-sm text-warm-900">{mc.firstName} {mc.lastName}</span>
													{mc.depositStatus === 'paid' ? (
														<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Deposit · Paid</span>
													) : mc.depositStatus === 'pending' ? (
														<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Deposit · Pending</span>
													) : (
														<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-warm-100 text-warm-500">No Deposit</span>
													)}
													{notifAt && (
														<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
															Notified {timeAgo(notifAt)}
														</span>
													)}
												</div>
												{mc.city && <p className="text-[11px] text-warm-400 mt-0.5">{mc.city}</p>}
												{mc.matchReasons.length > 0 && (
													<div className="flex flex-wrap gap-1 mt-1.5">
														{mc.matchReasons.filter((r) => !r.startsWith('Deposit')).slice(0, 3).map((reason) => (
															<span
																key={reason}
																className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
																	reason.startsWith('First choice') ? 'bg-green-100 text-green-700' :
																	reason.startsWith('Second choice') ? 'bg-blue-100 text-blue-700' :
																	reason.includes('Sex') || reason.includes('sex') ? 'bg-purple-100 text-purple-700' :
																	reason.includes('olour') ? 'bg-pink-100 text-pink-700' :
																	reason.includes('Deposit') ? 'bg-amber-100 text-amber-700' :
																	'bg-warm-100 text-warm-600'
																}`}
															>
																{reason}
															</span>
														))}
													</div>
												)}
											</div>
										</div>
										<div className="flex-shrink-0 text-right">
											<div className="text-sm font-bold text-brand-600">{mc.score}</div>
											<div className="text-[10px] text-warm-400">pts</div>
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</Card>

			<button
				onClick={() => { setDeleteBlocking(null); setDeleteOpen(true); }}
				className="inline-flex items-center gap-2 mt-8 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 hover:border-red-300 transition-colors"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
				Delete litter
			</button>
			<DeleteModal
				open={deleteOpen}
				entityLabel={litter?.name ?? 'this litter'}
				onClose={() => setDeleteOpen(false)}
				onConfirm={deleteLitter}
				deleting={deleting}
				blockingRecords={deleteBlocking}
			/>
		</div>
	);
}
