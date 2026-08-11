-- Travel document checklists (PRD §3.2) — a real v1 scope item that was
-- never actually built. Content is backend/ops-owned reference data (not
-- per-pet), seeded here with a few common destinations; the app only
-- renders it plus a per-pet fulfillment checklist. No auto-fill/submit —
-- owner just marks what they've handled themselves.

create table if not exists travel_rulesets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('airline', 'country')),
  required_documents text[] not null,
  last_verified_at timestamptz not null default now()
);

alter table travel_rulesets enable row level security;

drop policy if exists "travel_rulesets: any authenticated read" on travel_rulesets;
create policy "travel_rulesets: any authenticated read" on travel_rulesets
  for select using (auth.role() = 'authenticated');

-- One row per (pet, ruleset) tracking which of that ruleset's
-- required_documents the owner has marked as fulfilled/uploaded.
create table if not exists travel_checklist_progress (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  ruleset_id uuid not null references travel_rulesets(id) on delete cascade,
  fulfilled_documents text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (pet_id, ruleset_id)
);

alter table travel_checklist_progress enable row level security;

drop policy if exists "travel_checklist_progress: pet access" on travel_checklist_progress;
create policy "travel_checklist_progress: pet access" on travel_checklist_progress
  for all using (has_pet_access(pet_id)) with check (has_pet_access(pet_id));

insert into travel_rulesets (name, kind, required_documents, last_verified_at) values
  ('United Airlines — Pets in Cabin', 'airline',
    array['Health certificate (within 10 days of travel)', 'Proof of vaccination', 'Carrier meeting size requirements', 'Airline pet booking confirmation'],
    now()),
  ('Emirates — Pets in Cargo', 'airline',
    array['Health certificate', 'Import permit for destination country', 'Rabies vaccination certificate', 'Microchip confirmation'],
    now()),
  ('USA — Pet Import', 'country',
    array['Rabies vaccination certificate', 'CDC Dog Import Form (if applicable)', 'Veterinary health certificate'],
    now()),
  ('United Kingdom — Pet Import', 'country',
    array['Microchip confirmation', 'Rabies vaccination certificate', 'Animal Health Certificate', 'Tapeworm treatment record (dogs)'],
    now()),
  ('India — Pet Import', 'country',
    array['Import permit (NOC) from Animal Quarantine', 'Health certificate from origin country', 'Rabies vaccination certificate (not less than 21 days before travel)', 'Microchip confirmation'],
    now())
on conflict do nothing;
