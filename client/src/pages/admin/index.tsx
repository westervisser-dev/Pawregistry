import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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

	useEffect(() => {
		api.dogs.get({ query: {} }).then(({ data }) => {
			if (data) setDogs(data as Dog[]);
			setLoading(false);
		});
	}, []);

	return (
		<div className="p-8">
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
	const [dog, setDog] = useState<Dog | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState<Partial<Dog>>({});

	useEffect(() => {
		if (!id || id === 'new') { setLoading(false); return; }
		api.dogs({ id }).get().then(({ data }) => {
			if (data) { setDog(data as Dog); setForm(data as Dog); }
			setLoading(false);
		});
	}, [id]);

	const save = async () => {
		setSaving(true);
		if (id && id !== 'new') {
			await api.dogs({ id }).patch(form as Parameters<typeof api.dogs>[0] extends never ? never : Parameters<ReturnType<typeof api.dogs>['patch']>[0]);
		}
		setSaving(false);
	};

	const set = (key: keyof Dog, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

	if (loading) return <LoadingPage />;

	return (
		<div className="p-8 max-w-3xl">
			<Link to="/admin/dogs" className="text-sm text-stone-400 hover:text-stone-600 mb-6 inline-block">← Dogs</Link>
			<PageHeader title={dog?.name ?? 'New Dog'} />

			<Card className="p-6 flex flex-col gap-4">
				<div className="grid grid-cols-2 gap-4">
					{[
						{ label: 'Name', key: 'name' as const },
						{ label: 'Call Name', key: 'callName' as const },
						{ label: 'Registered Name', key: 'registeredName' as const },
						{ label: 'Breed', key: 'breed' as const },
						{ label: 'Colour', key: 'colour' as const },
						{ label: 'Date of Birth', key: 'dob' as const },
						{ label: 'Microchip', key: 'microchipNumber' as const },
						{ label: 'Registration No.', key: 'registrationNumber' as const },
					].map(({ label, key }) => (
						<div key={key}>
							<label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
							<input
								value={(form[key] as string) ?? ''}
								onChange={(e) => set(key, e.target.value)}
								className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
							/>
						</div>
					))}
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="block text-xs font-medium text-stone-500 mb-1">Sex</label>
						<select
							value={form.sex ?? ''}
							onChange={(e) => set('sex', e.target.value)}
							className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none"
						>
							<option value="male">Male</option>
							<option value="female">Female</option>
						</select>
					</div>
					<div>
						<label className="block text-xs font-medium text-stone-500 mb-1">Status</label>
						<select
							value={form.status ?? 'active'}
							onChange={(e) => set('status', e.target.value)}
							className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none"
						>
							<option value="active">Active</option>
							<option value="retired">Retired</option>
							<option value="deceased">Deceased</option>
						</select>
					</div>
				</div>
				<div>
					<label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
					<textarea
						value={(form.notes as string) ?? ''}
						onChange={(e) => set('notes', e.target.value)}
						rows={3}
						className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none resize-none"
					/>
				</div>
				<button
					onClick={save}
					disabled={saving}
					className="self-start px-6 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Save Changes'}
				</button>
			</Card>
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
	const [newPuppy, setNewPuppy] = useState({ collarColour: '', sex: 'male' as const, colour: '' });

	useEffect(() => {
		if (!id) return;
		api.litters({ id }).get().then(({ data }) => {
			if (data) setLitter(data as typeof litter);
			setLoading(false);
		});
	}, [id]);

	const updateStatus = async (status: string) => {
		if (!id) return;
		setSaving(true);
		const { data } = await (api.litters as unknown as { [key: string]: (body: unknown) => Promise<{ data: unknown }> })[':id'].patch({ status });
		if (data) setLitter(data as typeof litter);
		setSaving(false);
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
	if (!litter) return <div className="p-8 text-stone-500">Litter not found.</div>;

	const statuses = ['planned', 'confirmed', 'born', 'weaning', 'ready', 'completed'];

	return (
		<div className="p-8 max-w-4xl">
			<PageHeader
				title={litter.name}
				subtitle={`${(litter as typeof litter & { sire: Dog }).sire.name} × ${(litter as typeof litter & { dam: Dog }).dam.name}`}
				action={
					<button onClick={() => navigate('/admin/litters')} className="text-sm text-stone-500 hover:text-stone-700">
						← Back
					</button>
				}
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
				</Card>

				<Card className="p-6">
					<h3 className="font-semibold text-stone-800 mb-4">Details</h3>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-stone-500">Whelp date</span>
							<span>{litter.whelpDate ?? '—'}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-stone-500">Expected</span>
							<span>{litter.expectedDate ?? '—'}</span>
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
					<AdminTable headers={['Name', 'Email', 'Stage', 'Applied', '']}>
						{clients.map((client) => (
							<tr key={client.id} className="border-b border-stone-100 hover:bg-stone-50">
								<td className="py-3 px-4 font-medium text-stone-900">
									{client.firstName} {client.lastName}
								</td>
								<td className="py-3 px-4 text-stone-600">{client.email}</td>
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
						))}
					</AdminTable>
					{clients.length === 0 && <EmptyState icon="👥" title="No clients" />}
				</Card>
			)}
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

	const app = client.applicationData as Record<string, unknown>;

	return (
		<div className="p-8 max-w-4xl">
			<Link to="/admin/clients" className="text-sm text-stone-400 hover:text-stone-600 mb-6 inline-block">← Clients</Link>

			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="font-serif text-2xl font-bold text-stone-900">
						{client.firstName} {client.lastName}
					</h1>
					<p className="text-stone-500 text-sm">{client.email}</p>
				</div>
				<StageBadge stage={client.stage} />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				{/* Stage management */}
				<Card className="p-5">
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

				{/* Application data */}
				<Card className="p-5">
					<h3 className="font-medium text-stone-900 mb-3">Application</h3>
					<dl className="grid grid-cols-2 gap-2 text-sm">
						{Object.entries(app).slice(0, 6).map(([k, v]) => (
							<div key={k}>
								<dt className="text-stone-400 text-xs">{k}</dt>
								<dd className="text-stone-700">{String(v)}</dd>
							</div>
						))}
					</dl>
				</Card>
			</div>

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
