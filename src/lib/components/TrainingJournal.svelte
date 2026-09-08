<script lang="ts">
  import SessionExport from './SessionExport.svelte';
  import type { ExportFormat } from '$lib/exports';
  import RoundSummary from './RoundSummary.svelte';
  import BeursaultSummary from './BeursaultSummary.svelte';
  import { total, type Session } from '$lib/model';
  import type { MessageKey } from '$lib/i18n';
  let {
    sessions,
    filtered,
    loaded,
    query = $bindable(),
    selectedId,
    selectedDay,
    t,
    dateLabel,
    onopen,
    onstart,
    onexport,
  }: {
    sessions: Session[];
    filtered: Session[];
    loaded: boolean;
    query: string;
    selectedId?: string;
    selectedDay: string | null;
    t: (key: MessageKey) => string;
    dateLabel: (date: string) => string;
    onopen: (session: Session) => void;
    onstart: () => void;
    onexport: (format: ExportFormat, wholeDay?: boolean) => void;
  } = $props();
</script>

<section class="journal">
  <div class="section-title">
    <h2>{selectedDay ? dateLabel(selectedDay) : t('Training journal')}</h2>
    <span>{filtered.length} {t('entries')}</span>
  </div>
  <div class="journal-exports">
    {#if selectedDay}
      <SessionExport
        label="Export this day"
        {t}
        disabled={!loaded || !sessions.length}
        onexport={(format) => onexport(format, true)}
      />
    {/if}
    <SessionExport
      label="Export matching sessions"
      {t}
      disabled={!loaded || !filtered.length}
      onexport={(format) => onexport(format)}
    />
  </div>
  <label class="search"
    ><span class="sr-only">{t('Search training')}</span><input
      type="search"
      placeholder={t('Search sessions, bows, notes…')}
      bind:value={query}
    /></label
  >
  {#if !loaded}<div class="empty"><h3>{t('Opening your journal…')}</h3></div>
  {:else if sessions.length === 0 && selectedDay}<div class="empty">
      <h3>{t('No sessions on this day')}</h3>
      <p>{t('Select another day or show all sessions.')}</p>
    </div>
  {:else if sessions.length === 0}<div class="empty">
      <div class="target-mark" aria-hidden="true">◎</div>
      <h3>{t('Your first arrow starts here.')}</h3>
      <p>
        {t('Log a quick practice or score every end.')}<br />{t(
          'Your session stays with you, even offline.',
        )}
      </p>
      <button class="secondary" onclick={onstart}
        >{t('Log your first session ↗')}</button
      >
    </div>
  {:else if filtered.length === 0}<div class="empty">
      <h3>{t('No matching sessions')}</h3>
      <p>{t('Try another bow name or training note.')}</p>
    </div>
  {:else}<div class="session-list">
      {#each filtered as session (session.id)}<button
          class="session-card"
          class:selected={selectedId === session.id}
          onclick={() => onopen(session)}
          ><div class="session-meta">
            <span>{dateLabel(session.date)}</span><span
              class:completed={session.status === 'completed'}
              class="pill"
              >{t(session.status === 'draft' ? 'Draft' : 'Completed')}</span
            >
          </div>
          <h3>{session.title || t('Untitled practice')}</h3>
          <p>
            {t(session.setup?.bowType ?? 'No bow selected')} · {session.distance}
            m · {t(session.environment)}
            · {session.target}
          </p>
          <div class="session-footer">
            <span><strong>{session.arrows}</strong> {t('arrows')}</span
            >{#if session.ends.length && session.scoringFormat !== 'beursault'}<span
                ><strong>{total([...session.ends, session.pendingEnd])}</strong>
                {t('points')}</span
              >{/if}<span class="open-arrow" aria-hidden="true">↗</span>
          </div>
          <RoundSummary {session} {t} />
          {#if session.scoringFormat === 'beursault'}<BeursaultSummary
              ends={session.ends}
              {t}
            />{/if}
        </button>{/each}
    </div>{/if}
  <p class="local-note">
    {t('Private on this device. Export a backup to keep another copy.')}
  </p>
</section>
