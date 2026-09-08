<script lang="ts">
  import AccountPanel from '$lib/components/AccountPanel.svelte';
  import SessionExport from '$lib/components/SessionExport.svelte';
  import {
    downloadSessions,
    exportSelection,
    type ExportFormat,
  } from '$lib/exports';
  import ActivityCalendar from '$lib/components/ActivityCalendar.svelte';
  import { sessionsOnDay } from '$lib/activity';
  import { base } from '$app/paths';
  import {
    translate,
    isMessage,
    type MessageKey,
    type Locale,
  } from '$lib/i18n';
  import SessionFields from '$lib/components/SessionFields.svelte';
  import TrainingTimer from '$lib/components/TrainingTimer.svelte';
  import RoundSettings from '$lib/components/RoundSettings.svelte';
  import RoundSummary from '$lib/components/RoundSummary.svelte';
  import ShootingView from '$lib/components/ShootingView.svelte';
  import {
    recordArrow,
    undoArrow,
    startTimer,
    stopTimer,
    setManualDuration,
    configureRound,
  } from '$lib/training';
  import TrainingJournal from '$lib/components/TrainingJournal.svelte';
  import { onMount } from 'svelte';
  import { liveQuery } from 'dexie';
  import { db } from '$lib/db';
  import {
    bowTypes,
    newSession,
    type Session,
    type Setup,
    type BowType,
  } from '$lib/model';
  let locale = $state<Locale>('fr');
  const t = (key: MessageKey) => translate(locale, key);
  function changeLanguage(value: string) {
    locale = value === 'fr' ? 'fr' : 'en';
    document.documentElement.lang = locale;
    try {
      localStorage.setItem('rainbow-language', locale);
    } catch {
      /* Language still works for this visit. */
    }
  }
  let shooting = $state(false);
  let accountOpen = $state(false);
  let view = $state<'training' | 'equipment'>('training');
  let sessions = $state<Session[]>([]),
    setups = $state<Setup[]>([]);
  let draft = $state<Session | null>(null);
  let loaded = $state(false),
    online = $state(true),
    offlineReady = $state(false);
  let dirty = $state(false),
    saving = $state(false),
    error = $state(''),
    saveLabel = $state('');
  let generation = 0;
  let inFlight: Promise<boolean> | null = null;
  let currentEnd = $state<string[]>([]);
  let setupName = $state(''),
    setupBow = $state<BowType>('Recurve'),
    setupNotes = $state('');
  let query = $state('');
  let selectedDay = $state<string | null>(null);
  const daySessions = $derived(sessionsOnDay(sessions, selectedDay));
  function selectDay(date: string | null) {
    selectedDay = date;
    query = '';
  }
  const filtered = $derived(
    daySessions.filter((s) =>
      `${s.title} ${s.setup?.name ?? ''} ${s.setup?.bowType ?? ''} ${s.notes}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
  );
  const completed = $derived(sessions.filter((s) => s.status === 'completed'));
  const arrowCount = $derived(completed.reduce((sum, s) => sum + s.arrows, 0));
  const minutes = $derived(completed.reduce((sum, s) => sum + s.duration, 0));
  function message(e: unknown) {
    return e instanceof Error && isMessage(e.message)
      ? e.message
      : 'Could not save. Keep this page open and export your data.';
  }
  function download(value: unknown, filename: string) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function exportData() {
    try {
      const backup = await db.backup();
      download(
        {
          ...backup,
          unsavedEditor: draft ? JSON.parse(JSON.stringify(draft)) : null,
          pendingEnd: [...currentEnd],
        },
        `rainbow-backup-${new Date().toISOString().slice(0, 10)}.json`,
      );
    } catch (e) {
      error = message(e);
      if (draft)
        download(
          { unsavedEditor: draft, pendingEnd: currentEnd },
          'rainbow-recovered-draft.json',
        );
    }
  }
  function exportJournal(format: ExportFormat, wholeDay = false) {
    const selection = exportSelection(
      sessions,
      draft,
      selectedDay,
      wholeDay ? '' : query,
    );
    downloadSessions(selection, format, `rainbow-${selectedDay ?? 'journal'}`);
  }
  function exportSession(format: ExportFormat) {
    if (draft)
      downloadSessions([draft], format, `rainbow-session-${draft.date}`);
  }
  function changed() {
    dirty = true;
    generation++;
    saveLabel = 'Saving…';
    // Run after Svelte has applied the current input binding.
    queueMicrotask(() => void flush());
  }
  async function flush(): Promise<boolean> {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      saving = true;
      try {
        while (dirty && draft) {
          const version = generation;
          const saved = await db.saveSession(draft);
          draft.revision = saved.revision;
          draft.updatedAt = saved.updatedAt;
          if (version === generation) dirty = false;
        }
        error = '';
        saveLabel = 'Saved on this device';
        return true;
      } catch (e) {
        error = message(e);
        saveLabel = 'Not saved';
        return false;
      } finally {
        saving = false;
      }
    })();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }
  async function start() {
    if (!(await flush())) return;
    draft = newSession();
    currentEnd = [];
    query = '';
    selectedDay = null;
    view = 'training';
    changed();
    await flush();
    void navigator.storage?.persist?.().catch(() => false);
  }
  async function openSession(s: Session) {
    if (!(await flush())) return;
    const saved = await db.sessions.get(s.id);
    if (!saved) return;
    draft = JSON.parse(JSON.stringify(saved));
    currentEnd = [...(saved.pendingEnd ?? [])];
    saveLabel = 'Saved on this device';
    view = 'training';
  }
  function selectSetup(id: string) {
    if (!draft) return;
    draft.setup = JSON.parse(
      JSON.stringify(setups.find((s) => s.id === id) ?? null),
    );
    if (draft.round === 'progression') configureRound(draft, 'progression');
    changed();
  }
  function setPendingEnd(values: string[]) {
    currentEnd = values;
    if (draft) {
      draft.pendingEnd = [...values];
      changed();
    }
  }
  function addEnd() {
    if (!draft || !currentEnd.length) return;
    draft.ends = [...draft.ends, [...currentEnd]];
    draft.arrows = Math.max(draft.arrows, draft.ends.flat().length);
    setPendingEnd([]);
  }
  async function finish() {
    if (!draft) return;
    if (currentEnd.length && draft.round !== 'progression') addEnd();
    stopTimer(draft);
    draft.status = 'completed';
    changed();
    if (await flush()) shooting = false;
  }
  function updateTraining(action: (session: Session) => void) {
    if (!draft) return;
    try {
      action(draft);
      currentEnd = [...draft.pendingEnd];
      changed();
    } catch (cause) {
      error = message(cause);
    }
  }
  async function openShooting() {
    if (await flush()) shooting = true;
  }
  async function closeShooting() {
    await flush();
    shooting = false;
  }
  async function addSetup(event: SubmitEvent) {
    event.preventDefault();
    try {
      await db.saveSetup({
        id: crypto.randomUUID(),
        name: setupName,
        bowType: setupBow,
        notes: setupNotes,
        updatedAt: new Date().toISOString(),
        revision: 0,
      });
      setupName = '';
      setupNotes = '';
      error = '';
    } catch (e) {
      error = message(e);
    }
  }
  async function closeEditor() {
    if (await flush()) draft = null;
  }
  function dateLabel(value: string) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(
      locale === 'fr' ? 'fr-FR' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric' },
    );
  }
  onMount(() => {
    try {
      const saved = localStorage.getItem('rainbow-language');
      changeLanguage(saved === 'en' ? 'en' : 'fr');
    } catch {
      changeLanguage('fr');
    }
    online = navigator.onLine;
    const update = () => {
      online = navigator.onLine;
    };
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('beforeunload', leave);
    const subscription = liveQuery(async () => ({
      sessions: await db.sessions.orderBy('date').reverse().toArray(),
      setups: await db.setups.orderBy('name').toArray(),
    })).subscribe({
      next: (data) => {
        sessions = data.sessions;
        setups = data.setups;
        loaded = true;
      },
      error: (e) => {
        error = message(e);
      },
    });
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker.ready.then(() => {
        offlineReady = true;
      });
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('beforeunload', leave);
    };
  });
</script>

<svelte:head
  ><title
    >rainbow · {t(view === 'training' ? 'My training' : 'Equipment')}</title
  ><meta
    name="description"
    content={t(
      'Your personal archery training journal. Record sessions, equipment, scores, and notes, even at an offline range.',
    )}
  /></svelte:head
>

<div class="app-shell">
  <aside class="sidebar">
    <a class="brand" href={`${base}/`} aria-label={t('rainbow home')}
      ><img
        src={`${base}/icon.svg`}
        width="34"
        height="34"
        alt=""
      />rainbow<span class="brand-dot">.</span></a
    >
    <div class="nav-caption">{t('YOUR PRACTICE')}</div>
    <nav aria-label={t('Main navigation')}>
      <button
        class:active={view === 'training'}
        onclick={() => (view = 'training')}
        ><span aria-hidden="true">◎</span> {t('My training')}</button
      >
      <button
        class:active={view === 'equipment'}
        onclick={() => (view = 'equipment')}
        ><span aria-hidden="true">↗</span> {t('Equipment')}</button
      >
    </nav>
  </aside>
  <main>
    <header class="topbar">
      <label class="language-picker"
        ><span class="sr-only">{t('Language')}</span><select
          aria-label={t('Language')}
          value={locale}
          onchange={(e) => changeLanguage(e.currentTarget.value)}
          ><option value="en">English</option><option value="fr"
            >Français</option
          ></select
        ></label
      >
      <div class="connection">
        <span class:offline={!online} class="status-dot"></span>{t(
          online ? 'Online' : 'Offline',
        )} <span class="divider">/</span>
        <span
          >{t(
            offlineReady ? 'Offline ready' : 'Preparing offline access',
          )}</span
        >
      </div>
      <button
        class="text-button"
        aria-expanded={accountOpen}
        aria-controls="account-panel"
        onclick={() => (accountOpen = !accountOpen)}>{t('Account')}</button
      >
    </header>
    <AccountPanel
      {t}
      {online}
      {loaded}
      bind:open={accountOpen}
      onbackup={exportData}
    />
    {#if error}<div class="error" role="alert">
        <strong>{t('Your work needs attention.')}</strong>
        {t(error as MessageKey)}
        <button onclick={exportData}>{t('Export a backup')}</button
        >{#if dirty}<button onclick={() => void flush()}
            >{t('Retry save')}</button
          >{/if}
      </div>{/if}
    {#if view === 'training'}
      <section class="page-heading">
        <div>
          <p class="eyebrow">{t('MAKE EVERY ARROW COUNT')}</p>
          <h1>{t('My training')}</h1>
          <p>{t('A little practice. A clearer picture of your progress.')}</p>
        </div>
        <button class="primary" onclick={start} disabled={!loaded || saving}
          >{t('＋ Log a session')}</button
        >
      </section>
      <div class="stats">
        <div>
          <span>{t('Completed sessions')}</span><strong
            >{completed.length}<small>{t('sessions')}</small></strong
          >
        </div>
        <div>
          <span>{t('Arrows shot')}</span><strong
            >{arrowCount.toLocaleString(locale)}<small>{t('arrows')}</small
            ></strong
          >
        </div>
        <div>
          <span>{t('Time at the range')}</span><strong
            >{Math.floor(minutes / 60)}<small>{t('h')}</small>
            {minutes % 60}<small>{t('min')}</small></strong
          >
        </div>
      </div>
      <ActivityCalendar
        {sessions}
        {selectedDay}
        {locale}
        {t}
        onselect={selectDay}
      />
      <div class:has-editor={draft !== null} class="training-grid">
        <TrainingJournal
          sessions={daySessions}
          {selectedDay}
          {filtered}
          {loaded}
          bind:query
          selectedId={draft?.id}
          {t}
          {dateLabel}
          onopen={openSession}
          onstart={start}
          onexport={exportJournal}
        />
        {#if draft}
          <section class="editor" aria-label={t('Session editor')}>
            <div class="editor-heading">
              <div>
                <p class="eyebrow">
                  {t(
                    draft.status === 'draft'
                      ? 'SESSION IN PROGRESS'
                      : 'SESSION DETAILS',
                  )}
                </p>
                <h2>{draft.title || t('New practice')}</h2>
              </div>
              <button
                class="icon-button"
                aria-label={t('Close session')}
                onclick={closeEditor}>✕</button
              >
            </div>
            <div class="save-status" aria-live="polite">
              <span class="status-dot" class:offline={dirty}></span>{saveLabel
                ? t(saveLabel as MessageKey)
                : t('Ready to save')}
            </div>
            <SessionExport
              label="Export this session"
              {t}
              onexport={exportSession}
            />
            <RoundSettings bind:session={draft} {t} onchange={changed} />
            <TrainingTimer
              session={draft}
              {t}
              onstart={() => updateTraining(startTimer)}
              onstop={() => updateTraining(stopTimer)}
              onmanual={(minutes) =>
                updateTraining((session) =>
                  setManualDuration(session, minutes),
                )}
            />
            <SessionFields
              bind:session={draft}
              {setups}
              {t}
              onchange={changed}
              onsetup={selectSetup}
            />
            <RoundSummary session={draft} {t} />
            <button class="primary shooting-launch" onclick={openShooting}
              >{t(
                draft.status === 'draft'
                  ? 'Open shooting mode'
                  : 'View scorecard',
              )}</button
            >
            <div class="editor-actions">
              <span>{t('Only visible to you')}</span
              >{#if draft.status === 'draft'}<button
                  class="primary"
                  disabled={saving}
                  onclick={finish}>{t('Finish session ✓')}</button
                >{:else}<button
                  class="secondary"
                  onclick={() => {
                    if (draft) {
                      draft.status = 'draft';
                      changed();
                    }
                  }}>{t('Reopen as draft')}</button
                >{/if}
            </div>
          </section>
        {:else}<aside class="practice-card">
            <div class="rainbow-stripe" aria-hidden="true"></div>
            <p class="eyebrow">{t('YOUR OWN PACE')}</p>
            <h2>{t('Build a practice')}<br />{t('you can look back on.')}</h2>
            <p>
              {t(
                'Keep the details that matter: your bow, your arrows, and what you learned.',
              )}
            </p>
            <div class="practice-detail">
              <span>01</span>
              <div>
                <strong>{t('Set up your bow')}</strong>
                <p>{t('Recurve, compound, or barebow.')}</p>
              </div>
            </div>
            <div class="practice-detail">
              <span>02</span>
              <div>
                <strong>{t('Make a note of it')}</strong>
                <p>{t('Technique work counts, too.')}</p>
              </div>
            </div>
            <button class="secondary" onclick={() => (view = 'equipment')}
              >{t('Manage equipment ↗')}</button
            >
          </aside>{/if}
      </div>
    {:else}
      <section class="page-heading">
        <div>
          <p class="eyebrow">{t('KNOW YOUR SETUP')}</p>
          <h1>{t('Equipment')}</h1>
          <p>{t('The bows you shoot, with the details worth remembering.')}</p>
        </div>
      </section>
      <div class="equipment-grid">
        <section>
          <div class="section-title">
            <h2>{t('Your setups')}</h2>
            <span>{setups.length} {t('setups')}</span>
          </div>
          {#if !setups.length}<div class="empty">
              <h3>{t('A place for your bow.')}</h3>
              <p>
                {t('Add your first setup to attach it to a training session.')}
              </p>
            </div>{/if}{#each setups as setup}<article class="setup-card">
              <span class="pill completed">{t(setup.bowType)}</span>
              <h3>{setup.name}</h3>
              <p>{setup.notes || t('No setup notes yet.')}</p>
            </article>{/each}
        </section>
        <section class="editor">
          <h2>{t('Add a setup')}</h2>
          <form onsubmit={addSetup}>
            <label
              >{t('Setup name')}<input
                required
                maxlength="120"
                placeholder={t('My outdoor recurve')}
                bind:value={setupName}
              /></label
            ><label
              >{t('Bow type')}<select bind:value={setupBow}
                >{#each bowTypes as type}<option value={type}>{t(type)}</option
                  >{/each}</select
              ></label
            ><label
              >{t('Equipment and tuning notes')}<textarea
                rows="6"
                placeholder={t('Bow, limbs, draw weight, arrows, sight marks…')}
                bind:value={setupNotes}></textarea></label
            ><button class="primary" disabled={!loaded}
              >{t('Save setup')}</button
            >
          </form>
          <p class="field-hint">
            {t('A copy of your setup is kept with each session.')}
          </p>
        </section>
      </div>
    {/if}
  </main>
</div>

{#if shooting && draft}
  <ShootingView
    session={draft}
    {t}
    {saveLabel}
    {error}
    onscore={(value) =>
      updateTraining((session) => recordArrow(session, value))}
    onundo={() => updateTraining(undoArrow)}
    onclose={closeShooting}
    onfinish={finish}
    onstart={() => updateTraining(startTimer)}
    onstop={() => updateTraining(stopTimer)}
    onmanual={(minutes) =>
      updateTraining((session) => setManualDuration(session, minutes))}
    onexport={exportData}
    onretry={() => void flush()}
  />
{/if}
