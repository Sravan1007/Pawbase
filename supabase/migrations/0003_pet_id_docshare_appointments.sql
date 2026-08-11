-- Universal Pet ID, scoped document sharing with vets, and support for the
-- vet-side appointment status flow. Additive only.

alter table pets add column if not exists pet_code text unique;

-- Backfill existing pets created before pet_code existed.
update pets
set pet_code = 'PP-' || upper(substr(md5(random()::text || id::text), 1, 6))
where pet_code is null;

-- Scoped sharing: an owner/caretaker shares specific documents with a vet
-- for a specific upcoming booking — distinct from granting full
-- caretaker_access (which is a standing relationship, not a one-time share).
create table if not exists document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  booking_id uuid not null references vet_bookings(id) on delete cascade,
  vet_id uuid not null references vets(id) on delete cascade,
  shared_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (document_id, booking_id)
);

alter table document_shares enable row level security;

drop policy if exists "document_shares: pet access read" on document_shares;
create policy "document_shares: pet access read" on document_shares
  for select using (
    vet_id = auth.uid()
    or exists (
      select 1 from documents d where d.id = document_id and has_pet_access(d.pet_id)
    )
  );

drop policy if exists "document_shares: pet access write" on document_shares;
create policy "document_shares: pet access write" on document_shares
  for insert with check (
    shared_by = auth.uid()
    and exists (
      select 1 from documents d where d.id = document_id and has_pet_access(d.pet_id)
    )
  );

drop policy if exists "document_shares: owner revokes" on document_shares;
create policy "document_shares: owner revokes" on document_shares
  for delete using (
    exists (
      select 1 from documents d where d.id = document_id and has_pet_access(d.pet_id)
    )
  );

-- A vet can read a document's row (not just the share record) once it's
-- been shared with them for a booking — narrower than full pet access.
drop policy if exists "documents: shared with vet" on documents;
create policy "documents: shared with vet" on documents
  for select using (
    exists (
      select 1 from document_shares ds where ds.document_id = documents.id and ds.vet_id = auth.uid()
    )
  );
