# Litter Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-image gallery to litters — admin uploads photos per litter, and they appear in a grid on the public litter detail page.

**Architecture:** A new `litter_images` DB table stores each photo URL + storage path per litter. Two new admin-only API routes handle upload and delete. The existing `GET /litters/:id` response is extended to include gallery images. Admin UI gains a Gallery card; public litter detail page gains a photo grid.

**Tech Stack:** ElysiaJS + Drizzle ORM (server), React + Tailwind CSS v4 + Eden treaty (client), Supabase Storage (`litter-media` bucket), TypeScript throughout.

**Spec:** `docs/superpowers/specs/2026-03-21-litter-gallery-design.md`

---

## File Map

| File | Change |
|------|--------|
| `server/src/db/schema.ts` | Add `litterImages` table + `litterImagesRelations`; extend `littersRelations` |
| `server/src/routes/litters/index.ts` | Add `POST /:id/gallery`, `DELETE /:id/gallery/:imageId`; extend `GET /:id` with images |
| `shared/src/index.ts` | Add `LitterImage` interface; extend `LitterWithDogs` |
| `client/src/pages/admin/index.tsx` | Extend litter state type; add `galleryImages` state; add Gallery card to `AdminLitterDetail` |
| `client/src/pages/public/LitterPage.tsx` | Add gallery grid section between puppies and notes |

---

## Task 1: Create the `litter_images` DB table

**Files:**
- Modify: `server/src/db/schema.ts`

- [ ] **Step 1: Run the SQL in Supabase**

Go to your Supabase project → SQL Editor and run:

```sql
CREATE TABLE IF NOT EXISTS litter_images (
  id text PRIMARY KEY,
  litter_id text NOT NULL REFERENCES litters(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Add the Drizzle table definition to `server/src/db/schema.ts`**

After the `puppiesRelations` block, add:

```ts
// ─── Litter Images ────────────────────────────────────────────────────────────

