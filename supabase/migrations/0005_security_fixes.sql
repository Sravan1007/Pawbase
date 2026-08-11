-- Security review fixes.
--
-- 1. vet_bookings had no SELECT policy for the vet themselves — only the
--    pet's owner/caretaker could read a booking row. A vet with no standing
--    caretaker_access on that pet (the normal case before their first
--    visit) could not see their own appointments. Functional bug more than
--    a leak, but real: the vet dashboard silently showed nothing.
create policy "vet_bookings: vet reads own bookings" on vet_bookings
  for select using (vet_id = auth.uid());

-- 2. The 'documents' storage bucket allowed ANY authenticated user to
--    read AND write ANY object in the bucket, regardless of which pet's
--    folder it lived in — the storage-level policy never checked
--    has_pet_access or document_shares. This undermined the whole
--    "share specific documents with a vet" feature: table-level RLS on
--    `documents` was correct, but the underlying file bytes were not
--    actually protected. Object paths are `${pet_id}/...`, so the pet_id
--    is recoverable from the first path segment.
drop policy if exists "documents: authenticated read own" on storage.objects;
drop policy if exists "documents: authenticated write" on storage.objects;

create policy "documents: pet access read" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      has_pet_access((split_part(name, '/', 1))::uuid)
      or exists (
        select 1 from document_shares ds
        join documents d on d.file_url = name
        where ds.vet_id = auth.uid()
      )
    )
  );

create policy "documents: pet access write" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and has_pet_access((split_part(name, '/', 1))::uuid)
  );

-- 3. 'medication-photos' write was open to any authenticated user, not
--    just onboarded vets (the only role that should ever be prescribing).
drop policy if exists "medication-photos: authenticated write" on storage.objects;
create policy "medication-photos: vet write" on storage.objects
  for insert with check (
    bucket_id = 'medication-photos'
    and exists (select 1 from vets v where v.id = auth.uid())
  );

-- 4. 'pet-photos' write was open to any authenticated user for any path.
--    Not yet wired to an upload feature in the app, but tightened now to
--    match the `${pet_id}/...` path convention used elsewhere, so it's
--    safe by default whenever that feature is built.
drop policy if exists "pet-photos: authenticated write" on storage.objects;
create policy "pet-photos: pet access write" on storage.objects
  for insert with check (
    bucket_id = 'pet-photos'
    and has_pet_access((split_part(name, '/', 1))::uuid)
  );
