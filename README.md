# rainbow

A lightweight archery training journal for desktop and mobile, with English and French interfaces and local offline storage.

## Current implementation

- Create equipment setups for recurve, compound, and barebow.
- Create, resume, edit, complete, and reopen training sessions.
- Record dates, locations, distances, targets, duration, arrow counts, and notes.
- Choose a target face from a dropdown: 40, 60, 80, or 122 cm standard faces, or four-point Beursault.
- Score standard 10-zone ends with X and misses, or individual Beursault arrows with 1, 2, 3, 4, and misses.
- View Beursault honneurs, points, chapelets, and noirs in both the editor and journal.
- Start, stop, and resume a duration timer, or enter minutes manually.
- Open a full-viewport shooting view with automatic arrow advance and undo.
- Select free practice, Beursault 10/20 haltes, or 36-arrow progression presets.
- Save unfinished ends and drafts automatically to IndexedDB.
- Preserve the equipment configuration used in each session.
- Search the journal and review completed-session totals.
- View a yearly arrow activity calendar and select a day to filter the journal.
- Switch between English and French. French is the default; a saved language preference takes priority and stays on the device.
- Export individual sessions, selected days, and filtered journal results as CSV or JSON, including current editor changes.
- Access email/password sign-in, registration, and password recovery when Supabase is configured.
- Export a full JSON backup from Account, including the currently open editor.
- Load the production application offline after its initial cache is ready.

The account interface and Supabase authentication integration are implemented. The local project connection is configured and its public authentication settings are verified. Email delivery, redirect settings, and end-to-end login still need verification. Account synchronization is implemented. The owner confirmed the production database migration succeeded on 2026-09-09; real-device synchronization verification remains open. Media attachments and community features are not implemented. Guest data belongs to this browser; signed-in journals are isolated by project and account. Backup export is implemented; a backup import interface is not yet available. No real training data is preloaded.

## Run locally

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

For offline behavior, use the production build. The development server does not install the production service worker.

```sh
npm run build
npm run preview
```

Open the URL printed by the command. Wait for “Offline ready” before disconnecting. Keep using the same origin and port: changing them creates a separate browser storage area. Localhost works for desktop development; a phone visiting another device's HTTP address needs HTTPS for service-worker support.

Browser storage is subject to quotas, clearing, and eviction. The app requests persistent storage when a session is started, but the browser may decline. Export backups for an additional copy, especially when changes are waiting to sync.

## Verification

```sh
npm run check
npm test
npm run build
npm run size
npm run format:check
```

Tests exercise IndexedDB behavior using fake-indexeddb and service-worker logic using an isolated harness. They do not replace airplane-mode, installability, and lifecycle tests on actual mobile devices. See [the manual checklist](docs/OFFLINE_TESTING.md).

The size check totals all shipped JavaScript after gzip compression and enforces a 300 KiB ceiling. This is stricter than counting only the initial training route, but excludes HTML, CSS, images, and user data.

## Code organization

| Location                  | Responsibility                                                          |
| ------------------------- | ----------------------------------------------------------------------- |
| `src/routes/+page.svelte` | Application state, navigation, and autosave orchestration               |
| `src/lib/components/`     | Session fields, journal, and scoring controls                           |
| `src/lib/model.ts`        | Training types, validation, dates, and score calculations               |
| `src/lib/db.ts`           | IndexedDB schema, migrations, transactions, revision checks, and export |
| `src/lib/i18n/`           | Typed English and French interface catalogs                             |
| `src/service-worker.ts`   | Versioned application-shell caching                                     |
| `tests/`                  | Persistence, conflict, scoring, translation, and cache behavior         |
| `scripts/check-size.mjs`  | Production JavaScript size budget                                       |

Interface labels are translated; stored bow values and status identifiers are stable. User-authored names and notes are not translated. Equipment is copied into a session so future setup changes do not rewrite training history.

Read [AGENTS.md](AGENTS.md) before contributing and [PROJECT_PLAN.md](PROJECT_PLAN.md) for the product roadmap.

## Beursault scoring

The four-point Beursault face uses these inclusive counts:

| Arrow    | Honneurs | Points | Chapelets | Noirs |
| -------- | -------- | ------ | --------- | ----- |
| Miss (M) | 0        | 0      | 0         | 0     |
| 1        | 1        | 1      | 0         | 0     |
| 2        | 1        | 2      | 0         | 0     |
| 3        | 1        | 3      | 1         | 0     |
| 4        | 1        | 4      | 1         | 1     |

Each tap in shooting mode records one arrow immediately. Free training has no arrow limit; the Beursault presets stop score entry at 20 or 40 arrows. The three-point Bouquet Provincial face is a different format and is not included.

Target face selection is locked while scores exist, including an unfinished entry, to avoid reinterpreting training history. Previous free-text target descriptions remain intact as saved dropdown values. The IndexedDB migration assigns existing sessions to their original ten-zone scoring format, even if a custom target description contained the word Beursault. Backup schema version 3 includes the scoring format, round, progression level, and timer state.

