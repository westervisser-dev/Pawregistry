# Litter Gallery — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Add multi-image gallery support to litters. Admin uploads photos on the litter detail page; a photo grid appears on the public litter detail page. The existing single `coverImageUrl` field is unchanged.

---

## Database

New table `litter_images`:

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

Drizzle schema addition in `server/src/db/schema.ts`:
- `litterImages` table definition — `id` uses `.$defaultFn(() => crypto.randomUUID())`
- `litterImagesRelations` — `litter_id` → `litters`
- Extend `littersRelations` to include `images: many(litterImages)` (no `orderBy` in the relation definition — ordering is applied at the query site)

Shared type in `shared/src/index.ts`:
- `LitterImage` interface `{ id, litterId, url, storagePath, sortOrder, createdAt }`
- Extend `LitterWithDogs` to include `images: LitterImage[]`

---

## Backend

All routes in `server/src/routes/litters/index.ts`.

### Upload gallery image
`POST /litters/:id/gallery`
Admin-only. Accepts `multipart/form-data` with a `file` field.
- Validates litter exists
- Uploads file to `litter-media` bucket at path `{litterId}/gallery/{timestamp}-{filename}`
- Inserts row into `litter_images` with returned public URL and storage path
- Returns the new `LitterImage` row

### Delete gallery image
`DELETE /litters/:id/gallery/:imageId`
Admin-only.
- Fetches `storage_path` from the `litter_images` row
- Deletes row from `litter_images`
- Removes file from Supabase storage using `supabase.storage.from(STORAGE_BUCKETS.litters).remove([storagePath])`
  - No `deleteFile` helper is needed; call storage inline
- Returns `{ success: true }`

### Supabase storage helper
No new helper required. The existing `uploadFile` handles uploads. Deletes are done inline via the Supabase client.

### Fetch litter (existing)
`GET /litters/:id` — extend Drizzle `with:` to include `images: { orderBy: [asc(litterImages.createdAt)] }`.

Note: this route does not currently gate on `isPublic` (a pre-existing behaviour — unauthenticated users can fetch any litter by ID if they know it). Fixing that is out of scope for this feature; the gap is acknowledged here for future reference.

`GET /` (public litters list) — intentionally does **not** include `images` to keep the list payload light. Cover image is sufficient for the card grid.

---

## Admin UI

**File:** `client/src/pages/admin/index.tsx` — the `AdminLitterDetail` function (edit mode only, not the new-litter form). Note: `AdminLitterDetail.tsx` in the same directory is only a re-export stub; all implementation goes in `index.tsx`.

The component's local litter state type (currently `Litter & { sire: Dog; dam: Dog; puppies: unknown[] }`) must be extended to include `images: LitterImage[]` so `litter.images` is accessible for seeding gallery state on load.

Add a `galleryImages` state: `const [galleryImages, setGalleryImages] = useState<LitterImage[]>([])`, populated from `litter.images` in the `useEffect` that fetches the litter.

Add a "Gallery" card below the existing Cover Image card:

- Photo grid: wrapping flex/grid, 80×80px thumbnails with rounded corners
- Each thumbnail has an ✕ button overlay (top-right) that calls `DELETE /litters/:id/gallery/:imageId`, removes the image from `galleryImages` state on success, and shows an inline error string on failure
- "Upload photo" button opens a file picker; on file select, calls `POST /litters/:id/gallery` and appends the returned image to `galleryImages` state; shows an inline error string on failure
- Accepted formats: JPEG, PNG, WebP, HEIC (matching existing cover image picker)
- No bulk upload — one file at a time

---

## Public UI

### Litter detail page (`/litters/:id`)

Add a photo gallery section after the puppies section and before the `litter.notes` block.

Page order: cover image → title/status → parents → puppies → **gallery** → notes → CTA

- Only rendered when `litter.images && litter.images.length > 0`
- Grid: 2 cols on mobile, 3 cols on tablet, 4 cols on desktop
- Each image: `aspect-square`, `object-cover`, `rounded-xl`

### Litters list page (`/litters`)

No changes — cover image already shown on cards. The list API does not return `images`.

---

## Storage

Uses existing `litter-media` bucket. Gallery images stored under `{litterId}/gallery/` prefix, separate from the cover image path. The storage path is persisted in the `litter_images.storage_path` column so deletes are clean and do not depend on URL parsing.

---

## Out of Scope

- Drag-to-reorder (`sort_order` column is present for future use; ordering is by `created_at` ASC for now)
- Bulk multi-file upload
- Image captions
- Gallery on the new-litter creation form (upload after creating the litter)
