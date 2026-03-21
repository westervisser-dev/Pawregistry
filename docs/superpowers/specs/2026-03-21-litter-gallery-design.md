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
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Drizzle schema addition in `server/src/db/schema.ts`:
- `litterImages` table definition
- `litterImagesRelations` — `litter_id` → `litters`
- Extend `littersRelations` to include `images: many(litterImages)`

Shared type in `shared/src/index.ts`:
- `LitterImage` interface
- Extend `LitterWithDogs` to include `images: LitterImage[]`

---

## Backend

All routes in `server/src/routes/litters/index.ts`.

### Upload gallery image
`POST /litters/:id/gallery`
Admin-only. Accepts `multipart/form-data` with a `file` field.
- Validates litter exists
- Uploads file to `litter-media` bucket at path `{litterId}/gallery/{timestamp}-{filename}`
- Inserts row into `litter_images` with returned URL
- Returns the new `LitterImage` row

### Delete gallery image
`DELETE /litters/:id/gallery/:imageId`
Admin-only.
- Deletes row from `litter_images`
- Removes file from Supabase storage
- Returns `{ success: true }`

### Fetch litter (existing)
`GET /litters/:id` — extend Drizzle `with:` to include `images` so gallery photos are included in the existing response. No route signature change needed.

---

## Admin UI

**File:** `client/src/pages/admin/index.tsx` — `AdminLitterDetail` component (edit mode only, not the new-litter form).

Add a "Gallery" card below the existing Cover Image card:

- Photo grid: wrapping flex/grid, 80×80px thumbnails with rounded corners
- Each thumbnail has an ✕ button overlay (top-right) that calls `DELETE /litters/:id/gallery/:imageId` and removes the image from local state
- "Upload photo" button opens a file picker; on file select, calls `POST /litters/:id/gallery` and appends the returned image to local state
- Accepted formats: JPEG, PNG, WebP, HEIC (matching existing cover image picker)
- No bulk upload — one file at a time

Local state: `const [galleryImages, setGalleryImages] = useState<LitterImage[]>([])` — populated from `litter.images` on load.

---

## Public UI

### Litter detail page (`/litters/:id`)

Add a photo gallery section between the parents grid and the puppies section.

- Only rendered when `litter.images && litter.images.length > 0`
- Grid: 2 cols on mobile, 3 cols on tablet, 4 cols on desktop
- Each image: `aspect-square`, `object-cover`, `rounded-xl`

### Litters list page (`/litters`)

No changes — cover image already shown on cards.

---

## Storage

Uses existing `litter-media` bucket. Gallery images stored under `{litterId}/gallery/` prefix, separate from the cover image path.

---

## Out of Scope

- Drag-to-reorder (`sort_order` column is present for future use)
- Bulk multi-file upload
- Image captions
- Gallery on the new-litter creation form (upload after creating the litter)
