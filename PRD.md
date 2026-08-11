Pet Passport — Product Spec (v1)
1. Vision
A single hub for everything a pet needs — documents, medical care, daily care coordination, and travel — so owners, caretakers, and vets are never chasing scattered paperwork or screenshots.
2. Core Principles

* We are a checklist, not an authority. For travel/entry rules, we tell owners what documents are typically needed for an airline/country — we do not guarantee acceptance. Every rules page shows a "last verified" date and a disclaimer to confirm with the airline/authority directly. Verification and refresh of this data is handled on the backend (ops/manual process) — not a client-facing workflow.
* Emergency info is never paywalled. The QR tag's public emergency page (pet info, medical basics, owner + secondary contact) stays live even if a subscription lapses.
* Confirmation over assumption. Medication reminders require an active "confirmed given" tap with a timestamp — not just a passive notification — and show a photo of the actual prescribed medication so a caretaker can visually match it.
* No app required for a stranger. Anyone scanning a lost pet's QR tag lands on a plain mobile web page — no login, no app download.
* One app, role-routed. Owner, caretaker, and vet each get an interface built for their job (dashboard split by role, appointments-first for vets) — but it's one codebase and one data model behind it, not three separate apps.

3. v1 Feature Set
3.1 Pet Profile & Records

* Multi-pet support per owner account from day one
* Pet profile: name, species, breed, DOB/age, photo, weight tracking over time
* Document vault: vaccination records, vet visit history — upload, categorize, tag with expiry dates
* Expiry-based reminders (e.g., rabies vaccine due in 30 days)
* **Universal Pet ID**: every pet gets a short, human-shareable code (`PP-XXXXXX`, distinct from the internal database ID) shown prominently on the pet profile and the public QR page — the thing an owner can quote to any vet or service. v1 scope is a canonical ID + display only, not cross-platform interoperability with other pet-record systems.
* **Document sharing with a vet**: an owner can share specific documents with a vet, scoped to a specific upcoming booking — distinct from granting the vet standing `CaretakerAccess`. The vet can see only what was explicitly shared, only around that visit; the owner can revoke a share at any time.

3.1a Onboarding

* Signup asks for pet type (species) and breed as part of first-pet setup, immediately after account creation — not a disconnected "sign up, then separately remember to add a pet" flow
* Optional document upload is offered right after the first pet is created
* A new account with no owned pets and no caretaker access anywhere lands on first-pet setup automatically; a "Skip for now" escape hatch exists for someone who signed up purely to be invited as a caretaker on someone else's pet

3.2 Travel Documents

