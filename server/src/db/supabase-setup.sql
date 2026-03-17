-- Run this in your Supabase SQL Editor after initial setup

-- Create storage buckets
insert into storage.buckets (id, name, public)
values
  ('dog-images',       'dog-images',       true),
  ('litter-media',     'litter-media',     true),
  ('update-media',     'update-media',     true),
  ('client-documents', 'client-documents', false),
  ('health-certs',     'health-certs',     false)
on conflict do nothing;

-- Public read for public buckets (dog images, litter media, update media)
create policy "Public read dog images"
  on storage.objects for select
  using (bucket_id = 'dog-images');

create policy "Public read litter media"
  on storage.objects for select
  using (bucket_id = 'litter-media');

create policy "Public read update media"
  on storage.objects for select
  using (bucket_id = 'update-media');

-- Service role has full access to all buckets (server uses service role key)
-- No additional policies needed for service role — it bypasses RLS by default.

-- Row Level Security on tables
-- The server uses the service role key which bypasses RLS.
-- Enable RLS anyway for safety if direct client access is ever used.

alter table dogs enable row level security;
alter table health_certs enable row level security;
alter table litters enable row level security;
alter table puppies enable row level security;
alter table clients enable row level security;
alter table updates enable row level security;
alter table messages enable row level security;
alter table documents enable row level security;
alter table go_home_checklists enable row level security;

-- Service role bypass (these are effectively no-ops since service role ignores RLS,
-- but documented here for clarity)
-- All access is mediated through the ElysiaJS API — no direct client DB access.
