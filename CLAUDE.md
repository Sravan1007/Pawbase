Pet Passport — Project Context for Claude Code
What this is
A single hub app for pet needs: documents (with a real vault + scoped vet-sharing), vet care (in-clinic + virtual consultation booking, vet-side daily appointments), daily care coordination (caretakers), commerce (shopping, grooming, food/spa), a Paw Community feed, a Universal Pet ID, travel document checklists, and a QR emergency collar tag. Full spec in `PRD.md` — read it before starting new feature work.
Non-negotiable product principles

1. We are NOT an authority on travel/entry rules — we're a checklist. Every travel rules view must show a "last verified" date and a visible disclaimer to confirm with the airline/authority. Ruleset content itself (what's required, verification/refresh) is owned and maintained on the backend by ops — the app only renders it.
2. The QR tag's public emergency page must work with NO login and NO app install — plain mobile web page.
3. The QR emergency page must stay accessible even if the owner's subscription has lapsed. Never gate it behind billing status.
4. Medication reminders follow a three-step chain: vet prescribes (photo + dose + schedule) → owner confirms the prescription entry → caretaker administers per schedule and taps an explicit "confirmed given" action (timestamped, logged). A dismissed notification is never treated as confirmation. Caretaker reminders should not activate until the owner has confirmed the prescription.
5. Multi-pet support from day one — do not build single-pet-per-account assumptions into the data model.
6. Vet onboarding is manual for v1 — no automated credential-verification workflow to build. The trust signal on a vet profile reflects manual onboarding data only.

Stack

* Frontend: Next.js (App Router, TypeScript, Tailwind) — one web app serving three surfaces: owner/caretaker app under `(app)`, vet portal under `vet/`, and the public no-login QR page under `qr/[slug]`
* Backend/DB: Supabase (Postgres + auth + storage + RLS). Migrations, in order:
  - `0001_init.sql` — core schema
  - `0002_shop_and_community.sql` — adds `shop` order type + `community_posts`
  - `0003_pet_id_docshare_appointments.sql` — adds `pets.pet_code` (Universal Pet ID) + `document_shares`
  - `0004_fix_document_share_recursion.sql` — fixes an RLS recursion bug 0003 introduced (see gotcha below)
  - `0005_security_fixes.sql` — security review fixes: adds a missing `vet_bookings` SELECT policy for the vet themselves (they couldn't see their own appointments before this), and scopes all storage bucket write policies (and `documents` bucket reads) to `has_pet_access`/`document_shares`/vet status instead of "any authenticated user, any path"
  - `0006_travel_checklists.sql` — adds `travel_rulesets` (backend/ops-owned reference data, seeded with 5 sample airlines/countries) + `travel_checklist_progress` (per-pet fulfillment tracking) — closes a real PRD §3.2 scope gap that had never been built
* Email notifications: `src/lib/email.ts` wraps Resend. Two hooks in the medication chain — `createPrescription` (vet/pets/[id]/prescribe/actions.ts) emails the owner when a vet prescribes; `ownerConfirmPrescription` (pets/[id]/medications/actions.ts) emails every caretaker with `can_confirm_medication=true` once the owner confirms. Sending is best-effort (logs and swallows errors) so a failed email never blocks the actual DB write. **Sandbox limitation**: without a verified sending domain, Resend only delivers to the exact email the Resend account owner signed up with — not even `+alias` variants of it. Fine for solo dev testing, but real multi-user delivery (the actual point of this feature) needs a verified domain in Resend before it'll reach owners/caretakers who aren't that one account. Push notifications (in-app/mobile) are still not implemented at all.
* File storage: three Supabase Storage buckets — `pet-photos`, `medication-photos` (both public read, write scoped by policy), `documents` (private, read+write scoped by policy). All three buckets use the `${pet_id}/...` path convention so storage policies can check `has_pet_access` on the first path segment — keep that convention when adding new upload code.
* `next.config.ts` allowlists the Supabase project's hostname for `next/image` (derived from `NEXT_PUBLIC_SUPABASE_URL` at config load, not hardcoded). Without this, any `<Image src={supabaseStorageUrl}>` throws "Invalid src prop" at render time — this was a real latent bug that went unnoticed until the first prescription with a real photo actually rendered on the medications page. **Config changes here need a dev server restart** (`next dev` doesn't hot-reload `next.config.ts`) — if you add a new external image host, restart before assuming it's broken.
* Styling: no component library — design tokens + reusable classes (`.card`, `.btn-primary`/`.btn-secondary`/`.btn-ghost`, `.input`, `.badge-*`, `.page-title`, `.empty-state`, etc.) defined once in `src/app/globals.css` under `@layer components`. Warm/minimal palette via CSS custom properties (`--accent`, `--border`, `--success`, etc.), deliberately no `prefers-color-scheme` auto dark mode.

