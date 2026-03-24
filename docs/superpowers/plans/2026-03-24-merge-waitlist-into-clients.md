# Merge Waitlist Into Clients Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the standalone `/admin/waitlist` page into the `/admin/clients` page, rendering the split reorderable waitlist view when the "waitlisted" stage filter is active.

**Architecture:** Inline the waitlist split/reorder logic into `AdminClients` as a conditional rendering branch; remove the `AdminWaitlist` component, its stub file, its route, and its nav entry entirely. No backend changes needed.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Eden treaty API client, React Router v6

---

## Files to Change

| File | Change |
|---|---|
| `client/src/components/ui/AdminLayout.tsx` | Remove Waitlist nav item (line 9) |
| `client/src/main.tsx` | Remove `AdminWaitlist` lazy import (line 55) and route (line 109) |
| `client/src/pages/admin/index.tsx` | Add waitlist conditional view inside `AdminClients`; delete `AdminWaitlist` function |
| `client/src/pages/admin/AdminWaitlist.tsx` | Delete file (was only a re-export stub) |

---

## Task 1: Remove Waitlist nav item

**Files:**
- Modify: `client/src/components/ui/AdminLayout.tsx:9`

- [ ] **Step 1: Remove the Waitlist entry from the `adminNav` array**

In `AdminLayout.tsx`, remove line 9:
```ts
// DELETE this line:
{ to: '/admin/waitlist', label: 'Waitlist', icon: '📋' },
```

The `adminNav` array should go from Dashboard → Dogs → Litters → **Waitlist** → Clients → Updates → Documents
to Dashboard → Dogs → Litters → Clients → Updates → Documents.

- [ ] **Step 2: Verify dev server compiles with no errors**

