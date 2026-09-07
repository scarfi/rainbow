# rainbow - Project plan

Planning baseline: 7 September 2026.

## Implementation status

The first offline application slice is implemented locally: SvelteKit, Dexie storage, equipment setups, session drafts, notes, standard-face selection (40, 60, 80, and 122 cm), 10-zone scoring, four-point Beursault scoring with honneurs/points/chapelets/noirs, unfinished-end persistence, a training journal, JSON export, and an application-shell service worker. English and French interfaces are included. Automated persistence and cache tests pass; actual device offline verification remains open. Cloud synchronization, authentication, media, and community features are not implemented.

The repository is connected to GitHub. Implementation is integrated through feature branches and pull requests. GitHub Actions validates changes and deploys main to GitHub Pages when Pages is enabled. The project owner requested offline development before creating a Supabase project.

## Product direction

Build a personal archery training application that becomes a community through shared training. The application must be valuable to an individual before they follow anyone or join a club.

Support desktop and mobile with a fast interface and a small initial download. Offline entry during a training session is a foundational requirement.

## Agreed priorities

1. **Individual training:** record practice, understand progress, and retain observations.
2. **Community:** discover archers, follow their training, and share progress.
3. **Club management:** connect members and organize club activity.
4. **Events and competitions:** discover opportunities to participate and compete.
5. **Equipment discovery and education:** explore products and learn about archery.

Tracking equipment already owned belongs in the first priority.

## Bow types and training formats

Initially support arc classique (recurve), arc à poulies (compound), and arc nu (barebow).

- A profile can include multiple bow types.
- Each equipment setup has a bow type.
- A training session references the setup used.
- Discipline, indoor/outdoor setting, distance, target, and scoring format are separate attributes.
- Compare scores only across compatible training formats.

## Phase 1: Personal training

Core journey: create a profile → add a setup → record training → add observations or media → review progress.

### Session logging

Support quick logs and detailed logs. A score is optional so technique-focused practice remains useful.

Candidate fields:

- Date, location, duration, and arrow count.
- Bow setup, discipline, distance, target, and scoring format.
- Scores by end, with individual arrow entry where applicable.
- Exercises, technique focus, and observations.
- Notes, photos, and video attachments.
- Draft/completed status and sharing preference.

Support editing, resuming unfinished sessions, and repeating a previous session. Decide exact fields and scoring formats during the first design iteration.

### Equipment

Keep individual equipment items separate from named setups. Store relevant specifications and tuning notes. Preserve the configuration associated with a historical session when a setup changes.

### History and progress

Provide a filterable training journal, training frequency, arrow volume, and score trends for comparable formats. Simple goals can cover practice frequency or a technique focus.

### Media scope

Notes are essential to the first prototype. Photos and basic video attachments belong in the training roadmap; exact first-release limits remain to be decided. Media uploads run separately from structured training synchronization. Advanced video editing and analysis are later work.

## Phase 2: Community

Use a shared training session as the basis of a post, avoiding duplicate entry.

- Public profiles with bow types, disciplines, and optional approximate location.
- Following, a feed of shared sessions, reactions, and comments.
- Discovery by bow type, discipline, and approximate area.
- Separate public reflections from private training notes.
- Contact preferences, blocking, reporting, and moderation as relevant features launch.

Rich messaging and personalized recommendations can follow the core sharing experience.

## Phase 3: Clubs

Club pages, membership, administrators, announcements, and shared training activity. Distinguish directory listings from clubs claimed by verified representatives.

Example supplied by the project owner: “la compagnie de tir à l’arc de Tracy Le-Mont.” This is a potential design/pilot context, not a confirmed partnership.

Maps can show clubs and venues. Archer map visibility must be optional and approximate.

## Phase 4: Events and competitions

List, calendar, and map discovery with date, location, discipline, and level filters. Begin with organizer information and external registration links. Payments, entry management, and official results are separate future scope.

## Phase 5: Discovery and education

Equipment exploration, reviews, learning resources, and discovery of archery disciplines. Define editorial and commercial scope later.