export const litterImages = pgTable('litter_images', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	litterId: text('litter_id').notNull().references(() => litters.id, { onDelete: 'cascade' }),
	url: text('url').notNull(),
	storagePath: text('storage_path').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const litterImagesRelations = relations(litterImages, ({ one }) => ({
	litter: one(litters, { fields: [litterImages.litterId], references: [litters.id] }),
}));
```

- [ ] **Step 3: Extend `littersRelations` to include `images`**

Find the existing `littersRelations` definition (around line 139) and add `images: many(litterImages)`:

```ts
export const littersRelations = relations(litters, ({ one, many }) => ({
	sire: one(dogs, { fields: [litters.sireId], references: [dogs.id], relationName: 'sire' }),
	dam: one(dogs, { fields: [litters.damId], references: [dogs.id], relationName: 'dam' }),
	puppies: many(puppies),
	updates: many(updates),
	images: many(litterImages),
}));
```

- [ ] **Step 4: Commit**

```bash
git add server/src/db/schema.ts
git commit -m "feat: add litter_images drizzle schema"
```

---

## Task 2: Add shared types

**Files:**
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Add `LitterImage` interface**

After the `LitterWithDogs` interface (around line 86), add:

```ts
export interface LitterImage {
	id: string;
	litterId: string;
	url: string;
	storagePath: string;
	sortOrder: number;
	createdAt: string;
}
```

- [ ] **Step 2: Extend `LitterWithDogs` to include `images`**

Update the existing `LitterWithDogs` interface:

```ts
export interface LitterWithDogs extends Litter {
	sire: Dog;
	dam: Dog;
	puppies: Puppy[];
	images: LitterImage[];
}
```

- [ ] **Step 3: Commit**

```bash
git add shared/src/index.ts
git commit -m "feat: add LitterImage shared type"
```

---

## Task 3: Add backend routes and extend GET

**Files:**
- Modify: `server/src/routes/litters/index.ts`

- [ ] **Step 1: Import `litterImages` and `asc` at the top of the routes file**

The current imports are:
```ts
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { litters, puppies } from '../../db/schema';
```

Update to:
```ts
import { eq, desc, asc } from 'drizzle-orm';
import { db } from '../../db';
import { litters, puppies, litterImages } from '../../db/schema';
import { supabase, uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';
```

Note: `uploadFile` and `STORAGE_BUCKETS` are already imported. **Replace** the existing `import { uploadFile, STORAGE_BUCKETS }` line with this new line — do not add a second import line.

- [ ] **Step 2: Extend `GET /:id` to include images**

Find the existing `GET /:id` handler (around line 18) and update the `with:` clause:

```ts
.get('/:id', async ({ params, error }) => {
	const litter = await db.query.litters.findFirst({
		where: eq(litters.id, params.id),
		with: { sire: true, dam: true, puppies: true, images: { orderBy: [asc(litterImages.createdAt)] } },
	});
	if (!litter) return error(404, { error: 'Not found', message: 'Litter not found' });
	return litter;
})
```

- [ ] **Step 3: Add `POST /:id/gallery` route**

Add after the existing `POST /:id/images` route (cover image upload, around line 101):

```ts
// ── Admin: upload gallery image ──
.post(
	'/:id/gallery',
	async ({ params, body, error }) => {
		const litter = await db.query.litters.findFirst({ where: eq(litters.id, params.id) });
		if (!litter) return error(404, { error: 'Not found', message: 'Litter not found' });

		const file = body.file as File;
		const storagePath = `${params.id}/gallery/${Date.now()}-${file.name}`;
		const url = await uploadFile(STORAGE_BUCKETS.litters, storagePath, file, file.type);

		const [image] = await db
			.insert(litterImages)
			.values({ litterId: params.id, url, storagePath })
			.returning();

		return image;
	},
	{ body: t.Object({ file: t.File() }) }
)
```

- [ ] **Step 4: Add `DELETE /:id/gallery/:imageId` route**

Add immediately after the POST gallery route:

```ts
// ── Admin: delete gallery image ──
.delete(
	'/:id/gallery/:imageId',
	async ({ params, error }) => {
		const image = await db.query.litterImages.findFirst({
			where: eq(litterImages.id, params.imageId),
		});
		if (!image) return error(404, { error: 'Not found', message: 'Image not found' });

		await db.delete(litterImages).where(eq(litterImages.id, params.imageId));
		await supabase.storage.from(STORAGE_BUCKETS.litters).remove([image.storagePath]);

		return { success: true };
	}
)
```

- [ ] **Step 5: Verify the server starts without errors**

```bash
pnpm dev
```

Check `http://localhost:3000/swagger` — you should see the two new litter gallery endpoints listed.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/litters/index.ts
git commit -m "feat: add litter gallery upload and delete routes"
```

---

## Task 4: Admin UI — Gallery card in `AdminLitterDetail`

**Files:**
- Modify: `client/src/pages/admin/index.tsx`

- [ ] **Step 1: Import `LitterImage` at the top of the file**

Find the existing import from `@paw-registry/shared` (near the top of `index.tsx`) and add `LitterImage`:

```ts
import type { Dog, Litter, LitterImage } from '@paw-registry/shared';
```

- [ ] **Step 2: Extend the litter state type in `AdminLitterDetail`**

Find line ~479 where the `useState` for `litter` is declared:

```ts
const [litter, setLitter] = useState<Litter & { sire: Dog; dam: Dog; puppies: unknown[] } | null>(null);
```

Update to:

```ts
const [litter, setLitter] = useState<Litter & { sire: Dog; dam: Dog; puppies: unknown[]; images: LitterImage[] } | null>(null);
```

- [ ] **Step 3: Add `galleryImages` state and `galleryError` state**

After the existing `const [previewUrl, setPreviewUrl] = useState<string | null>(null);` line, add:

```ts
const [galleryImages, setGalleryImages] = useState<LitterImage[]>([]);
const [galleryError, setGalleryError] = useState('');
```

- [ ] **Step 4: Seed `galleryImages` from the fetched litter**

In the `useEffect` that fetches the litter (around line 504), update the `.then()` callback to seed gallery state:

```ts
api.litters({ id }).get().then(({ data }) => {
	if (data) {
		const d = data as typeof litter;
		setLitter(d);
		setGalleryImages(d?.images ?? []);
	}
	setLoading(false);
});
```

- [ ] **Step 5: Add the Gallery card to the edit view**

In the edit view JSX (after the closing `</Card>` of the Cover Image card, around line 770), add:

```tsx
<Card className="p-6 md:col-span-2">
	<h3 className="font-semibold text-stone-800 mb-4">Gallery</h3>
	<div className="flex flex-wrap gap-3 mb-4">
		{galleryImages.map((img) => (
			<div key={img.id} className="relative w-20 h-20 flex-shrink-0">
				<img src={img.url} alt="Gallery" className="w-full h-full object-cover rounded-lg border border-stone-200" />
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
			<p className="text-xs text-stone-400">No gallery images yet.</p>
		)}
	</div>
	<div className="flex items-center gap-3">
		<label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-600 hover:bg-stone-50 transition-colors">
			<span>Upload photo</span>
			<input
				type="file"
				accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
				onChange={async (e) => {
					setGalleryError('');
					const file = e.target.files?.[0];
					if (!file || !id) return;
					const { data, error } = await api.litters({ id }).gallery.post({ file });
					if (error) { setGalleryError('Upload failed. Please try again.'); return; }
					if (data) setGalleryImages((prev) => [...prev, data as LitterImage]);
					e.target.value = '';
				}}
				className="hidden"
			/>
		</label>
	</div>
	{galleryError && <p className="text-xs text-red-500 mt-2">{galleryError}</p>}
</Card>
```

- [ ] **Step 6: Verify admin UI works**

1. Open `http://localhost:5173/admin/litters`
2. Click into an existing litter
3. Confirm the Gallery card appears below Cover Image
4. Upload a photo — it should appear as a thumbnail
5. Click ✕ on a thumbnail — it should disappear

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/admin/index.tsx
git commit -m "feat: add gallery upload/delete to admin litter detail"
```

---

## Task 5: Public litter detail page — gallery grid

**Files:**
- Modify: `client/src/pages/public/LitterPage.tsx`

- [ ] **Step 1: Add the gallery section between puppies and notes**

In `LitterPage.tsx`, find the notes block (around line 103):

```tsx
{litter.notes && (
```

Insert the gallery section immediately before it:

```tsx
{litter.images && litter.images.length > 0 && (
	<div className="mb-12">
		<h2 className="font-serif text-2xl font-bold text-stone-900 mb-6">Photos</h2>
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
			{litter.images.map((img) => (
				<div key={img.id} className="aspect-square overflow-hidden rounded-xl bg-stone-100">
					<img src={img.url} alt="Litter photo" className="w-full h-full object-cover" />
				</div>
			))}
		</div>
	</div>
)}
```

- [ ] **Step 2: Verify public page**

1. Open `http://localhost:5173/litters`
2. Click into a litter that has gallery images
3. Confirm the Photos section appears after puppies and before notes
4. Confirm a litter with no gallery images shows no Photos section

- [ ] **Step 3: Commit and push**

```bash
git add client/src/pages/public/LitterPage.tsx
git commit -m "feat: show gallery grid on public litter detail page"
git push origin main
```