Running locally

1. Create a Supabase project, run all six migrations in `supabase/migrations/` **in order** against it (see the SQL editor gotcha below before you do)
2. Copy `.env.local.example` to `.env.local` and fill in the project URL, anon key, and service role key
3. `npm install && npm run dev`

Testing

* `npm run test:e2e` — Playwright critical-path suite (`tests/critical-paths.spec.ts`): login, pet creation + Universal Pet ID, public QR page reachable with zero auth, document upload, medications page, travel checklist. Runs against the real dev server and real Supabase project — no mocking — so it catches actual RLS/auth regressions, not just rendering bugs. `npm run test:e2e:ui` opens Playwright's UI mode for debugging.
* Tests reuse the existing confirmed test account (`tests/helpers.ts`) rather than signing up fresh, to skip email confirmation. Each run creates a new throwaway pet (`E2E Test Pet <timestamp>`) rather than depending on a fixed pet ID — cheap to leave lying around in a dev project, don't point this at production data.
* Gotcha hit while writing these: `page.waitForURL("**/pets/*")` also matches `/pets/new` itself (the page you start a create-pet flow on) and resolves before the real post-submit redirect happens. Use a pattern that excludes `new` explicitly, e.g. `/\/pets\/(?!new)[a-f0-9-]+$/`.

Route map

* `/` → redirects to `/dashboard`
* `/login`, `/signup` — Supabase email/password auth
* `/dashboard`, `/pets/new`, `/pets/[id]` — owner/caretaker app (multi-pet)
* `/pets/[id]/caretakers/new` — owner grants caretaker/secondary_contact/vet access by email (caretaker must already have an account — no marketplace in v1)
* `/pets/[id]/medications` — medication chain UI: owner "Confirm prescription" button, caretaker "Confirmed given" button (both also enforced by RLS, not just UI)
* `/vet/onboard`, `/vet/dashboard`, `/vet/pets/[id]/prescribe` — vet portal; manual self-entered profile, prescribe requires the owner to have granted `role='vet'` access first
* `/qr/[slug]` — public emergency page, reads via the service-role admin client, never checks `subscriptions`
* `/consultation`, `/virtual-consultation` — browse onboarded vets + book (`vet_bookings`, type `in_person`/`virtual`); share `BookingForm` (`src/components/BookingForm.tsx`) and `getVetListings()` (`src/lib/vets.ts`) — no prior caretaker_access grant required to book
* `/grooming` — service tiers + booking creates an `orders` row (type `spa`)
* `/shop` — static curated catalog + "Add to order" creates an `orders` row (type `shop`) — no real inventory/payment
* `/community` — Paw Community feed; any authenticated user reads all posts, writes only their own (optionally tagged to a pet they have access to)
* `/pets/[id]/documents` — document vault: upload (private bucket, signed URLs generated per view), and "Share with vet" scoped to a specific upcoming `vet_bookings` row (creates a `document_shares` row, not standing access)
* `/pets/[id]/travel` — travel document checklist: rulesets are backend/ops-owned reference data (`travel_rulesets`, currently 5 seeded rows), owner just checks off which required documents they've handled per destination (`travel_checklist_progress`) — app never fills or submits anything
* All four booking/ordering pages share `getAccessiblePets()` (`src/lib/pets.ts`) for the "which pet is this for" selector