Scoring reference: [FFTA sporting rules, four-zone Beursault card, section C.5](https://www.ffta.fr/sites/default/files/2023-12/R%C3%A9glements%20Sportifs%20et%20Arbitrage_Version%20D%C3%A9cembre%202023%20Consolid%C3%A9e.pdf). Standard face sizes: [FFTA equipment summary](https://www.ffta.fr/sites/default/files/2025-05/Extrait%20RF%20et%20MPF%20pour%20Site%20internet.pdf).

## GitHub Pages

The `Check and deploy` workflow validates branches and pull requests. Pushes to main deploy the `build` directory to GitHub Pages through its protected `github-pages` environment. Enable Pages with GitHub Actions as the source in repository settings. Private-repository Pages requires a compatible GitHub plan.

The project URL is `https://scarfi.github.io/rainbow/`. CI builds with `BASE_PATH=/rainbow`; local development defaults to `/`. To reproduce the Pages build locally:

```sh
BASE_PATH=/rainbow npm run build
BASE_PATH=/rainbow npm run preview
```

Open `/rainbow/` on the preview origin. Icons, the manifest, navigation, and the service worker honor the deployment path. The installed app stays within that path. Service-worker caches are isolated by deployment path.

The deployed site uses a different browser origin from localhost. Guest training does not automatically transfer. Signed-in training can sync between origins and devices using the same Supabase account once the sync migration and app are deployed. A backup import interface is not yet available.

All future changes must start on a dedicated Git branch and reach main through a pull request. See AGENTS.md.

## Shooting experience

Start or open a draft, choose a session format, then use Open shooting mode. The native dialog fills the viewport without requiring browser fullscreen permissions. Each score tap advances one arrow. Beursault stores individual arrows; standard and progression scoring groups six arrows into each end. Undo works across end boundaries. Scores and partial ends share the existing autosave and conflict protection.

The timer records accumulated milliseconds and an optional running-start timestamp. Screen locking, backgrounding, closing, and reopening do not pause it. Stop pauses the clock; Start resumes it. Finishing a session stops the timer. Manual minutes are available while the timer is stopped and replace its accumulated duration. The journal's minute total rounds the timer duration to the nearest minute.

Beursault 10 haltes contains 20 scored arrows; 20 haltes contains 40. Warm-up arrows can be tracked in the total arrow count but should not be entered into the preset scorecard. Full rounds cap further score entry; undo and correction remain available. A session may finish early and is then labelled incomplete.

Progression uses six ends of six arrows. White, Black, Blue, Red, and Yellow correspond to 10, 15, 20, 25, and 30 metres on an 80 cm face, with a 280-point goal. Recurve Bronze is 40 m on 80 cm; Silver and Gold are 60 and 70 m on 122 cm, all at 280 points. Compound Bronze is 40 m/310 points, Silver 50 m/310 points, and Gold 50 m/330 points on an 80 cm face. This is why the selected progression level, as well as distance, is stored. Barebow uses the recurve settings as an explicitly labelled training benchmark. Without a setup, the reference is recurve.

A progression target is achieved only once all 36 arrows are recorded and the threshold is met. This reports a training result, not an official award. Select the equipment before scoring; its bow type determines the progression reference. Distance and face are set by progression presets and cannot silently change after scoring begins.

References: [FFTA progression guidance](https://www.ffta.fr/node/1197), [progression tables](https://regles-tiralarc.fr/bin/view/Livre%20des%20r%C3%A8glements/I%20R%C3%A8glement%20g%C3%A9n%C3%A9raux/F%20Les%20distinctions/F.2%20Pour%20la%20FFTA/), and [FFTA Beursault format](https://www.ffta.fr/index.php/pratiquer/disciplines-officielles-et-nouvelles-pratiques/le-tir-beursault).

Implementation responsibilities: `src/lib/training.ts` contains timers, presets, scoring advancement, and validation. `TrainingTimer`, `RoundSettings`, `RoundSummary`, and `ShootingView` are focused UI components. Database version 4 migrates previous sessions to free practice with stopped timers and preserves their manual durations and scores.

## Arrow activity calendar

The calendar groups saved sessions by their recorded training date, including drafts and manually recorded warm-up arrows. It uses the total arrow count rather than adding scored arrows again. Its annual total is therefore distinct from the completed-only statistics above it. Empty dates remain selectable, and a zero-arrow session is marked with a border.

Intensity buckets are fixed at 0, 1-29, 30-59, 60-99, and 100+ arrows. Select a year or use the date picker to browse history. Choosing a day clears any text search and shows every session on that date; text search can then narrow those results. Show all sessions clears the day filter. Opening a new session also clears the filter. Calendar navigation does not discard an open editor.

The calendar uses native buttons with arrow-key navigation and a date-picker alternative on touch screens. Date calculations preserve the entered calendar date across time zones and include leap days. No chart library or database migration is required. Aggregation and calendar geometry live in `src/lib/activity.ts`.

## Contextual exports

Open a session and choose Export this session for CSV or JSON. In the journal, Export this day includes every session on the selected date, regardless of the search text. Export matching sessions applies both the selected day and the current search. The current editor replaces its saved version before export filtering, so unfinished scores and unsaved edits are included without duplication. CSV includes scores, Beursault totals, duration at export time, equipment name, and notes. JSON preserves every session field, including the equipment snapshot and running timer state. CSV headers and stored enum values are stable English identifiers; exported notes retain their original language. Spreadsheet formulas in user text are neutralized.

Full backup remains under Account > Local backup and in save-error recovery. Exports contain personal data and should be shared deliberately. Downloading does not save pending edits or acknowledge a database write. Import is still a separate feature.

## Supabase account setup

Authentication is optional for the local training journal. It uses email/password sign-in, signup confirmation, password recovery, persisted sessions, and sign-out for the current browser. The SDK loads separately from the training modules. Signing in opens a separate account journal. Its training and equipment are saved locally first, then synchronized. Signing out hides that journal and returns to a separate guest journal. Pending changes stay in the account cache for its next sign-in. The pre-sync journal is not imported, as requested by the project owner.

1. Copy `.env.example` to ignored `.env.local` and supply `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Only a modern `sb_publishable_` key is accepted. Never provide a secret, service-role key, database password, or management token. Restart the dev server after changing environment values.
2. For GitHub Pages, set repository Actions variables with those same names. These are browser-public configuration values, injected at build time. A new build is required after changing them. Missing or invalid configuration disables account access while training remains available.
3. In Supabase Auth, enable Email/password and retain email confirmation. Set Site URL to `https://scarfi.github.io/rainbow/`. Allow that exact redirect URL plus `http://127.0.0.1:5173/` for development. If testing a different preview origin or the Pages base path locally, add that exact callback too. Signup and recovery return to the existing app root, so no server callback route is required on Pages.
4. Verify email delivery before inviting users. Supabase's default SMTP service is restricted to authorized team addresses and is rate limited; public signup needs a suitable SMTP provider. Do not disable confirmation as a workaround. Ask the project owner before enabling paid services or changing anything that could increase costs.
5. Complete the account checklist in `docs/OFFLINE_TESTING.md` using a test account. The project accepts the supplied publishable key; its public settings report email authentication and signup enabled, with email confirmation required. Live email delivery, redirect configuration, and real-device behavior remain unverified.

Synchronization uses one row-level-secured table and one version-checked RPC from the migration below. No storage buckets, paid services, or billing settings are changed. Passwords are transient form values; Supabase manages tokens in browser auth storage. The service worker only caches the static app shell and never caches authentication API responses.

Implementation: `src/lib/exports.ts` handles selection and serialization. `src/lib/auth/` handles client configuration, provider actions, and translated errors. `AccountPanel.svelte` manages account UI and session/recovery lifecycle.

References: [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp).

## Account synchronization

Apply `supabase/migrations/202609080001_account_sync.sql` once before deploying the sync app. The migration is transaction-wrapped and does not modify existing training or auth users. The table allows authenticated users to read only their own rows. Direct writes are revoked; the RPC derives ownership from the caller and checks the expected cloud version. Test it with `npm test`, which runs the actual SQL against embedded PostgreSQL (PGlite) using two simulated account identities and anonymous requests.

Sessions and equipment saves atomically update their IndexedDB record and durable queue. Each network request has a persisted mutation ID and a cloud-version precondition. Retrying a lost response does not create duplicates. Edits made during uploads remain queued. Simultaneous device edits stop at a visible conflict; Keep both versions preserves the local record under a new ID and restores the remote version at the original ID. Session copies are labelled. Equipment references inside old sessions remain historical snapshots.

Synchronization runs after saves (one-second debounce), on account opening, reconnection, return to the tab, and Sync now. Failed requests retry with backoff while the tab is visible. There is no permanent realtime subscription or closed-app background sync. Pulls read the account journal in pages of 100; no deletion interface is implemented, so missing cloud rows are not treated as deletes. This initial approach favors correctness for small personal journals; incremental synchronization should replace full pulls before large-scale usage.

The account cache is namespaced by project URL and user ID. Every API request captures a token for the expected user; account changes stop the old sync worker and hide the previous journal while local saves finish. Account data is hidden by the app after sign-out but is not encrypted against someone with access to the browser profile or developer tools. Browser eviction can still remove pending changes, so the UI distinguishes local saves from server acknowledgements.

The legacy `rainbow-training` database is left untouched and excluded from synchronization. A fresh guest journal is also separate from every account. No automatic import or deletion of legacy data is performed.
