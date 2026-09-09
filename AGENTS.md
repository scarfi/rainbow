# Working on rainbow

These rules apply to all work in this repository, by humans and agents.

## Product priorities

1. Personal archery training, including offline session entry.
2. Community and visibility into other archers' training.
3. Club management.
4. Events and competitions.
5. Equipment discovery and education.

Read README.md and PROJECT_PLAN.md before expanding scope. Preserve the agreed Svelte, TypeScript, and Dexie architecture unless a concrete requirement warrants changing it.

## Readable, maintainable code

- Organize code so humans and agents can understand it and locate responsibilities quickly.
- Consider the next developer who must change, debug, or extend the feature.
- Prefer descriptive names, focused modules, small functions, and explicit types at boundaries.
- Keep persistence and domain rules outside interface components.
- Extract reusable or independently complex interface sections into focused components.
- Format source consistently. Do not commit minified application source or dense, compressed code.
- Explain non-obvious decisions and constraints in comments. Avoid comments that merely repeat the code.
- Document setup, behavior, limitations, and important architectural decisions as they change.
- Avoid speculative abstractions. Introduce structure when it clarifies an actual responsibility.

## Lightweight implementation

- When possible, choose lightweight solutions over visual sophistication.
- Prefer platform features, semantic HTML, system fonts, and simple CSS.
- Add dependencies only for a concrete benefit; consider their maintenance and shipped size.
- Defer maps, video, and other heavy features until needed. Load them on demand.
- Maintain the provisional budget of 300 KiB compressed JavaScript for the core training experience.
- Preserve accessibility, touch usability, and responsive behavior when simplifying visuals.

## Writing

- Never use an em dash (Unicode U+2014) in code comments, documentation, interface text, commit messages, or communication.
- Use a period, comma, colon, parentheses, or ordinary hyphen as appropriate.
- Use plain, specific language. Do not imply that a planned feature is implemented.

## Offline data integrity

- Saving training must not depend on the network.
- Acknowledge a local save only after the database write succeeds.
- Keep drafts available when saving fails and provide recovery feedback.
- Preserve equipment details associated with historical sessions.
- Detect conflicting writes instead of silently overwriting data.
- Do not claim cloud synchronization before it is implemented and verified.
- Do not discard local data during application or schema updates.
- Keep private data and secrets out of source control, logs, and service-worker caches.

## Secrets and credentials

- Never commit the Connectly client key, even though the vendor describes it as public. Configure it through an ignored environment file.

- Never commit private keys, passwords, API secrets, access tokens, service-role keys, or other credentials to Git, including in code, configuration, fixtures, documentation, or generated files.
- Keep secrets in ignored local environment files or an appropriate secret manager. Use placeholders in committed examples.
- Review staged changes for secrets before every commit. Ensure files containing credentials are ignored before staging them.
- If a secret is accidentally committed, stop sharing it, notify the owner, and arrange revocation or rotation. Deleting it in a later commit does not remove it from Git history.

## Supabase changes

- Provide SQL and concise dashboard instructions for the owner to run. Do not automate the Supabase dashboard unless explicitly requested.

- Ask the project owner before any Supabase configuration or resource change that could increase costs. Do not upgrade plans or enable paid services without approval.
- Keep guest, legacy, and account journals isolated. Do not import guest or legacy data into an account without explicit user authorization. The owner approved starting fresh for the initial synchronization release.

## Verification and delivery

- Run npm run check, npm test, npm run build, npm run size, and npm run format:check for relevant implementation changes.
- Test meaningful behavior, especially persistence, recovery, validation, and conflicts.
- Test browser behavior when requested. Clearly distinguish automated model tests from real-device verification.
- Keep package-lock.json current with dependency changes.
- Report what works, what was verified, and what remains incomplete.
- Do not publish or push changes unless authorized by the task.

## Translation

- Support English and French from the first release.
- Keep interface text in src/lib/i18n translation catalogs, including errors and accessibility labels.
- Keep translated labels separate from stable stored values and identifiers.
- Use the selected locale for dates and numbers. Persist the user's language preference.
- Add matching keys to both catalogs and verify their parity.
- Do not translate user-authored notes or equipment names automatically.

## Git branches

- Use a dedicated Git branch for all work from now forward. Do not implement or commit changes directly on main.
- Create a clearly named feature, fix, or documentation branch before editing.
- Keep changes focused, run the required checks, and use a pull request to integrate the branch into main.
- Merging approved or task-authorized work into main is allowed. Do not bypass repository protections or force-push shared history.