Role-based interface (one app, routed by role — not separate codebases)
* `(app)/*` — owner + caretaker interface. `/dashboard` splits into "Your pets" (owner, full admin) and "Pets you care for" (caretaker — today's owner-confirmed medications with an inline "Confirm given" button, no need to drill into the pet page)
* `vet/*` — doctor interface. `/vet/dashboard` is appointments-first: today's `vet_bookings` with confirm/mark-done actions, "Patients with standing access" (via `caretaker_access` role=`vet`) is secondary
* New-user onboarding: signup → if the account ends up with zero owned/caretaker pets, `/dashboard` redirects to `/pets/new?onboarding=1` (species/breed/DOB, tailored copy, "Skip for now"). Signup itself has an "I'm joining as someone else's caretaker" checkbox that skips straight to `/dashboard` instead.

Data model
See `PRD.md` Section 4 for the current schema (Owner, Pet, Document, TravelRuleset, MedicationReminder, CaretakerAccess, QRTag, VetBooking, Order, CommunityPost, DocumentShare). Note `MedicationReminder.owner_confirmed_at` gates caretaker-facing reminders, `Order.type` includes `shop` alongside `food`/`spa`, and `Pet.pet_code` is the Universal Pet ID (`PP-XXXXXX`, generated in `src/lib/petCode.ts`, unique, shown on the pet detail page and the public QR page). Keep this file and the PRD in sync if the schema changes.
Build order (do not skip ahead)

1. Auth + multi-pet profile
2. Document vault (upload, categorize, expiry reminders)
3. QR emergency tag + public scan page
4. Caretaker access + meal/med reminders with photo confirmation (owner-confirm → caretaker-administer flow)
5. Vet booking (simple calendar; manual vet onboarding only for v1)
6. Food/spa ordering
7. Travel document checklists (rendering only; ruleset content owned by backend/ops)
8. Vet Consultation + Virtual Vet Consultation booking pages, Pet Grooming, Pet Shopping, Paw Community (reuse existing `vet_bookings`/`orders` models plus the new `community_posts` table)
9. Role-routed dashboards, multi-step onboarding, real document vault + vet sharing, Universal Pet ID, vet daily-appointments view, full design-system pass (this round — see migrations 0003/0004)
10. Full security review + fixes (see migration 0005 and "Security notes" below)

Security notes

* File uploads from client components (document vault, medication photos) always write to `${pet_id}/...` paths — the storage RLS policies (0005) key off the first path segment via `has_pet_access(split_part(name, '/', 1)::uuid)`. Any new upload feature must follow the same convention or the storage policy needs a matching update.
* Every server action re-checks `auth.getUser()` and relies on RLS as the actual enforcement layer (not just the UI) — this held up well in review; keep it when adding new actions rather than trusting a client-supplied ID.
* Accepted risk, not fixed: `inviteCaretaker` (`src/app/(app)/pets/[id]/caretakers/new/actions.ts`) reveals whether an email has a Pet Passport account via its error message ("No account found..."). This is deliberate UX (the owner needs to know the invite won't land) but is a mild user-enumeration surface — revisit if it becomes a real concern.
* `orderProduct`/`bookGrooming` accept client-supplied product name/price/service strings with no server-side catalog validation — fine given there's no real payment processing in v1 (PRD §6), but don't build real commerce on top of this without adding a server-side source of truth for pricing.

Conventions

* Server Actions (`actions.ts` next to the page that uses them) for all writes; RLS in the migration is the actual enforcement layer, the UI is a convenience on top
* `src/lib/supabase/client.ts` (browser), `server.ts` (Server Components/Actions, cookie-based session), `admin.ts` (service role, server-only, currently only used by the QR page) — don't cross these
* No git repo yet by request — initialize when ready
* Client form components: capture `e.currentTarget` into a local variable *before* any `await` in the submit handler. The DOM nulls out `currentTarget` once event dispatch finishes, so `e.currentTarget.reset()` after an awaited server action throws — do `const form = e.currentTarget` first, then `form.reset()`.
* Insert-then-`.select()` (i.e. `INSERT ... RETURNING`) can spuriously fail with an RLS violation when the SELECT policy calls a `SECURITY DEFINER` function that queries the same table mid-statement — even when the row's own data clearly satisfies the policy. Symptom: the same insert succeeds without `.select()`/`RETURNING`, and a separate follow-up `SELECT` can see the row fine. Workaround used throughout: generate the row's `id` client-side (`randomUUID()`) and do a plain `.insert()` with no `.select()`.
* **RLS recursion between two tables**: if table A's policy queries table B, and table B's policy queries back into table A (e.g. `documents` ↔ `document_shares` in 0003/0004), Postgres throws `42P17 infinite recursion detected in policy`. Fix by wrapping the cross-table check in a `SECURITY DEFINER` `stable` SQL function (same pattern as `has_pet_access`) — the function's internal query runs with the definer's privileges and doesn't re-trigger the other table's RLS, breaking the cycle. Don't write a policy with a raw correlated subquery into a table that itself has RLS referencing back — always ask "could this cycle?" before adding a cross-table policy.
* **The Supabase SQL editor is not reliable for multi-statement scripts in this environment.** Across this project, pasting a multi-statement migration has repeatedly shown "Success. No rows returned" while some or all of the statements silently did not apply (verified via direct REST calls against `information_schema` / the actual table afterward) — root cause never fully pinned down (possibly a stale/reused editor tab, possibly something else), but it's happened enough times to treat as expected. When running a new migration: (1) always use a genuinely fresh "+ New query" tab, never reuse one, (2) if a multi-statement script is going to run, verify the result afterward via a direct `curl` against `${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/<table>` with the service-role key rather than trusting the editor's "Success" message, (3) if verification shows it didn't apply, re-run in smaller chunks (a few statements at a time, verifying after each) rather than re-pasting the same full script — that has reliably worked every time this came up, where re-running the identical full script repeatedly did not.

Explicitly out of scope for v1

* Auto-filling/submitting official travel or customs paperwork
* Insurance claims processing
* Pet-sitter/walker marketplace
* GPS pet tracking (QR tag is static info only)
* Automated travel ruleset verification (backend/ops-owned)
* Automated vet credential verification (manual onboarding only)