## Proposed architecture

| Layer               | Choice                      | Responsibility                                   |
| ------------------- | --------------------------- | ------------------------------------------------ |
| Interface           | Svelte + TypeScript         | Responsive, lightweight training interface       |
| Application         | SvelteKit                   | Routing and server endpoints                     |
| Offline app loading | PWA + service worker        | Cache the application shell and necessary assets |
| Local data          | IndexedDB + Dexie.js        | Sessions, drafts, equipment, and pending changes |
| Backend             | Supabase PostgreSQL         | Persistent synchronized and community data       |
| Accounts            | Supabase Auth               | Identity and access                              |
| Media               | Supabase Storage            | Uploaded photos and videos                       |
| Synchronization     | Explicit queue + server API | Push/pull changes, retries, and conflicts        |

These are planning choices; validate them in the offline prototype before expanding implementation. Dexie and Supabase do not automatically supply a complete synchronization system together.

A later Capacitor package could reuse the web interface for iOS/Android distribution, with additional native storage, lifecycle, and device testing work.

## Offline behavior

After initial online setup and caching, an archer must be able to open the application offline, select cached equipment, start or resume a session, and record training.

- Save changes locally immediately; never wait for network access to acknowledge local saving.
- Commit the data change and its pending synchronization operation together.
- Distinguish “Saved on this device” from “Synced to your account.”
- Retry synchronization when connected while the app is open or reopened.
- Use stable identifiers and idempotent operations to prevent duplicates.
- Handle deletions and concurrent edits explicitly; do not silently discard conflicting training data.
- Preserve unsynchronized changes through authentication expiry and request sign-in before upload when needed.
- Isolate local data by account and define safe sign-out behavior for pending changes.
- Keep media transfer failures independent from score and note synchronization.

Background synchronization while the app is closed is optional because browser support and execution vary. Browser storage has quotas and may be cleared or evicted. Request persistent storage where supported, report storage failures, and make pending uploads visible. Unsynchronized data exists only on that device.

## Performance approach

Provisional budget: under 300 KB of compressed JavaScript for the core training screen. Measure this in the prototype; it is a target, not an established result or total installed-size promise.

- Load maps, complex charts, and video features only when needed.
- Use system fonts and a small icon set.
- Use thumbnails and on-demand media loading.
- Cache personal data selectively.
- Define separate limits for offline media storage.
- Test on representative mobile devices, including iOS and Android.

## First implementation milestone: Offline training proof

Build a minimal session editor with a local database and a synchronization endpoint before investing in community features.

Acceptance criteria:

1. Initial online setup makes the training screen and an equipment setup available offline.
2. A session can be created and edited in airplane mode, including scores and notes.
3. Closing and reopening the app preserves the draft and its entries.
4. Reconnecting synchronizes the session and shows a confirmed status.
5. Interrupted uploads and repeated retries do not create duplicates.
6. A server-acknowledged session can be retrieved on a second device.
7. Concurrent edits produce explicit conflict handling without silent data loss.
8. Authentication expiry and storage failures preserve pending work where storage remains available and show an actionable status.
9. Application updates do not discard existing local drafts.
10. The initial JavaScript payload is measured against the provisional budget.

## Next steps

1. Review the first offline implementation and run the real-device checklist.
2. Define the first session form and scoring formats.
3. Scaffold the application and local database.
4. Implement and validate the offline milestone.
5. Expand personal training, then introduce community sharing.

## Open decisions

- English and French are required initially and implemented through typed translation catalogs. Additional languages remain future scope.
- Exact session fields and scoring formats for the first release.
- Photo/video limits and first-release media support.
- Conflict-resolution interaction across devices.
- Hosting, deployment, operating budget, and backup policy.
- Whether app-store distribution is needed at launch.

## Technical references

- [Svelte](https://svelte.dev/docs/svelte/overview)
- [Dexie](https://dexie.org/docs/)
- [Supabase](https://supabase.com/docs)
- [PWA offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [Browser storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Capacitor](https://capacitorjs.com/docs)
