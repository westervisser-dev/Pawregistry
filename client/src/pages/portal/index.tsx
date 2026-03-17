import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, StageBadge, Badge } from '@/components/ui';
import type { Client, Update, Message, Document, GoHomeChecklist } from '@paw-registry/shared';

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function PortalDashboard() {
	const [client, setClient] = useState<Client | null>(null);
	const [loading, setLoading] = useState(true);

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
				<p className="text-stone-500 text-sm mt-1">Here's the latest on your puppy journey.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<Card className="p-5">
					<p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Application Stage</p>
					<div className="mt-2"><StageBadge stage={client.stage} /></div>
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
				<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
		</div>
	);
}

// ─── Updates ─────────────────────────────────────────────────────────────────

export function PortalUpdates() {
	const [updates, setUpdates] = useState<Update[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.updates.my.get().then(({ data }) => {
			if (data) setUpdates(data as Update[]);
			setLoading(false);
		});
	}, []);

	if (loading) return <LoadingPage />;

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-stone-900">Puppy Updates</h1>
				<p className="text-stone-500 text-sm mt-1">Your puppy journal from us to you.</p>
			</div>

			{updates.length === 0 ? (
				<Card className="p-12 text-center">
					<p className="text-4xl mb-4">📷</p>
					<p className="text-stone-600 font-medium">No updates yet</p>
					<p className="text-stone-400 text-sm mt-1">We'll post updates here as your puppy grows.</p>
				</Card>
			) : (
				<div className="flex flex-col gap-6">
					{updates.map((update) => (
						<Card key={update.id} className="overflow-hidden">
							{update.mediaUrls.length > 0 && (
								<div className="grid grid-cols-3 gap-1">
									{update.mediaUrls.slice(0, 3).map((url, i) => (
										<div key={i} className="aspect-square bg-stone-100 overflow-hidden">
											<img src={url} alt="" className="w-full h-full object-cover" />
										</div>
									))}
								</div>
							)}
							<div className="p-6">
								<div className="flex items-center gap-3 mb-2">
									{update.weekNumber && (
										<Badge variant="amber">Week {update.weekNumber}</Badge>
									)}
									<span className="text-xs text-stone-400">
										{update.publishedAt ? new Date(update.publishedAt).toLocaleDateString() : ''}
									</span>
								</div>
								<h2 className="font-serif font-bold text-stone-900 text-lg mb-2">{update.title}</h2>
								<p className="text-stone-600 text-sm leading-relaxed">{update.body}</p>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function PortalMessages() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMsg, setNewMsg] = useState('');
	const [sending, setSending] = useState(false);
	const [loading, setLoading] = useState(true);

	const load = () =>
		api.messages.my.get().then(({ data }) => {
			if (data) setMessages(data as Message[]);
			setLoading(false);
		});

	useEffect(() => { load(); }, []);

	const send = async () => {
		if (!newMsg.trim()) return;
		setSending(true);
		await api.messages.my.post({ body: newMsg });
		setNewMsg('');
		setSending(false);
		load();
	};

	if (loading) return <LoadingPage />;

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-stone-900">Messages</h1>
				<p className="text-stone-500 text-sm mt-1">Direct line to your breeder.</p>
			</div>

			<Card className="flex flex-col" style={{ height: '60vh' }}>
				<div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
					{messages.length === 0 && (
						<p className="text-stone-400 text-sm text-center mt-8">No messages yet. Say hello! 👋</p>
					)}
					{messages.map((msg) => (
						<div
							key={msg.id}
							className={`flex ${msg.author === 'client' ? 'justify-end' : 'justify-start'}`}
						>
							<div className={`max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed ${
								msg.author === 'client'
									? 'bg-brand-500 text-white rounded-br-sm'
									: 'bg-stone-100 text-stone-800 rounded-bl-sm'
							}`}>
								{msg.body}
							</div>
						</div>
					))}
				</div>
				<div className="border-t border-stone-200 p-4 flex gap-3">
					<input
						value={newMsg}
						onChange={(e) => setNewMsg(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
						placeholder="Type a message…"
						className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
					/>
					<button
						onClick={send}
						disabled={sending || !newMsg.trim()}
						className="px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
					>
						Send
					</button>
				</div>
			</Card>
		</div>
	);
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function PortalDocuments() {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.documents.my.get().then(({ data }) => {
			if (data) setDocuments(data as Document[]);
			setLoading(false);
		});
	}, []);

	const typeLabel: Record<string, string> = {
		contract: 'Contract',
		health_record: 'Health Record',
		go_home_pack: 'Go-Home Pack',
		invoice: 'Invoice',
		other: 'Document',
	};

	if (loading) return <LoadingPage />;

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-bold text-stone-900">Documents</h1>
				<p className="text-stone-500 text-sm mt-1">Your contracts, health records, and go-home documents.</p>
			</div>

			{documents.length === 0 ? (
				<Card className="p-12 text-center">
					<p className="text-4xl mb-4">📄</p>
					<p className="text-stone-600 font-medium">No documents yet</p>
				</Card>
			) : (
				<div className="flex flex-col gap-3">
					{documents.map((doc) => (
						<Card key={doc.id} className="p-4 flex items-center justify-between">
							<div className="flex items-center gap-4">
								<span className="text-2xl">📄</span>
								<div>
									<p className="font-medium text-stone-900 text-sm">{doc.label}</p>
									<p className="text-xs text-stone-400 mt-0.5">
										{typeLabel[doc.type]} · {new Date(doc.createdAt).toLocaleDateString()}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								{doc.signedAt && <Badge variant="green">Signed</Badge>}
								<a
									href={doc.fileUrl}
									target="_blank"
									rel="noreferrer"
									className="text-sm text-brand-600 font-medium hover:underline"
								>
									Download
								</a>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Go-Home Checklist ────────────────────────────────────────────────────────

export function PortalChecklist() {
	const [checklist, setChecklist] = useState<GoHomeChecklist | null>(null);
	const [loading, setLoading] = useState(true);

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
				<p className="text-stone-500 text-sm mt-1">Everything that needs to happen before pickup day.</p>
			</div>

			{!checklist ? (
				<Card className="p-12 text-center">
					<p className="text-4xl mb-4">✅</p>
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
								}`}>
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
