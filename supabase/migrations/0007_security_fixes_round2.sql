-- Second security review pass. Fixes four issues found in a full-codebase
-- review (see CLAUDE.md for the invariants these protect):
--
-- 1. The 'documents: pet access read' storage policy's vet-share branch
--    joined `documents d on d.file_url = name` but never correlated
--    `document_shares.document_id` back to `d.id` — it only checked
--    "is this vet shared *some* document", not "is this vet shared *this*
--    document". Any vet shared exactly one document could read every
--    pet's documents in the bucket. Fix: reuse `is_shared_with_vet(uuid)`
--    (0004), which already does this correlation correctly, and apply it
--    to the specific document whose file_url matches the object path.
drop policy if exists "documents: pet access read" on storage.objects;
create policy "documents: pet access read" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      has_pet_access((split_part(name, '/', 1))::uuid)
      or exists (
        select 1 from documents d
        where d.file_url = name and is_shared_with_vet(d.id)
      )
    )
  );

-- 2. `profiles` only ever had a self-read policy (0001), unlike `vets`
--    which got a broadened "any authenticated read" policy in the same
--    original migration. Every feature that joins `profiles(...)` for a
--    user other than the viewer silently got null back (RLS-filtered, not
--    an error): vet listings always showed "Vetted professional" instead
--    of the vet's name, community posts always showed "Pet parent"
--    instead of the author, and — the real functional break — both
--    medication-chain notification emails (vet -> owner "prescription
--    ready", owner -> caretakers "confirmed") silently never sent because
--    the recipient's profile/email came back null.
--
--    Widen with three narrow, relationship-scoped read policies rather
--    than opening profiles up entirely:
--    - vet profiles are publicly readable by any authenticated user,
--      symmetric with the existing `vets: any authenticated read` policy
--      (they're already browsable for booking).
--    - community post authors are publicly readable by any authenticated
--      user, symmetric with `community_posts: any authenticated read`.
--    - any two users who share access to the same pet (owner, caretaker,
--      secondary_contact, vet — via caretaker_access or ownership) can
--      read each other's profile. Safe from RLS recursion: pets' and
--      caretaker_access's own policies only reference has_pet_access(),
--      which never queries profiles.
--
--    Vet profiles are readable by anyone, not just authenticated users —
--    0008 adds a public (no-login) clinic directory, which needs to show a
--    vet's name/photo before the visitor has signed in.
create policy "profiles: vet profiles are public" on profiles
  for select using (
    exists (select 1 from vets v where v.id = profiles.id)
  );

create policy "profiles: community authors are public" on profiles
  for select using (
    auth.role() = 'authenticated'
    and exists (select 1 from community_posts cp where cp.author_id = profiles.id)
  );

create policy "profiles: shared-pet relationship read" on profiles
  for select using (
    exists (
      select 1 from pets p
      where p.owner_id = profiles.id and has_pet_access(p.id)
    )
    or exists (
      select 1 from caretaker_access ca
      where ca.user_id = profiles.id and has_pet_access(ca.pet_id)
    )
  );

-- 3. 'medication-photos' write only checked "is any onboarded vet" with no
--    per-pet scoping, unlike the sibling documents/pet-photos write
--    policies fixed in the same original security pass (0005) — any
--    self-onboarded vet (manual/unverified by design) could write into
--    any pet's medication-photos folder.
drop policy if exists "medication-photos: vet write" on storage.objects;
create policy "medication-photos: vet write" on storage.objects
  for insert with check (
    bucket_id = 'medication-photos'
    and exists (select 1 from vets v where v.id = auth.uid())
    and has_pet_access((split_part(name, '/', 1))::uuid)
  );

-- 4. 'medication_reminders: vet creates' checked has_pet_access(pet_id),
--    but has_pet_access is role-agnostic (true for the owner OR any
--    caretaker_access row regardless of role) despite the original
--    comment's claim that this required role='vet' access. A user granted
--    plain role='caretaker' access to a pet could self-onboard as a vet
--    (unverified by design) and successfully prescribe for that pet.
drop policy if exists "medication_reminders: vet creates" on medication_reminders;
create policy "medication_reminders: vet creates" on medication_reminders
  for insert with check (
    prescribed_by = auth.uid()
    and exists (
      select 1 from caretaker_access ca
      where ca.pet_id = medication_reminders.pet_id
        and ca.user_id = auth.uid()
        and ca.role = 'vet'
    )
  );