* Airline + country/city document checklists (what's typically required)
* "Last verified" timestamp on every rules page + disclaimer
* Confirmation step: owner marks each required document as fulfilled/uploaded
* Owner does the actual filling of forms — app does not auto-fill or submit anything
* Ruleset content (what's required, when it was last verified) is maintained and refreshed on the backend by ops — out of scope for the app's build sequence beyond rendering it

3.3 Vet Care

* Book vet consultations — virtual or in-person
* Vet profiles show credentials/experience (visible trust signal, not just asserted)
* Vet onboarding is manual for v1: no automated credential verification workflow. The "trust signal" shown on a vet profile reflects what was entered/checked during manual onboarding.
* Prescription capture: when a vet prescribes medication, a photo of the medication is attached to the record
* **Doctor booking portal — daily appointments**: the vet-facing interface is appointments-first — today's bookings up top with confirm/mark-done actions, upcoming bookings below, and a secondary "patients with standing access" list. A vet can only prescribe for a pet once the owner has granted standing access (unchanged from v1); booking a consultation itself needs no such grant.

3.4 Caretaker & Daily Care

* Multi-user access with roles: Owner, Caretaker, Secondary contact
* Meal time and medication time notifications
* Medication workflow:
  1. Vet prescribes the medication — creates a `MedicationReminder` with photo, dose, and schedule
  2. Owner reviews and confirms the prescription entry (`owner_confirmed_at`)
  3. Caretaker administers per the schedule and taps "confirmed given" (timestamped, logged) — a dismissed notification is never treated as confirmation
  4. Caretaker-facing reminders should not go live until the owner has confirmed the prescription — prevents dosing off an unreviewed entry
* Medication reminder shows the prescribed-medication photo alongside the dose
* Daily health tracking log (visible to owner in real time)
* Caretaker dashboard is scoped to their actual job: "Pets you care for" surfaces today's owner-confirmed medications with an inline confirm-given action, rather than requiring a caretaker to drill into each pet's full detail page to find what's due

3.5 Commerce

* Pet Shopping: browsable catalog (Dog Food, Cat Food, Treats, Accessories, Wellness) with "Add to order" creating an `Order` (type `shop`) — no live inventory or payment processing in v1, order goes to fulfillment as a request
* Pet Grooming: browsable service tiers (Nail Trim, Bath & Brush, Full Groom, Spa Package) with pricing, booking creates an `Order` (type `spa`)

3.5a Consultation Booking

* Vet Consultation (in-clinic): browse onboarded vets, book a time — creates a `VetBooking` (type `in_person`)
* Virtual Vet Consultation: same booking flow, `VetBooking` type `virtual` — positioned for follow-ups and non-urgent questions, with an explicit disclaimer to use in-clinic consultation for acute issues
* Both booking flows are open to any pet the owner/caretaker has access to and any onboarded vet — no prior `caretaker_access` grant required to book (that grant is separately required before a vet can prescribe medication, see §3.3)

3.5b Paw Community

* Lightweight social feed: any authenticated user can post text (optionally tagged to one of their pets) and read all posts
* No likes/comments/moderation tooling in v1 — deliberately minimal, revisit if usage warrants more

3.6 QR Emergency Tag

* Durable, chew/water-resistant physical collar tag with unique QR code
* Scan opens a public web page (no app needed) showing: pet name/photo, "lost — please contact," owner phone/contact, secondary contact, critical medical info (allergies/conditions)
* Secondary contact can be flagged as "vet may call" vs. "finder may call"
* Stays accessible even if the owner's subscription has lapsed

3.7 Account & Billing

* Per-pet subscription pricing
* If subscription lapses: data is retained, not deleted; full access restored on payment resumption
* Emergency QR page is exempt from the paywall regardless of subscription status

4. Data Model (Draft)

```
Owner
  - id, name, email, phone, secondary_contact_id

Pet
  - id, owner_id, name, species, breed, dob, photo_url, weight_log[],
    pet_code (Universal Pet ID, e.g. "PP-7F3K9Q", unique)

Document
  - id, pet_id, type (vaccination | vet_record | travel_doc | insurance),
    file_url, expiry_date, uploaded_at

DocumentShare
  - id, document_id, booking_id, vet_id, shared_by, created_at
    (scoped share for one booking — not standing CaretakerAccess)

TravelRuleset
  - id, airline_or_country, required_documents[], last_verified_at
    (content maintained/refreshed on the backend by ops)

MedicationReminder
  - id, pet_id, prescribed_by (vet_id), photo_url, dose, schedule,
    owner_confirmed_at,
    confirmations[] (caretaker_id, timestamp)

CaretakerAccess
  - id, pet_id, user_id, role (owner | caretaker | secondary_contact),
    permissions[]

QRTag
  - id, pet_id, unique_url, status (active | lost | replaced)

VetBooking
  - id, pet_id, vet_id, type (virtual | in_person), datetime, status

Order
  - id, pet_id, type (food | spa | shop), status, details

CommunityPost
  - id, author_id, pet_id (nullable), content, photo_url, created_at

```

5. Build Sequence (v1)

1. Auth + multi-pet profile
2. Document vault (upload, categorize, expiry reminders)
3. QR emergency tag + public scan page
4. Caretaker access + meal/med reminders with photo confirmation (owner-confirm → caretaker-administer flow)
5. Vet booking (start with simple calendar; manual vet onboarding for v1 — no credential-verification workflow)
6. Food/spa/shop ordering (likely gated on vendor partnerships for real fulfillment — v1 ships the request flow only)
7. Travel document checklists (rendering only — backend/ops owns ruleset verification and refresh)
8. Vet Consultation + Virtual Vet Consultation booking pages (added post-v1 launch, reusing existing `VetBooking` model)
9. Paw Community feed (added post-v1 launch — new `CommunityPost` table, intentionally minimal)
10. Role-routed dashboards, multi-step onboarding (pet type/breed/documents at signup), real document vault with vet-sharing, Universal Pet ID, vet daily-appointments view, full design-system pass — driven by a persona-based review (owner/caretaker/vet pain points, see §8)

6. Explicitly Out of Scope for v1

* Auto-filling or submitting official travel/customs paperwork
* Insurance claims processing
* Pet-sitter/walker marketplace (finding a new caretaker) — v1 assumes an existing caretaker
* Lost-pet GPS tracking (QR tag is static info only, not a tracker)
* Automated travel ruleset verification (handled by backend/ops, not the app)
* Automated vet credential verification (manual onboarding only in v1)
* Real e-commerce for Pet Shopping — no payment processing, live inventory, or shipping integration; "Add to order" creates a request record only
* Community moderation, likes/comments, or content ranking — Paw Community is a flat, unmoderated feed in v1

7. Resolved Decisions (formerly Open Questions)

* Travel ruleset verification/refresh: owned by backend/ops, not a client workflow.
* Vet vetting: manual onboarding only for v1; no automated credential checks.
* Public QR scan page vs. gated info: page shows pet info, medical basics, and owner + secondary contact with no gating (per Core Principles — emergency info is never paywalled or hidden behind "reveal more").
* Medication confirmation flow: vet prescribes → owner confirms prescription → caretaker administers and confirms each dose. See §3.4 and the `MedicationReminder` schema in §4.

8. Persona Review (Owner / Caretaker / Vet) — Round 2 Scope

Problems identified per persona, and the scope decision applied:

* Owner: signup and first-pet setup were disconnected; documents lived as one free-text field with no real vault or way to share specific records with a vet without giving them standing access; no single portable "this is my pet" identity. → Multi-step onboarding, real document vault + scoped vet-sharing, Universal Pet ID (§3.1, §3.1a).
* Caretaker: dashboard was the owner's UI with fewer buttons; "what's due today" was buried in the pet detail page. → Caretaker-specific dashboard section surfacing today's confirmed medications inline (§3.4).
* Vet: no appointments concept, no way to see a pet's shared history without a standing access grant, no accept/complete flow on a booking. → Appointments-first vet dashboard, scoped document sharing readable by the vet only via the booking it was shared for (§3.3).
* Cross-cutting: three fragmented interfaces vs. one role-routed app — resolved in favor of one app/one data model (see Core Principles) to keep the "single hub" premise intact rather than tripling the maintenance surface.
