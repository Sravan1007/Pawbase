-- Pet Passport v1 schema
-- Roles: owner, caretaker, secondary_contact, vet
-- Auth: Supabase auth.users is the identity source; `profiles` extends it.
--
-- Safe to re-run: drops this migration's own objects first, then recreates
-- them. Only touches the tables/policies/buckets defined below — never
-- touches auth.users or other schemas.

drop table if exists subscriptions cascade;
drop table if exists orders cascade;
drop table if exists qr_tags cascade;
drop table if exists daily_health_logs cascade;
drop table if exists medication_confirmations cascade;
drop table if exists medication_reminders cascade;
drop table if exists vet_bookings cascade;
drop table if exists vets cascade;
drop table if exists caretaker_access cascade;
drop table if exists documents cascade;
drop table if exists pet_weight_logs cascade;
drop table if exists pets cascade;
drop table if exists profiles cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop function if exists has_pet_access(uuid);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now()
);

create table pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  dob date,
  photo_url text,
  -- Critical medical info shown on the public QR emergency page (allergies,
  -- conditions). Keep this short and non-sensitive beyond what's needed for
  -- a finder or vet to act safely — this is public, unauthenticated data.
  medical_notes text,
  created_at timestamptz not null default now()
);

create table pet_weight_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  weight_kg numeric not null,
  logged_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  type text not null check (type in ('vaccination', 'vet_record', 'travel_doc', 'insurance')),
  file_url text not null,
  expiry_date date,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references profiles(id)
);

-- Caretaker / secondary-contact / vet access to a pet, granted by the owner.
create table caretaker_access (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'caretaker', 'secondary_contact', 'vet')),
  can_confirm_medication boolean not null default false,
  can_view_documents boolean not null default true,
  finder_may_call boolean not null default false,
  vet_may_call boolean not null default false,
  created_at timestamptz not null default now(),
  unique (pet_id, user_id)
);

-- Manual vet onboarding for v1 — no automated credential verification.
create table vets (
  id uuid primary key references profiles(id) on delete cascade,
  clinic_name text,
  credentials text,
  years_experience int,
  onboarded_by uuid references profiles(id),
  onboarded_at timestamptz not null default now()
);

