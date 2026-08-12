-- Third feature batch: a real connection point for virtual consultations,
-- and "traveling mode" with nearby-vet lookup.
--
-- Nearby search is self-reported + browser-geolocation only (no external
-- maps/places API) — vets enter their own clinic lat/lng, and distance is
-- computed client-side (Haversine) against the visitor's own location.

-- Vet confirms a booking and (for virtual especially) pastes a call link —
-- Zoom/Meet/whatever they use. No built-in video calling in v1.
alter table vet_bookings add column if not exists meeting_url text;

-- Self-reported clinic coordinates for the nearby lookup.
alter table vets add column if not exists lat double precision;
alter table vets add column if not exists lng double precision;

-- Simple on/off toggle rather than date-range trip tracking — the owner
-- turns it on before traveling and off when back; while on, the (app) nav
-- shows a "Traveling" tab with nearby vets. Owner-only, same as every other
-- core pet-profile field (see "pets: owner updates", 0001).
alter table pets add column if not exists travel_mode_active boolean not null default false;
alter table pets add column if not exists travel_destination text;
