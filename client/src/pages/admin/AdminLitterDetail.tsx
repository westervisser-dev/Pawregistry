import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader, Badge, PuppyStatusBadge, EmptyState } from '@/components/ui';
import type { Litter, LitterImage, LitterStatus, MatchingClient, PuppyImage } from '@paw-registry/shared';
import { BREEDS, BREED_SIZES, buildBreedSize, parseBreedSize, getBreedSizeLabel } from '@paw-registry/shared';
import { DeleteModal } from './_shared';

const COLLAR_COLOURS = [
	'aqua', 'black', 'blue', 'gray', 'green', 'lime', 'maroon', 'navy',
	'olive', 'orange', 'pink', 'purple', 'red', 'silver', 'white', 'yellow',
];

function NotifyTimer({ since }: { since: string }) {
	const [elapsed, setElapsed] = useState(() => Date.now() - new Date(since).getTime());
	const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		setElapsed(Date.now() - new Date(since).getTime());
		rafRef.current = setInterval(() => {
			setElapsed(Date.now() - new Date(since).getTime());
		}, 1000);
		return () => { if (rafRef.current) clearInterval(rafRef.current); };
	}, [since]);

	const totalSecs = Math.floor(elapsed / 1000);
	const hh = Math.floor(totalSecs / 3600);
	const mm = Math.floor((totalSecs % 3600) / 60);
	const display = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
	const isRecent = hh === 0 && mm < 60;

	return (
		<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
			<span className={`w-1 h-1 rounded-full ${isRecent ? 'bg-blue-400 animate-pulse' : 'bg-blue-300'}`} />
			<span className="font-mono tracking-tight">{display}</span>
		</span>
	);
}

