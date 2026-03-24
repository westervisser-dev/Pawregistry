import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card } from '@/components/ui';
import type { Message } from '@paw-registry/shared';

export function PortalMessages() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMsg, setNewMsg] = useState('');
	const [sending, setSending] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		document.title = 'Messages — My Portal';
		return () => { document.title = 'Paw Registry'; };
	}, []);

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
				<p className="text-stone-600 text-sm mt-1">Direct line to your breeder.</p>
			</div>

			<Card className="flex flex-col h-[60vh] min-h-80">
				<div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
					{messages.length === 0 && (
						<p className="text-stone-400 text-sm text-center mt-8">No messages yet. Say hello! 👋</p>
					)}
					{messages.map((msg) => (
						<div
							key={msg.id}
							className={`flex ${msg.author === 'client' ? 'justify-end' : 'justify-start'}`}
						>
							<div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
								msg.author === 'client'
									? 'bg-brand-500 text-white rounded-br-sm'
									: 'bg-stone-100 text-stone-800 rounded-bl-sm'
							}`}>
								{msg.body}
							</div>
						</div>
					))}
				</div>
				<div className="border-t border-stone-200 p-4 flex flex-col gap-2">
					<div className="flex gap-3">
						<input
							value={newMsg}
							onChange={(e) => setNewMsg(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
							placeholder="Type a message…"
							aria-label="Message"
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
					<p className="text-xs text-stone-400">Press Enter to send · Shift+Enter for new line</p>
				</div>
			</Card>
		</div>
	);
}