```bash
pnpm dev
```
Expected: no TypeScript or Vite errors. Nav no longer shows "Waitlist".

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ui/AdminLayout.tsx
git commit -m "feat: remove waitlist nav item"
```

---

## Task 2: Remove /admin/waitlist route

**Files:**
- Modify: `client/src/main.tsx:55,109`

- [ ] **Step 1: Remove the `AdminWaitlist` lazy import**

Delete line 55 in `main.tsx`:
```ts
// DELETE this line:
const AdminWaitlist = lazy$(() => import('@/pages/admin/AdminWaitlist'), 'AdminWaitlist');
```

- [ ] **Step 2: Remove the route**

Delete line 109 in `main.tsx`:
```tsx
// DELETE this line:
<Route path="/admin/waitlist" element={<AdminWaitlist />} />
```

- [ ] **Step 3: Verify dev server compiles with no errors**

```bash
pnpm dev
```
Expected: no errors. Navigating to `/admin/waitlist` redirects to `/` (the catch-all).

- [ ] **Step 4: Commit**

```bash
git add client/src/main.tsx
git commit -m "feat: remove /admin/waitlist route"
```

---

## Task 3: Merge waitlist view into AdminClients

**Files:**
- Modify: `client/src/pages/admin/index.tsx` (AdminClients function, lines 1106–1187; AdminWaitlist function, lines 1631–1738)

- [ ] **Step 1: Add waitlist state and helpers inside `AdminClients`**

Replace the existing `AdminClients` function (lines 1106–1187) with the version below.
Key changes vs. the original:
1. `clients` are sorted by `priority` after every fetch (so the waitlist view is in order)
2. `depositClients` / `standardClients` splits computed from `clients`
3. `move` function (verbatim from `AdminWaitlist`) mutates local state optimistically and patches the API
4. `depositBadge` and `WaitlistClientRow` helpers live inside the function scope
5. When `stage === 'waitlisted'`, render the two-section reorderable view; otherwise render the existing table

```tsx
export function AdminClients() {
	const [clients, setClients] = useState<Client[]>([]);
	const [stage, setStage] = useState('');
	const [loading, setLoading] = useState(true);

	const load = (s: string) => {
		setLoading(true);
		api.clients.admin.get({ query: s ? { stage: s } : {} }).then(({ data }) => {
			if (data) setClients((data as Client[]).sort((a, b) => a.priority - b.priority));
			setLoading(false);
		});
	};

	useEffect(() => { load(''); }, []);

	const stages = ['', 'enquiry', 'reviewed', 'waitlisted', 'matched', 'placed', 'declined'];

	// ─── Waitlist helpers (only used when stage === 'waitlisted') ───────────────

	const depositClients = clients.filter((c) => c.depositStatus === 'pending' || c.depositStatus === 'paid');
	const standardClients = clients.filter((c) => !c.depositStatus || c.depositStatus === 'none');

	const move = async (list: Client[], index: number, direction: -1 | 1) => {
		const allOther = clients.filter((c) => !list.includes(c));
		const next = [...list];
		const swapIdx = index + direction;
		if (swapIdx < 0 || swapIdx >= next.length) return;
		[next[index], next[swapIdx]] = [next[swapIdx], next[index]];
		const combined = list === depositClients
			? [...next, ...allOther]
			: [...allOther, ...next];
		const order = combined.map((c, i) => ({ id: c.id, priority: (i + 1) * 10 }));
		setClients(combined);
		await api.clients.admin.waitlist.reorder.patch({ order });
	};

	const depositBadge = (c: Client) => {
		if (c.depositStatus === 'paid') return <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Paid</span>;
		if (c.depositStatus === 'pending') return <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>;
		return null;
	};

	const WaitlistClientRow = ({ client, index, list }: { client: Client; index: number; list: Client[] }) => (
		<div className="flex items-center gap-4 px-5 py-4">
			<span className="text-stone-300 font-mono text-sm w-6 text-center">{index + 1}</span>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<p className="font-medium text-stone-900 text-sm truncate">{client.firstName} {client.lastName}</p>
					{depositBadge(client)}
				</div>
				<p className="text-xs text-stone-400">{client.email}</p>
			</div>
			<div className="text-xs text-stone-400">
				{(client.applicationData as Record<string, unknown>)?.preferredSex as string ?? '—'}
			</div>
			<div className="flex flex-col gap-0.5">
				<button onClick={() => move(list, index, -1)} className="text-stone-400 hover:text-stone-700 text-xs px-1">▲</button>
				<button onClick={() => move(list, index, 1)} className="text-stone-400 hover:text-stone-700 text-xs px-1">▼</button>
			</div>
			<Link to={`/admin/clients/${client.id}`} className="text-sm text-brand-600 hover:underline">
				View
			</Link>
		</div>
	);

	// ─── Waitlist view ──────────────────────────────────────────────────────────

	const waitlistView = (
		<div className="flex flex-col gap-6 max-w-2xl">
			<div>
				<div className="flex items-center gap-2 mb-3">
					<span className="text-sm font-semibold text-stone-700">Priority — Deposit</span>
					<span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{depositClients.length}</span>
				</div>
				<Card>
					{depositClients.length === 0 ? (
						<div className="px-5 py-4 text-sm text-stone-400">No clients with a deposit yet.</div>
					) : (
						<div className="divide-y divide-stone-100">
							{depositClients.map((client, i) => (
								<WaitlistClientRow key={client.id} client={client} index={i} list={depositClients} />
							))}
						</div>
					)}
				</Card>
			</div>

			<div>
				<div className="flex items-center gap-2 mb-3">
					<span className="text-sm font-semibold text-stone-700">Standard — No Deposit</span>
					<span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{standardClients.length}</span>
				</div>
				<Card>
					{standardClients.length === 0 ? (
						<div className="px-5 py-4 text-sm text-stone-400">No clients without a deposit.</div>
					) : (
						<div className="divide-y divide-stone-100">
							{standardClients.map((client, i) => (
								<WaitlistClientRow key={client.id} client={client} index={i} list={standardClients} />
							))}
						</div>
					)}
				</Card>
			</div>
		</div>
	);

	// ─── Table view ─────────────────────────────────────────────────────────────

	const tableView = (
		<Card>
			<AdminTable headers={['Name', 'Preference', 'Stage', 'Deposit', 'Applied', '']}>
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
							<td className="py-3 px-4">
								{client.depositStatus === 'paid' ? (
									<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Yes · Paid</span>
								) : client.depositStatus === 'pending' ? (
									<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Yes · Pending</span>
								) : (
									<span className="text-stone-400 text-xs">No</span>
								)}
							</td>
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
	);

	return (
		<div className="p-8">
			<PageHeader
				title="Clients"
				subtitle={stage === 'waitlisted'
					? 'Clients with a deposit are matched first. Reorder within each section using the arrows.'
					: 'All applications and client relationships.'
				}
			/>

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

			{loading ? <LoadingPage /> : stage === 'waitlisted' ? waitlistView : tableView}
		</div>
	);
}
```

- [ ] **Step 2: Delete the `AdminWaitlist` function from `index.tsx`**

Remove lines 1629–1738 (the `// ─── Waitlist ───` section comment through the closing `}` of `AdminWaitlist`).

- [ ] **Step 3: Delete `AdminWaitlist.tsx` stub file**

```bash
rm client/src/pages/admin/AdminWaitlist.tsx
```

- [ ] **Step 4: Verify dev server compiles with no errors**

```bash
pnpm dev
```
Expected: no TypeScript or Vite errors.
- Navigate to `/admin/clients` — table view loads normally
- Click "waitlisted" filter — two-section reorderable view appears
- Up/down arrows reorder clients within their section
- "View" links navigate to client detail

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/index.tsx client/src/pages/admin/AdminWaitlist.tsx
git commit -m "feat: merge waitlist view into clients page"
```

---

## Final commit message

After all tasks complete:

```bash
git add -A
git commit -m "feat: merge waitlist into clients page, remove standalone waitlist route"
git push origin main
```