export function AdminLitterDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [litter, setLitter] = useState<Litter & { puppies: unknown[]; images: LitterImage[] } | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState('');
	const [newPuppy, setNewPuppy] = useState({ collarColour: '', sex: 'male' as const, colour: '' });
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteBlocking, setDeleteBlocking] = useState<string[] | null>(null);
	const [matchingClients, setMatchingClients] = useState<MatchingClient[]>([]);
	const [matchingLoading, setMatchingLoading] = useState(false);
	const [puppyInterests, setPuppyInterests] = useState<Array<{
		id: string; puppyId: string; clientId: string; status: string; createdAt: string;
		client: { id: string; firstName: string; lastName: string; email: string; city: string | null; stage: string; depositStatus: string };
	}>>([]);
	const [clientLitterInterests, setClientLitterInterests] = useState<Array<{
		id: string; clientId: string; litterId: string; createdAt: string;
		client: { id: string; firstName: string; lastName: string; email: string; city: string | null; depositStatus: string; priority: number; stage: string; waitlistPosition: number | null };
	}>>([]);
	const [expandedPuppy, setExpandedPuppy] = useState<string | null>(null);
	const [updatingPuppyId, setUpdatingPuppyId] = useState<string | null>(null);
	const [approvingInterestId, setApprovingInterestId] = useState<string | null>(null);
	const [notifications, setNotifications] = useState<Array<{
		id: string; litterId: string; clientId: string; notifiedAt: string; createdAt: string;
		client: { id: string; firstName: string; lastName: string; email: string; city: string | null; priority: number; depositStatus: string };
	}>>([]);
	const [notifyOpen, setNotifyOpen] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [notifying, setNotifying] = useState(false);
	const [masterListClients, setMasterListClients] = useState<Array<{ id: string; firstName: string; lastName: string; priority: number; depositStatus: string; waitlistPosition: number }>>([]);
	const [masterListLoading, setMasterListLoading] = useState(false);
	const [puppyImagesMap, setPuppyImagesMap] = useState<Record<string, PuppyImage[]>>({});
	const [puppyImageIndex, setPuppyImageIndex] = useState<Record<string, number>>({});
	const [uploadingPuppyId, setUploadingPuppyId] = useState<string | null>(null);
	const [uploadingPuppyImages, setUploadingPuppyImages] = useState(false);
	const [addingPuppy, setAddingPuppy] = useState(false);
	const [newPuppyDraftImageFile, setNewPuppyDraftImageFile] = useState<File | null>(null);
	const [newPuppyImageFile, setNewPuppyImageFile] = useState<File | null>(null);

	// New-litter form state
	const [newForm, setNewForm] = useState<{ name: string; breedKey: string; sizeKey: string; status: string; expectedDate: string; notes: string; isPublic: boolean }>({
		name: '', breedKey: '', sizeKey: '', status: 'planned', expectedDate: '', notes: '', isPublic: false,
	});
	const [galleryImages, setGalleryImages] = useState<LitterImage[]>([]);
	const [galleryError, setGalleryError] = useState('');
	const [galleryUploading, setGalleryUploading] = useState(false);
	const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
	const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
	const [pendingPuppies, setPendingPuppies] = useState<Array<{ collarColour: string; sex: 'male' | 'female'; colour: string; imageFile?: File }>>([]);
	const [newPuppyDraft, setNewPuppyDraft] = useState({ collarColour: '', sex: 'male' as const, colour: '' });

	useEffect(() => {
		if (!id) return;
		if (id === 'new') {
			setLoading(false);
			return;
		}
		setLoading(true);
		setLitter(null);
		api.litters({ id }).get().then(({ data }) => {
			if (data) {
				const d = data as typeof litter;
				setLitter(d);
				setGalleryImages(d?.images ?? []);
				const imagesMap: Record<string, PuppyImage[]> = {};
				(d?.puppies ?? []).forEach((p: unknown) => {
					const pp = p as { id: string; images?: PuppyImage[] };
					if (pp.images) imagesMap[pp.id] = pp.images;
				});
				setPuppyImagesMap(imagesMap);
			}
			setLoading(false);
		});
		// Fetch matching clients, then eagerly load platform waitlist
		setMatchingLoading(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters({ id }) as any)['matching-clients'].get().then(({ data }: { data: MatchingClient[] | null }) => {
			const matched = data ?? [];
			if (data) setMatchingClients(data);
			setMatchingLoading(false);
			setMasterListLoading(true);
			const matchingIds = new Set(matched.map((mc) => mc.id));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.clients as any).admin.get({ query: { stage: 'waitlisted' } }).then(({ data: wl }: { data: Array<{ id: string; firstName: string; lastName: string; priority: number; depositStatus: string }> | null }) => {
				if (wl) {
					const withPositions = wl.map((c, idx) => ({ ...c, waitlistPosition: idx + 1 }));
					setMasterListClients(withPositions.filter((c) => !matchingIds.has(c.id)));
				}
				setMasterListLoading(false);
			}).catch(() => setMasterListLoading(false));
		}).catch(() => setMatchingLoading(false));
		// Fetch puppy interests
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters.admin as any).interests({ litterId: id }).get().then(({ data }: { data: typeof puppyInterests | null }) => {
			if (data) setPuppyInterests(data);
		}).catch(() => {});
		// Fetch litter-level interests (clients who flagged interest in this litter)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters.admin as any)['litter-interests']({ litterId: id }).get().then(({ data }: { data: typeof clientLitterInterests | null }) => {
			if (data) setClientLitterInterests(data);
		}).catch(() => {});
		// Fetch litter notifications
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api.litters.admin as any).notifications({ litterId: id }).get().then(({ data }: { data: typeof notifications | null }) => {
			if (data) setNotifications(data);
		}).catch(() => {});
	}, [id]);

	const createLitter = async () => {
		setFormError('');
		if (!newForm.name.trim() || !newForm.breedKey) {
			setFormError('Name and Breed are required.');
			return;
		}
		setSaving(true);
		try {
			const breedValue = newForm.breedKey ? buildBreedSize(newForm.breedKey, newForm.sizeKey || null) : null;
			const { data, error } = await api.litters.post({
				name: newForm.name,
				...(breedValue ? { breed: breedValue } : {}),
				status: newForm.status as 'planned' | 'born' | 'available' | 'completed',
				...(newForm.expectedDate ? { expectedDate: newForm.expectedDate } : {}),
				...(newForm.notes ? { notes: newForm.notes } : {}),
				isPublic: newForm.isPublic,
			});
			if (error) { setFormError('Failed to save. Please try again.'); return; }
			if (data) {
				const newId = (data as Litter).id;
				const photos = pendingPhotos.slice(0, 30);
				if (photos.length > 0) {
					for (let i = 0; i < photos.length; i++) {
						setUploadProgress({ current: i + 1, total: photos.length });
						await api.litters({ id: newId }).gallery.post({ file: photos[i] });
					}
					setUploadProgress(null);
				}
				const puppiesWithImages = pendingPuppies.filter((p) => p.imageFile);
				if (puppiesWithImages.length > 0) setUploadingPuppyImages(true);
				for (const puppy of pendingPuppies) {
					const { data: puppyData } = await api.litters({ id: newId }).puppies.post({
						collarColour: puppy.collarColour,
						sex: puppy.sex,
						colour: puppy.colour,
					});
					if (puppyData && puppy.imageFile) {
						const created = puppyData as { id: string };
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						await (api.litters.puppies({ puppyId: created.id }) as any).images.post({ file: puppy.imageFile });
					}
				}
				setUploadingPuppyImages(false);
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
		setAddingPuppy(true);
		const { data } = await api.litters({ id }).puppies.post(newPuppy);
		if (data && litter) {
			const created = data as { id: string };
			let uploadedImage: PuppyImage | null = null;
			if (newPuppyImageFile) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const { data: imgData } = await (api.litters.puppies({ puppyId: created.id }) as any).images.post({ file: newPuppyImageFile });
				if (imgData) uploadedImage = imgData as PuppyImage;
				setNewPuppyImageFile(null);
			}
			// Single update: row appears fully-formed with image already present
			setLitter({ ...litter, puppies: [...litter.puppies, data as unknown] });
			if (uploadedImage) {
				setPuppyImagesMap((prev) => ({
					...prev,
					[created.id]: [...(prev[created.id] ?? []), uploadedImage!],
				}));
			}
			setNewPuppy({ collarColour: '', sex: 'male', colour: '' });
		}
		setAddingPuppy(false);
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
			// Refresh puppy interests list
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.litters.admin as any).interests({ litterId: id }).get().then(({ data: fresh }: { data: typeof puppyInterests | null }) => {
				if (fresh) setPuppyInterests(fresh);
			});
			// Re-fetch litter to reflect updated puppy status
			if (id) {
				api.litters({ id }).get().then(({ data: fresh }) => {
					if (fresh) setLitter(fresh as typeof litter);
				});
			}
		}
		setApprovingInterestId(null);
	};

	const prevPuppyImage = (puppyId: string) => {
		setPuppyImageIndex((prev) => {
			const images = puppyImagesMap[puppyId] ?? [];
			const current = prev[puppyId] ?? 0;
			return { ...prev, [puppyId]: current > 0 ? current - 1 : images.length - 1 };
		});
	};

	const nextPuppyImage = (puppyId: string) => {
		setPuppyImageIndex((prev) => {
			const images = puppyImagesMap[puppyId] ?? [];
			const current = prev[puppyId] ?? 0;
			return { ...prev, [puppyId]: current < images.length - 1 ? current + 1 : 0 };
		});
	};

	const handlePuppyImageUpload = async (puppyId: string, e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		e.target.value = '';
		if (!files.length) return;
		const existing = puppyImagesMap[puppyId] ?? [];
		const remaining = 10 - existing.length;
		if (remaining <= 0) return;
		setUploadingPuppyId(puppyId);
		for (const file of files.slice(0, remaining)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { data, error } = await (api.litters.puppies({ puppyId }) as any).images.post({ file });
			if (!error && data) {
				setPuppyImagesMap((prev) => ({
					...prev,
					[puppyId]: [...(prev[puppyId] ?? []), data as PuppyImage],
				}));
			}
		}
		setUploadingPuppyId(null);
	};

	const handlePuppyImageDelete = async (puppyId: string, imageId: string) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error } = await (api.litters.puppies({ puppyId }) as any).images({ imageId }).delete();
		if (!error) {
			const nextImages = (puppyImagesMap[puppyId] ?? []).filter((img) => img.id !== imageId);
			setPuppyImagesMap((prev) => ({ ...prev, [puppyId]: nextImages }));
			setPuppyImageIndex((prev) => ({
				...prev,
				[puppyId]: Math.min(prev[puppyId] ?? 0, Math.max(0, nextImages.length - 1)),
			}));
		}
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

	// Litter-interested clients filtered to waitlisted stage only
	const interestedWaitlisted = clientLitterInterests.filter((li) => li.client.stage === 'waitlisted');
	const interestedClientIdSet = new Set(interestedWaitlisted.map((li) => li.clientId));
	// Map of clientId -> MatchingClient for score/reasons carry-over
	const matchingClientMap = Object.fromEntries(matchingClients.map((mc) => [mc.id, mc]));
	// Exclude interested clients from litter-matched section to avoid duplication
	const dedupedMatchingClients = matchingClients.filter((mc) => !interestedClientIdSet.has(mc.id));
	// Exclude interested clients from global waitlist section too
	const dedupedMasterListClients = masterListClients.filter((c) => !interestedClientIdSet.has(c.id));

	const handleNotify = async () => {
		if (!id || selectedIds.size === 0) return;
		setNotifying(true);
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (api.litters.admin as any).notifications({ litterId: id }).post({ clientIds: [...selectedIds] });
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(api.litters.admin as any).notifications({ litterId: id }).get().then(({ data: fresh }: { data: typeof notifications | null }) => {
				if (fresh) setNotifications(fresh);
			});
		} catch { /* ignore */ }
		setNotifying(false);
		setNotifyOpen(false);
		setSelectedIds(new Set());
	};

	const openNotifyPanel = () => setNotifyOpen(true);

	const toggleSelection = (clientId: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			next.has(clientId) ? next.delete(clientId) : next.add(clientId);
			return next;
		});
	};

	const selectAllWaitlist = () => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			dedupedMatchingClients.filter((mc) => !notifiedMap[mc.id]).forEach((mc) => next.add(mc.id));
			return next;
		});
	};

	const selectAllPlatform = () => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			dedupedMasterListClients.filter((c) => !notifiedMap[c.id]).forEach((c) => next.add(c.id));
			return next;
		});
	};

	const selectAllInterested = () => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			interestedWaitlisted.filter((li) => !notifiedMap[li.clientId]).forEach((li) => next.add(li.clientId));
			return next;
		});
	};

	if (loading) return <LoadingPage />;

	// ── New litter form ────────────────────────────────────────────────────────
	if (id === 'new') {
		const setF = (key: keyof typeof newForm, value: string) => setNewForm((f) => ({ ...f, [key]: value }));
		return (
			<div className="p-4 md:p-8 max-w-3xl">
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
							<label className="block text-xs font-medium text-warm-500 mb-1">Status</label>
							<select
								value={newForm.status}
								onChange={(e) => setF('status', e.target.value)}
								className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none"
							>
								{['planned', 'born', 'available', 'completed'].map((s) => (
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
						{newForm.status === 'planned' ? (
							<p className="text-xs text-warm-400">Puppies can be added once the litter is born.</p>
						) : (
							<>
								{pendingPuppies.length > 0 && (
									<div className="space-y-1 mb-3">
										{pendingPuppies.map((p, i) => (
											<div key={i} className="flex items-center gap-3 py-1.5 px-3 bg-warm-50 rounded-lg text-sm">
												{p.imageFile ? (
													<img src={URL.createObjectURL(p.imageFile)} alt="" className="w-8 h-8 rounded-md object-cover border border-warm-200 flex-shrink-0" />
												) : (
													<span className="w-8 h-8 rounded-md border border-dashed border-warm-200 flex-shrink-0" />
												)}
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
								<div className="flex gap-2 items-center">
									{newPuppyDraftImageFile ? (
										<div className="relative w-9 h-9 flex-shrink-0">
											<img src={URL.createObjectURL(newPuppyDraftImageFile)} alt="" className="w-full h-full object-cover rounded-lg border border-warm-200" />
											<button type="button" onClick={() => setNewPuppyDraftImageFile(null)} className="absolute -top-1 -right-1 w-4 h-4 bg-black/50 hover:bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center">&#10005;</button>
										</div>
									) : (
										<label className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed border-warm-200 cursor-pointer hover:border-brand-300 hover:bg-warm-50 transition-colors" title="Add photo">
											<span className="text-warm-400 text-base leading-none">+</span>
											<input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/heic" onChange={(e) => { const f = e.target.files?.[0]; if (f) setNewPuppyDraftImageFile(f); e.target.value = ''; }} className="hidden" />
										</label>
									)}
									<select
										value={newPuppyDraft.collarColour}
										onChange={(e) => setNewPuppyDraft((p) => ({ ...p, collarColour: e.target.value }))}
										className="flex-1 px-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
									>
										<option value="">Collar colour</option>
										{COLLAR_COLOURS.map((c) => (
											<option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
										))}
									</select>
									<input
										placeholder="Puppy description"
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
											setPendingPuppies((p) => [...p, { ...newPuppyDraft, imageFile: newPuppyDraftImageFile ?? undefined }]);
											setNewPuppyDraft({ collarColour: '', sex: 'male', colour: '' });
											setNewPuppyDraftImageFile(null);
										}}
										className="px-4 py-2 bg-warm-100 text-warm-700 text-sm rounded-lg hover:bg-warm-200 transition-colors"
									>Add</button>
								</div>
							</>
						)}
					</div>

					{formError && <p className="text-sm text-red-600">{formError}</p>}
					<button
						onClick={createLitter}
						disabled={saving}
						className="self-start px-6 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
					>
						{uploadProgress
						? `Uploading photo ${uploadProgress.current} of ${uploadProgress.total}…`
						: uploadingPuppyImages ? 'Uploading image(s)…'
						: saving ? 'Saving…' : 'Create Litter'
					}
					</button>
				</Card>
			</div>
		);
	}

	if (!litter) return <div className="p-4 md:p-8 text-warm-500">Litter not found.</div>;

	// Eden Treaty auto-deserialises ISO date strings to Date objects — convert back to readable strings
	const fmtDate = (d: Date | string | null | undefined) =>
		d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

	const statuses = ['planned', 'born', 'available', 'completed'];

	return (
		<div className="p-4 md:p-8 max-w-4xl">
			<PageHeader
				title={litter.name}
				subtitle={[
					`${(litter as typeof litter & { sire: Dog }).sire?.name ?? '—'} × ${(litter as typeof litter & { dam: Dog }).dam?.name ?? '—'}`,
					litter.breed ? getBreedSizeLabel(litter.breed) : null,
				].filter(Boolean).join(' · ')}
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
						{galleryUploading ? (
							<p className="text-xs text-warm-500">Uploading images…</p>
						) : galleryImages.length < 30 ? (
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
										setGalleryUploading(true);
										for (const file of files.slice(0, remaining)) {
											const { data, error } = await api.litters({ id }).gallery.post({ file });
											if (error) { setGalleryError('One or more uploads failed.'); break; }
											if (data) setGalleryImages((prev) => [...prev, data as LitterImage]);
										}
										setGalleryUploading(false);
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
						<div className="flex justify-between items-center">
							<span className="text-warm-500">Expected</span>
							<input
								type="date"
								defaultValue={litter.expectedDate ? new Date(litter.expectedDate).toISOString().slice(0, 10) : ''}
								onChange={async (e) => {
									if (!id) return;
									const value = e.target.value || null;
									await api.litters({ id }).patch({ expectedDate: value } as Parameters<ReturnType<typeof api.litters>['patch']>[0]);
									setLitter((l) => l ? { ...l, expectedDate: value as unknown as Date } : l);
								}}
								className="px-2.5 py-1 border border-warm-200 rounded-lg text-sm text-warm-800 bg-warm-50 hover:border-warm-300 focus:outline-none focus:border-brand-400 focus:bg-white transition-colors cursor-pointer"
							/>
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
						{(litter.puppies as Array<{ id: string; collarColour: string; sex: string; colour: string; status: string; currentWeight: number | null; client: { id: string; firstName: string; lastName: string } | null }>).map((p) => {
							const pendingInterests = puppyInterests.filter((i) => i.puppyId === p.id && i.status === 'pending');
							const allInterests = puppyInterests.filter((i) => i.puppyId === p.id);
							const isExpanded = expandedPuppy === p.id;

							const puppyImgs = puppyImagesMap[p.id] ?? [];
							const imgIdx = puppyImageIndex[p.id] ?? 0;
							const currentImg = puppyImgs[imgIdx];

							return (
								<div key={p.id}>
									<div className="flex items-center gap-3 py-3">
										{/* Puppy image thumbnail with carousel */}
										<div className="flex flex-col items-center gap-0.5 flex-shrink-0">
											<div className="relative w-14 h-14 group">
												{currentImg ? (
													<>
														<img
															src={currentImg.url}
															alt=""
															className="w-full h-full object-cover rounded-lg border border-warm-200"
														/>
														{puppyImgs.length > 1 && (
															<>
																<button
																	type="button"
																	onClick={(e) => { e.stopPropagation(); prevPuppyImage(p.id); }}
																	className="absolute left-0.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-black/55 hover:bg-black/75 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
																>&#8249;</button>
																<button
																	type="button"
																	onClick={(e) => { e.stopPropagation(); nextPuppyImage(p.id); }}
																	className="absolute right-0.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-black/55 hover:bg-black/75 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
																>&#8250;</button>
																<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] bg-black/50 text-white px-1 rounded leading-tight whitespace-nowrap">{imgIdx + 1}/{puppyImgs.length}</span>
															</>
														)}
														<button
															type="button"
															onClick={(e) => { e.stopPropagation(); handlePuppyImageDelete(p.id, currentImg.id); }}
															className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 hover:bg-red-600 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
															aria-label="Delete image"
														>&#10005;</button>
													</>
												) : (
													<label className={`w-full h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-warm-300 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors ${uploadingPuppyId === p.id ? 'opacity-50 pointer-events-none' : ''}`}>
														<span className="text-warm-400 text-lg leading-none mb-0.5">{uploadingPuppyId === p.id ? '…' : '+'}</span>
														<input
															type="file"
															accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
															multiple
															onChange={(e) => handlePuppyImageUpload(p.id, e)}
															className="hidden"
															disabled={uploadingPuppyId === p.id}
														/>
													</label>
												)}
											</div>
											{currentImg && puppyImgs.length < 10 && (
												<label className="cursor-pointer text-[10px] text-warm-400 hover:text-brand-500 transition-colors leading-none">
													+ photo
													<input
														type="file"
														accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
														multiple
														onChange={(e) => handlePuppyImageUpload(p.id, e)}
														className="hidden"
														disabled={uploadingPuppyId === p.id}
													/>
												</label>
											)}
											{uploadingPuppyId === p.id && (
												<span className="text-[10px] text-warm-400 leading-none">uploading…</span>
											)}
										</div>
										<span className="w-4 h-4 rounded-full border border-warm-300 flex-shrink-0" style={{ background: p.collarColour }} />
										<span className="text-sm font-medium text-warm-800 flex-1">
											{p.colour} · {p.sex}
											{!!p.client && (
												<Link to={`/admin/clients/${p.client.id}`} className="ml-2 text-xs font-normal text-brand-600 hover:underline">
													{p.client.firstName} {p.client.lastName}
												</Link>
											)}
										</span>
										{/* Inline status selector */}
										<select
											value={p.status}
											disabled={updatingPuppyId === p.id}
											onChange={(e) => updatePuppyStatus(p.id, e.target.value)}
											className="px-2 py-1 text-xs border border-warm-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-300 bg-white disabled:opacity-50"
										>
											{['available', 'reserved', 'matched', 'matched_paid', 'retained', 'not_for_sale'].map((s) => (
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
					{litter.status === 'planned' ? (
						<p className="text-xs text-warm-400">Puppies can be added once the litter is born.</p>
					) : (
						<>
							<p className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-3">Add puppy</p>
							<div className="flex gap-2 items-center">
								{newPuppyImageFile ? (
									<div className="relative w-9 h-9 flex-shrink-0">
										<img src={URL.createObjectURL(newPuppyImageFile)} alt="" className="w-full h-full object-cover rounded-lg border border-warm-200" />
										<button type="button" onClick={() => setNewPuppyImageFile(null)} className="absolute -top-1 -right-1 w-4 h-4 bg-black/50 hover:bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center">&#10005;</button>
									</div>
								) : (
									<label className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed border-warm-200 cursor-pointer hover:border-brand-300 hover:bg-warm-50 transition-colors" title="Add photo">
										<span className="text-warm-400 text-base leading-none">+</span>
										<input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/heic" onChange={(e) => { const f = e.target.files?.[0]; if (f) setNewPuppyImageFile(f); e.target.value = ''; }} className="hidden" />
									</label>
								)}
								<select
									value={newPuppy.collarColour}
									onChange={(e) => setNewPuppy((p) => ({ ...p, collarColour: e.target.value }))}
									className="flex-1 px-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
								>
									<option value="">Collar colour</option>
									{COLLAR_COLOURS.map((c) => (
										<option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
									))}
								</select>
								<input
									placeholder="Puppy description"
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
									disabled={addingPuppy}
									className="px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
								>
									{addingPuppy ? (newPuppyImageFile ? 'Uploading…' : 'Adding…') : 'Add'}
								</button>
							</div>
						</>
					)}
				</div>
			</Card>

			{/* Potential Clients */}
			<Card className="p-6 mb-6">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-base font-bold text-warm-900">Potential Clients</h3>
					{(interestedWaitlisted.length > 0 || matchingClients.length > 0 || masterListClients.length > 0) && (
						<span className="text-xs font-medium text-warm-500">{interestedWaitlisted.length + dedupedMatchingClients.length + dedupedMasterListClients.length} match{interestedWaitlisted.length + dedupedMatchingClients.length + dedupedMasterListClients.length !== 1 ? 'es' : ''}</span>
					)}
				</div>

				{/* Notify bar */}
				{!matchingLoading && (interestedWaitlisted.length > 0 || matchingClients.length > 0 || notifications.length > 0) && (
					<>
						<div className={`mb-4 rounded-lg border p-3 flex flex-wrap items-center gap-2 transition-colors ${notifyOpen ? 'bg-amber-50 border-amber-300' : 'bg-warm-50 border-warm-200'}`}>
							<p className={`text-xs flex-1 min-w-0 ${notifications.length > 0 ? 'text-blue-600 font-medium' : 'text-warm-500'}`}>
								{notifications.length > 0
									? `${notifications.length} client${notifications.length !== 1 ? 's' : ''} already notified about this litter`
									: 'No clients notified yet'}
							</p>
							<div className="flex items-center gap-2 flex-wrap">
								{notifyOpen && (
									<span className="text-xs text-amber-700 font-medium">
										{selectedIds.size === 0 ? 'Select clients below' : `${selectedIds.size} selected`}
									</span>
								)}
								{(['born', 'available'] as LitterStatus[]).includes(litter.status) ? (
									notifyOpen ? (
										<button
											onClick={() => { setNotifyOpen(false); setSelectedIds(new Set()); }}
											className="px-3 py-1.5 text-xs border border-warm-300 text-warm-600 rounded-md hover:bg-warm-100 transition-colors"
										>
											Cancel
										</button>
									) : (
										<button
											onClick={openNotifyPanel}
											className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors"
										>
											Send litter notification
										</button>
									)
								) : (
									<span className="text-xs text-warm-400 italic">Notifications available once litter is born</span>
								)}
								{notifyOpen && (
									<button
										onClick={handleNotify}
										disabled={notifying || selectedIds.size === 0}
										className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-md hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										{notifying ? 'Sending…' : selectedIds.size > 0 ? `Notify ${selectedIds.size} client${selectedIds.size !== 1 ? 's' : ''}` : 'Notify selected'}
									</button>
								)}
							</div>
						</div>
						{notifyOpen && litter.puppies.length > 0 && selectedIds.size > litter.puppies.length && (
							<div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
								Notifying more than {litter.puppies.length} client{litter.puppies.length !== 1 ? 's' : ''} may create false demand — there are only {litter.puppies.length} {litter.puppies.length !== 1 ? 'puppies' : 'puppy'} in this litter.
							</div>
						)}
					</>
				)}

				{matchingLoading ? (
					<p className="text-sm text-warm-400">Loading matches…</p>
				) : interestedWaitlisted.length === 0 && !litter.breed ? (
					<p className="text-sm text-warm-400">Set a breed on this litter to see matching clients.</p>
				) : interestedWaitlisted.length === 0 && dedupedMatchingClients.length === 0 ? (
					<EmptyState icon="👥" title="No matching clients" />
				) : (
					<div>
						{/* Litter Interested */}
						{interestedWaitlisted.length > 0 && (
							<>
								<div className="flex items-center gap-3 mb-3">
									<span className="text-xs font-semibold uppercase tracking-wider text-warm-600 flex-shrink-0">Litter Interested</span>
									<div className="h-px flex-1 bg-warm-300" />
									{notifyOpen && (
										<div className="flex items-center gap-2">
											{interestedWaitlisted.some((li) => selectedIds.has(li.clientId)) && (
												<button
													onClick={() => setSelectedIds((prev) => {
														const next = new Set(prev);
														interestedWaitlisted.forEach((li) => next.delete(li.clientId));
														return next;
													})}
													className="text-[11px] text-warm-400 font-medium hover:text-warm-600"
												>
													Clear
												</button>
											)}
											<button onClick={selectAllInterested} className="text-[11px] text-brand-500 font-medium hover:text-brand-600">
												Select all
											</button>
										</div>
									)}
								</div>
								<div className="space-y-2 mb-4">
									{interestedWaitlisted.map((li) => {
										const mc = matchingClientMap[li.clientId];
										const notifAt = notifiedMap[li.clientId];
										const isNotified = !!notifAt;
										const isSelected = selectedIds.has(li.clientId);

										const cardInner = (
											<div className="flex items-start gap-3">
												{notifyOpen && (
													<div className="flex-shrink-0 pt-0.5">
														<div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
															isNotified ? 'bg-warm-100 border-warm-200' :
															isSelected ? 'bg-brand-500 border-brand-500' :
															'border-warm-300 bg-white'
														}`}>
															{isSelected && (
																<svg width="9" height="7" viewBox="0 0 9 7" fill="none">
																	<path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
																</svg>
															)}
														</div>
													</div>
												)}
												<div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-8">
													<span className="text-sm font-bold text-warm-700">
														{li.client.waitlistPosition != null ? `#${li.client.waitlistPosition}` : '—'}
													</span>
													<span className="text-[9px] font-medium text-warm-400 uppercase tracking-wide leading-none">wait</span>
													<span className="text-[9px] font-medium text-warm-400 uppercase tracking-wide leading-none">list</span>
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-1.5 flex-wrap">
														<span className="font-medium text-sm text-warm-900">{li.client.firstName} {li.client.lastName}</span>
														<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Interested</span>
														{li.client.depositStatus === 'paid' ? (
															<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Deposit · Paid</span>
														) : li.client.depositStatus === 'pending' ? (
															<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Deposit · Pending</span>
														) : (
															<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-warm-100 text-warm-500">No Deposit</span>
														)}
														{notifAt && <NotifyTimer since={notifAt} />}
														{isNotified && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">Notified</span>}
													</div>
													{li.client.city && <p className="text-[11px] text-warm-400 mt-0.5">{li.client.city}</p>}
													{isNotified && <p className="text-[11px] text-warm-400 italic mt-1">Already notified — awaiting response</p>}
													{mc && mc.matchReasons.filter((r) => !r.startsWith('Deposit')).length > 0 && (
														<div className="flex flex-wrap gap-1 mt-1.5">
															{mc.matchReasons.filter((r) => !r.startsWith('Deposit')).slice(0, 3).map((reason) => (
																<span
																	key={reason}
																	className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
																		reason.startsWith('First choice') ? 'bg-green-100 text-green-700' :
																		reason.startsWith('Second choice') ? 'bg-blue-100 text-blue-700' :
																		reason.includes('Sex') || reason.includes('sex') ? 'bg-purple-100 text-purple-700' :
																		reason.includes('olour') ? 'bg-pink-100 text-pink-700' :
																		'bg-warm-100 text-warm-600'
																	}`}
																>
																	{reason}
																</span>
															))}
														</div>
													)}
												</div>
												{mc && (
													<div className="flex-shrink-0 text-right">
														<div className="text-sm font-bold text-brand-600">{mc.score}</div>
														<div className="text-[10px] text-warm-400">pts</div>
													</div>
												)}
											</div>
										);

										const cardClass = `block p-3.5 rounded-lg border transition-all ${
											isNotified && notifyOpen ? 'opacity-50 cursor-default border-warm-200' :
											notifyOpen ? `cursor-pointer ${isSelected ? 'border-brand-400 bg-brand-50/50' : 'border-warm-200 hover:border-brand-300 hover:bg-brand-50/30'}` :
											notifAt ? 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/30' :
											'border-warm-200 hover:border-brand-300 hover:bg-brand-50/30'
										}`;

										if (notifyOpen) {
											return (
												<div key={li.clientId} className={cardClass} onClick={() => { if (!isNotified) toggleSelection(li.clientId); }}>
													{cardInner}
												</div>
											);
										}
										return (
											<Link key={li.clientId} to={`/admin/clients/${li.clientId}`} className={cardClass}>
												{cardInner}
											</Link>
										);
									})}
								</div>
							</>
						)}

						{/* Litter Matched Waitlist */}
						{dedupedMatchingClients.length > 0 && (
						<>
						<div className="flex items-center gap-3 mb-3">
							<span className="text-xs font-semibold uppercase tracking-wider text-warm-600 flex-shrink-0">Litter Matched Waitlist</span>
							<div className="h-px flex-1 bg-warm-300" />
							{notifyOpen && (
								<div className="flex items-center gap-2">
									{dedupedMatchingClients.some((mc) => selectedIds.has(mc.id)) && (
										<button
											onClick={() => setSelectedIds((prev) => {
												const next = new Set(prev);
												dedupedMatchingClients.forEach((mc) => next.delete(mc.id));
												return next;
											})}
											className="text-[11px] text-warm-400 font-medium hover:text-warm-600"
										>
											Clear
										</button>
									)}
									<button onClick={selectAllWaitlist} className="text-[11px] text-brand-500 font-medium hover:text-brand-600">
										Select all
									</button>
								</div>
							)}
						</div>
						<div className="space-y-2 mb-4">
							{[...dedupedMatchingClients].sort((a, b) => a.priority - b.priority).map((mc, i) => {
								const notifAt = notifiedMap[mc.id];
								const isNotified = !!notifAt;
								const isSelected = selectedIds.has(mc.id);

								const cardInner = (
									<div className="flex items-start gap-3">
										{notifyOpen && (
											<div className="flex-shrink-0 pt-0.5">
												<div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
													isNotified ? 'bg-warm-100 border-warm-200' :
													isSelected ? 'bg-brand-500 border-brand-500' :
													'border-warm-300 bg-white'
												}`}>
													{isSelected && (
														<svg width="9" height="7" viewBox="0 0 9 7" fill="none">
															<path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
														</svg>
													)}
												</div>
											</div>
										)}
										<div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-8">
											<span className="text-sm font-bold text-warm-700">#{mc.waitlistPosition ?? i + 1}</span>
											<span className="text-[9px] font-medium text-warm-400 uppercase tracking-wide leading-none">wait</span>
											<span className="text-[9px] font-medium text-warm-400 uppercase tracking-wide leading-none">list</span>
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-1.5 flex-wrap">
												<span className="font-medium text-sm text-warm-900">{mc.firstName} {mc.lastName}</span>
												{mc.depositStatus === 'paid' ? (
													<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Deposit · Paid</span>
												) : mc.depositStatus === 'pending' ? (
													<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Deposit · Pending</span>
												) : (
													<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-warm-100 text-warm-500">No Deposit</span>
												)}
												{notifAt && <NotifyTimer since={notifAt} />}
												{isNotified && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">Notified</span>}
											</div>
											{mc.city && <p className="text-[11px] text-warm-400 mt-0.5">{mc.city}</p>}
											{isNotified && <p className="text-[11px] text-warm-400 italic mt-1">Already notified — awaiting response</p>}
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
																'bg-warm-100 text-warm-600'
															}`}
														>
															{reason}
														</span>
													))}
												</div>
											)}
										</div>
										<div className="flex-shrink-0 text-right">
											<div className="text-sm font-bold text-brand-600">{mc.score}</div>
											<div className="text-[10px] text-warm-400">pts</div>
										</div>
									</div>
								);

								const cardClass = `block p-3.5 rounded-lg border transition-all ${
									isNotified && notifyOpen ? 'opacity-50 cursor-default border-warm-200' :
									notifyOpen ? `cursor-pointer ${isSelected ? 'border-brand-400 bg-brand-50/50' : 'border-warm-200 hover:border-brand-300 hover:bg-brand-50/30'}` :
									notifAt ? 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/30' :
									'border-warm-200 hover:border-brand-300 hover:bg-brand-50/30'
								}`;

								if (notifyOpen) {
									return (
										<div key={mc.id} className={cardClass} onClick={() => { if (!isNotified) toggleSelection(mc.id); }}>
											{cardInner}
										</div>
									);
								}
								return (
									<Link key={mc.id} to={`/admin/clients/${mc.id}`} className={cardClass}>
										{cardInner}
									</Link>
								);
							})}
						</div>
						</>
						)}

						{/* Global Waitlist */}
						{(dedupedMasterListClients.length > 0 || masterListLoading) && (
							<>
								<div className="flex items-center gap-3 mb-3 mt-5">
									<span className="text-xs font-semibold uppercase tracking-wider text-warm-600 flex-shrink-0">Global Waitlist</span>
									<div className="h-px flex-1 bg-warm-300" />
									{notifyOpen && dedupedMasterListClients.length > 0 && (
										<div className="flex items-center gap-2">
											{dedupedMasterListClients.some((c) => selectedIds.has(c.id)) && (
												<button
													onClick={() => setSelectedIds((prev) => {
														const next = new Set(prev);
														dedupedMasterListClients.forEach((c) => next.delete(c.id));
														return next;
													})}
													className="text-[11px] text-warm-400 font-medium hover:text-warm-600"
												>
													Clear
												</button>
											)}
											<button onClick={selectAllPlatform} className="text-[11px] text-brand-500 font-medium hover:text-brand-600">
												Select all
											</button>
										</div>
									)}
								</div>
								{masterListLoading ? (
									<p className="text-xs text-warm-400 py-2">Loading…</p>
								) : (
									<div className="space-y-2">
										{dedupedMasterListClients.map((c) => {
											const notifAt = notifiedMap[c.id];
											const isNotified = !!notifAt;
											const isSelected = selectedIds.has(c.id);

											const cardInner = (
												<div className="flex items-start gap-3">
													{notifyOpen && (
														<div className="flex-shrink-0 pt-0.5">
															<div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
																isNotified ? 'bg-warm-100 border-warm-200' :
																isSelected ? 'bg-brand-500 border-brand-500' :
																'border-warm-300 bg-white'
															}`}>
																{isSelected && (
																	<svg width="9" height="7" viewBox="0 0 9 7" fill="none">
																		<path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
																	</svg>
																)}
															</div>
														</div>
													)}
													<div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-8">
														<span className="text-sm font-bold text-warm-700">#{c.waitlistPosition}</span>
														<span className="text-[9px] font-medium text-warm-400 uppercase tracking-wide leading-none">wait</span>
														<span className="text-[9px] font-medium text-warm-400 uppercase tracking-wide leading-none">list</span>
													</div>
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-1.5 flex-wrap">
															<span className="font-medium text-sm text-warm-900">{c.firstName} {c.lastName}</span>
															{c.depositStatus === 'paid' ? (
																<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Deposit · Paid</span>
															) : c.depositStatus === 'pending' ? (
																<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Deposit · Pending</span>
															) : (
																<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-warm-100 text-warm-500">No Deposit</span>
															)}
															{notifAt && <NotifyTimer since={notifAt} />}
															{isNotified && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">Notified</span>}
														</div>
														{isNotified && <p className="text-[11px] text-warm-400 italic mt-1">Already notified — awaiting response</p>}
													</div>
												</div>
											);

											const cardClass = `block p-3.5 rounded-lg border transition-all ${
												isNotified && notifyOpen ? 'opacity-50 cursor-default border-warm-200' :
												notifyOpen ? `cursor-pointer ${isSelected ? 'border-brand-400 bg-brand-50/50' : 'border-warm-200 hover:border-brand-300 hover:bg-brand-50/30'}` :
												notifAt ? 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/30' :
												'border-warm-200 hover:border-brand-300 hover:bg-brand-50/30'
											}`;

											if (notifyOpen) {
												return (
													<div key={c.id} className={cardClass} onClick={() => { if (!isNotified) toggleSelection(c.id); }}>
														{cardInner}
													</div>
												);
											}
											return (
												<Link key={c.id} to={`/admin/clients/${c.id}`} className={cardClass}>
													{cardInner}
												</Link>
											);
										})}
									</div>
								)}
							</>
						)}
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
