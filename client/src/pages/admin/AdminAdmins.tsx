import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingPage, Card, PageHeader } from '@/components/ui';
import type { Admin } from '@paw-registry/shared';
import { AdminTable } from './_shared';

export function AdminAdmins() {
	const [admins, setAdmins] = useState<Admin[]>([]);
	const [loading, setLoading] = useState(true);
	const [email, setEmail] = useState('');
	const [inviting, setInviting] = useState(false);
	const [inviteError, setInviteError] = useState('');
	const [inviteSuccess, setInviteSuccess] = useState('');
	const [removingId, setRemovingId] = useState<string | null>(null);

	const load = () =>
		api.admins.get().then(({ data }) => {
			if (data) setAdmins(data as Admin[]);
			setLoading(false);
		});

	useEffect(() => {
		document.title = 'Admins — Paw Registry';
		load();
		return () => { document.title = 'Paw Registry'; };
	}, []);

	const invite = async () => {
		setInviteError('');
		setInviteSuccess('');
		if (!email) return;
		setInviting(true);
		const { data, error } = await api.admins.invite.post({ email });
		setInviting(false);
		if (error) {
			setInviteError((error as { value?: { message?: string } }).value?.message ?? 'Invite failed.');
			return;
		}
		setInviteSuccess(`Invite sent to ${email}.`);
		setEmail('');
		load();
	};

	const remove = async (id: string) => {
		if (!confirm('Remove this admin? They will immediately lose access.')) return;
		setRemovingId(id);
		await api.admins({ id }).delete();
		setRemovingId(null);
		setAdmins((prev) => prev.filter((a) => a.id !== id));
	};

	return (
		<div className="p-4 md:p-8">
			<PageHeader title="Admins" />

			{loading ? <LoadingPage /> : (
				<div className="flex flex-col gap-6">
					{/* Invite */}
					<Card>
						<div className="p-6 border-b border-black/[0.05]">
							<h2 className="font-medium text-warm-900">Invite a new admin</h2>
							<p className="text-sm text-warm-500 mt-0.5">They will receive an email to set up their password.</p>
						</div>
						<div className="p-6">
							<div className="flex gap-3 max-w-md">
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && invite()}
									placeholder="colleague@example.com"
									className="flex-1 px-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
								/>
								<button
									onClick={invite}
									disabled={inviting || !email}
									className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
								>
									{inviting ? 'Sending…' : 'Send invite'}
								</button>
							</div>
							{inviteError && <p role="alert" className="text-red-600 text-sm mt-3">{inviteError}</p>}
							{inviteSuccess && <p role="status" className="text-green-700 text-sm mt-3">{inviteSuccess}</p>}
						</div>
					</Card>

					{/* Current admins */}
					<Card>
						<AdminTable headers={['Email', 'Added', '']}>
							{admins.map((admin) => (
								<tr key={admin.id} className="border-b border-black/[0.05] hover:bg-warm-50">
									<td className="py-3 px-4 font-medium text-warm-900">{admin.email}</td>
									<td className="py-3 px-4 text-warm-500 text-sm">
										{new Date(admin.createdAt).toLocaleDateString('en-ZA')}
									</td>
									<td className="py-3 px-4 text-right">
										<button
											onClick={() => remove(admin.id)}
											disabled={removingId === admin.id}
											className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
										>
											{removingId === admin.id ? 'Removing…' : 'Remove'}
										</button>
									</td>
								</tr>
							))}
						</AdminTable>
						{admins.length === 0 && (
							<p className="text-center text-warm-400 text-sm py-8">No admins found.</p>
						)}
					</Card>
				</div>
			)}
		</div>
	);
}
