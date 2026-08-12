-- Second feature batch: vet appointment-scoped patient history, daily care
-- routines, expanded vet/clinic profiles + reviews, expanded people profiles
-- + emergency SOS contact, and public (no-login) clinic browsing.

-- === People profiles ===
alter table profiles add column if not exists photo_url text;
alter table profiles add column if not exists dob date;
alter table profiles add column if not exists emergency_contact_name text;
alter table profiles add column if not exists emergency_contact_phone text;
alter table profiles add column if not exists emergency_contact_email text;

-- === Vet / clinic profiles ===
alter table vets add column if not exists designation text;
alter table vets add column if not exists photo_url text;
alter table vets add column if not exists species_focus text[] not null default '{}';
alter table vets add column if not exists clinic_photos text[] not null default '{}';
alter table vets add column if not exists clinic_address text;
alter table vets add column if not exists amenities text[] not null default '{}';

-- Public clinic directory: vets are now browsable with no login (was
-- "any authenticated read"). Loosening this to `using (true)` is safe —
-- the columns exposed (clinic name, credentials, photos, address, amenities)
-- are all meant to be marketed publicly, same as any clinic's own website.
drop policy if exists "vets: any authenticated read" on vets;
create policy "vets: public read" on vets
  for select using (true);

-- === Vet reviews ===
-- In-app only for v1 (no Google Places integration) — a review requires an
-- actual completed booking with that vet, one review per booking.
create table if not exists vet_reviews (
  id uuid primary key default gen_random_uuid(),
  vet_id uuid not null references vets(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  booking_id uuid not null references vet_bookings(id) on delete cascade unique,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table vet_reviews enable row level security;

create policy "vet_reviews: public read" on vet_reviews
  for select using (true);

create policy "vet_reviews: reviewer writes for a completed booking" on vet_reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from vet_bookings b
      where b.id = booking_id
        and b.vet_id = vet_id
        and b.status = 'completed'
        and has_pet_access(b.pet_id)
    )
  );

-- === Daily care routines ===
-- Recurring care items (bath, comb, walk, ...) an owner/caretaker defines
-- per pet, with a daily check-off log — same access model as
-- pet_weight_logs/daily_health_logs (has_pet_access, no owner-only gate,
-- since caretakers are expected to log these day to day).
create table if not exists pet_care_routines (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  title text not null,
  notes text,
  created_by uuid not null references profiles(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pet_care_routine_logs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references pet_care_routines(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  completed_by uuid not null references profiles(id),
  completed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (routine_id, completed_on)
);

alter table pet_care_routines enable row level security;
alter table pet_care_routine_logs enable row level security;

create policy "pet_care_routines: pet access" on pet_care_routines
  for all using (has_pet_access(pet_id)) with check (has_pet_access(pet_id));

create policy "pet_care_routine_logs: pet access" on pet_care_routine_logs
  for all using (has_pet_access(pet_id)) with check (has_pet_access(pet_id));

-- === Vet appointment-scoped read access ===
-- A vet with an appointment for a pet should be able to review its
-- prescription history and current care routine ahead of/during the visit,
-- without needing standing caretaker_access (that's still required to
-- *prescribe* — see 0007). Document visibility for a vet stays exactly as
-- already built (document_shares, scoped per booking); no schema change
-- needed there.
create or replace function vet_has_booking_with_pet(target_pet_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from vet_bookings b
    where b.pet_id = target_pet_id and b.vet_id = auth.uid() and b.status != 'cancelled'
  );
$$;

-- Additional SELECT policies — RLS OR's policies for the same command
-- together, so these only widen visibility, they don't replace the
-- existing has_pet_access-based policies.
create policy "medication_reminders: vet with booking reads" on medication_reminders
  for select using (vet_has_booking_with_pet(pet_id));

create policy "pet_care_routines: vet with booking reads" on pet_care_routines
  for select using (vet_has_booking_with_pet(pet_id));

create policy "pet_care_routine_logs: vet with booking reads" on pet_care_routine_logs
  for select using (vet_has_booking_with_pet(pet_id));

-- === Storage buckets for the new photo fields ===
insert into storage.buckets (id, name, public)
values
  ('profile-photos', 'profile-photos', true),
  ('clinic-photos', 'clinic-photos', true)
on conflict (id) do nothing;

drop policy if exists "profile-photos: public read" on storage.objects;
drop policy if exists "profile-photos: owner write" on storage.objects;
drop policy if exists "clinic-photos: public read" on storage.objects;
drop policy if exists "clinic-photos: vet write" on storage.objects;

create policy "profile-photos: public read" on storage.objects
  for select using (bucket_id = 'profile-photos');
-- Path convention: ${user_id}/... — the uploading user must own the path.
create policy "profile-photos: owner write" on storage.objects
  for insert with check (
    bucket_id = 'profile-photos'
    and (split_part(name, '/', 1))::uuid = auth.uid()
  );

create policy "clinic-photos: public read" on storage.objects
  for select using (bucket_id = 'clinic-photos');
-- Path convention: ${vet_id}/... — only an onboarded vet can write to their
-- own clinic-photos folder.
create policy "clinic-photos: vet write" on storage.objects
  for insert with check (
    bucket_id = 'clinic-photos'
    and (split_part(name, '/', 1))::uuid = auth.uid()
    and exists (select 1 from vets v where v.id = auth.uid())
  );
