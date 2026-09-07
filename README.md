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
- Switch between English and French. The preference stays on the device.
- Export a JSON backup, including the currently open editor.
- Load the production application offline after its initial cache is ready.

Cloud accounts, synchronization, media attachments, and community features are not implemented yet. Data belongs to the current browser profile and origin. Backup export is implemented; a backup import interface is not yet available. No real training data is preloaded.

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

Browser storage is subject to quotas, clearing, and eviction. The app requests persistent storage when a session is started, but the browser may decline. Export backups until cloud synchronization is available.

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

The deployed site uses a different browser origin from localhost. Local training does not automatically transfer to it; export a backup before moving away from your local journal. The application currently has no account synchronization or backup import interface.

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