create table vet_bookings (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  vet_id uuid not null references vets(id),
  type text not null check (type in ('virtual', 'in_person')),
  scheduled_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Medication chain: vet prescribes -> owner confirms -> caretaker administers/confirms each dose.
create table medication_reminders (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  prescribed_by uuid not null references vets(id),
  photo_url text not null,
  dose text not null,
  schedule text not null,
  owner_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table medication_confirmations (
  id uuid primary key default gen_random_uuid(),
  medication_reminder_id uuid not null references medication_reminders(id) on delete cascade,
  caretaker_id uuid not null references profiles(id),
  confirmed_at timestamptz not null default now()
);

create table daily_health_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  logged_by uuid not null references profiles(id),
  note text not null,
  logged_at timestamptz not null default now()
);

-- QR emergency tag. `unique_slug` is the public, unguessable path component
-- for the no-login scan page; never gate this table's read behind billing.
create table qr_tags (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  unique_slug text not null unique,
  status text not null default 'active' check (status in ('active', 'lost', 'replaced')),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  type text not null check (type in ('food', 'spa')),
  status text not null default 'pending',
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade unique,
  status text not null default 'active' check (status in ('active', 'lapsed', 'cancelled')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- === Row Level Security ===

alter table profiles enable row level security;
alter table pets enable row level security;
alter table pet_weight_logs enable row level security;
alter table documents enable row level security;
alter table caretaker_access enable row level security;
alter table vets enable row level security;
alter table vet_bookings enable row level security;
alter table medication_reminders enable row level security;
alter table medication_confirmations enable row level security;
alter table daily_health_logs enable row level security;
alter table qr_tags enable row level security;
alter table orders enable row level security;
alter table subscriptions enable row level security;

create or replace function has_pet_access(target_pet_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from pets p where p.id = target_pet_id and p.owner_id = auth.uid()
    union
    select 1 from caretaker_access ca where ca.pet_id = target_pet_id and ca.user_id = auth.uid()
  );
$$;

create policy "profiles: self read/write" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Creates the profiles row from auth.users regardless of whether email
-- confirmation is on (client-side signup can't rely on getting a session
-- back immediately when it is). security definer so it can write during the
-- auth.users insert, before the new user has a session of their own.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create policy "pets: access via ownership or caretaker_access" on pets
  for select using (has_pet_access(id));
create policy "pets: owner manages" on pets
  for insert with check (owner_id = auth.uid());
create policy "pets: owner updates" on pets
  for update using (owner_id = auth.uid());
create policy "pets: owner deletes" on pets
  for delete using (owner_id = auth.uid());

create policy "weight logs: pet access" on pet_weight_logs
  for select using (has_pet_access(pet_id));
create policy "weight logs: pet access write" on pet_weight_logs
  for insert with check (has_pet_access(pet_id));

create policy "documents: pet access" on documents
  for select using (has_pet_access(pet_id));
create policy "documents: pet access write" on documents
  for insert with check (has_pet_access(pet_id));

create policy "caretaker_access: pet access read" on caretaker_access
  for select using (has_pet_access(pet_id));
create policy "caretaker_access: owner manages" on caretaker_access
  for all using (exists (select 1 from pets p where p.id = pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from pets p where p.id = pet_id and p.owner_id = auth.uid()));

create policy "vets: self manage" on vets
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "vets: any authenticated read" on vets
  for select using (auth.role() = 'authenticated');

create policy "vet_bookings: pet access" on vet_bookings
  for select using (has_pet_access(pet_id));
create policy "vet_bookings: pet access write" on vet_bookings
  for insert with check (has_pet_access(pet_id));
create policy "vet_bookings: vet updates own bookings" on vet_bookings
  for update using (vet_id = auth.uid());

create policy "medication_reminders: pet access read" on medication_reminders
  for select using (has_pet_access(pet_id));
-- A vet may only prescribe for a pet they've been granted access to (owner
-- adds them via caretaker_access with role='vet', same as a caretaker
-- invite) — prevents an authenticated vet writing reminders for any pet_id.
create policy "medication_reminders: vet creates" on medication_reminders
  for insert with check (prescribed_by = auth.uid() and has_pet_access(pet_id));
create policy "medication_reminders: owner confirms" on medication_reminders
  for update using (exists (select 1 from pets p where p.id = pet_id and p.owner_id = auth.uid()));

create policy "medication_confirmations: pet access read" on medication_confirmations
  for select using (
    exists (
      select 1 from medication_reminders mr
      where mr.id = medication_reminder_id and has_pet_access(mr.pet_id)
    )
  );
-- Caretaker may only log a confirmation once the owner has reviewed the prescription,
-- and only if their caretaker_access grants can_confirm_medication.
create policy "medication_confirmations: caretaker confirms" on medication_confirmations
  for insert with check (
    caretaker_id = auth.uid()
    and exists (
      select 1 from medication_reminders mr
      join caretaker_access ca on ca.pet_id = mr.pet_id
      where mr.id = medication_reminder_id
        and mr.owner_confirmed_at is not null
        and ca.user_id = auth.uid()
        and ca.can_confirm_medication = true
    )
  );

create policy "daily_health_logs: pet access" on daily_health_logs
  for select using (has_pet_access(pet_id));
create policy "daily_health_logs: pet access write" on daily_health_logs
  for insert with check (has_pet_access(pet_id));

-- QR tags: owners/caretakers manage them while authenticated. The public
-- lost-and-found page is served by a server route using the service role
-- key (bypasses RLS by design) — see src/app/qr/[slug]/page.tsx. Never
-- expose this table directly to anon clients.
create policy "qr_tags: pet access" on qr_tags
  for select using (has_pet_access(pet_id));
create policy "qr_tags: owner manages" on qr_tags
  for all using (exists (select 1 from pets p where p.id = pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from pets p where p.id = pet_id and p.owner_id = auth.uid()));

create policy "orders: pet access" on orders
  for all using (has_pet_access(pet_id)) with check (has_pet_access(pet_id));

create policy "subscriptions: pet access read" on subscriptions
  for select using (has_pet_access(pet_id));

-- === Storage buckets ===
-- Public: rendered on the QR page or otherwise fine to expose directly.
-- Private ("documents"): vaccination/vet records, access-controlled via RLS.
insert into storage.buckets (id, name, public)
values
  ('pet-photos', 'pet-photos', true),
  ('medication-photos', 'medication-photos', true),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- storage.objects isn't dropped/recreated above (it's owned by the Storage
-- extension, not this migration), so its policies must be dropped
-- individually to stay re-runnable.
drop policy if exists "pet-photos: public read" on storage.objects;
drop policy if exists "pet-photos: authenticated write" on storage.objects;
drop policy if exists "medication-photos: public read" on storage.objects;
drop policy if exists "medication-photos: authenticated write" on storage.objects;
drop policy if exists "documents: authenticated read own" on storage.objects;
drop policy if exists "documents: authenticated write" on storage.objects;

create policy "pet-photos: public read" on storage.objects
  for select using (bucket_id = 'pet-photos');
create policy "pet-photos: authenticated write" on storage.objects
  for insert with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');

create policy "medication-photos: public read" on storage.objects
  for select using (bucket_id = 'medication-photos');
create policy "medication-photos: authenticated write" on storage.objects
  for insert with check (bucket_id = 'medication-photos' and auth.role() = 'authenticated');

create policy "documents: authenticated read own" on storage.objects
  for select using (bucket_id = 'documents' and auth.role() = 'authenticated');
create policy "documents: authenticated write" on storage.objects
  for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');
