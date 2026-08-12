-- Fourth feature batch: richer medication tracking (owner-added details,
-- assigned caretaker), vet visit notes, owner<->caretaker messaging, and a
-- 'prescription' document type for owner-uploaded scripts.

-- === Medication: owner-added detail + assigned caretaker ===
-- The vet's initial photo_url/dose/schedule stay as the source of truth;
-- these let the owner layer on more photos and specific dose *times*
-- (structured "HH:MM" strings) after the fact, without editing the vet's
-- original entry. No scheduler/cron exists in this app (by design, v1) —
-- dose_times drives a client-computed "due now / overdue" list, not a
-- pushed notification.
alter table medication_reminders add column if not exists owner_photo_urls text[] not null default '{}';
alter table medication_reminders add column if not exists dose_times text[] not null default '{}';
alter table medication_reminders add column if not exists assigned_caretaker_id uuid references profiles(id);

-- A medication with an assigned caretaker can only be confirmed by that
-- caretaker — narrows (not replaces) the existing "any caretaker with
-- can_confirm_medication" policy from 0001.
drop policy if exists "medication_confirmations: caretaker confirms" on medication_confirmations;
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
        and (mr.assigned_caretaker_id is null or mr.assigned_caretaker_id = auth.uid())
    )
  );

-- === Vet visit notes ===
-- A vet's remarks tied to a pet (optionally a specific booking) — visible
-- to the vet who wrote it and to anyone with pet access (owner/caretaker),
-- same read model as medication_reminders.
create table if not exists vet_visit_notes (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  vet_id uuid not null references vets(id) on delete cascade,
  booking_id uuid references vet_bookings(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

alter table vet_visit_notes enable row level security;

create policy "vet_visit_notes: pet access read" on vet_visit_notes
  for select using (has_pet_access(pet_id));

-- A vet may write a note for any pet they have access to OR any pet they
-- have a non-cancelled booking with (same reasoning as
-- vet_has_booking_with_pet, 0008) — a visit note is lighter-weight than a
-- prescription, doesn't need standing caretaker_access.
create policy "vet_visit_notes: vet writes" on vet_visit_notes
  for insert with check (
    vet_id = auth.uid()
    and (has_pet_access(pet_id) or vet_has_booking_with_pet(pet_id))
  );

-- === Owner <-> caretaker messaging ===
-- Deliberately simple: a flat per-pet message log, not a full chat system.
-- sendMessage (app layer) also emails the recipient — this table is the
-- in-app record so a message is still visible after the email's gone.
create table if not exists pet_messages (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);

alter table pet_messages enable row level security;

create policy "pet_messages: pet access" on pet_messages
  for all using (has_pet_access(pet_id)) with check (has_pet_access(pet_id) and sender_id = auth.uid());

-- === Owner-uploaded prescriptions ===
alter table documents drop constraint if exists documents_type_check;
alter table documents add constraint documents_type_check
  check (type in ('vaccination', 'vet_record', 'travel_doc', 'insurance', 'prescription'));
