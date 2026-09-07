<script lang="ts">
  import { onMount } from 'svelte';
  import { scoreValues, beursaultScoreValues, type Session } from '$lib/model';
  import { enteredScores, roundProgress } from '$lib/training';
  import type { MessageKey } from '$lib/i18n';
  import TrainingTimer from './TrainingTimer.svelte';
  import RoundSummary from './RoundSummary.svelte';
  import BeursaultSummary from './BeursaultSummary.svelte';
  let {
    session,
    t,
    saveLabel,
    error,
    onscore,
    onundo,
    onclose,
    onfinish,
    onstart,
    onstop,
    onmanual,
    onexport,
    onretry,
  }: {
    session: Session;
    t: (key: MessageKey) => string;
    saveLabel: string;
    error: string;
    onscore: (score: string) => void;
    onundo: () => void;
    onclose: () => void;
    onfinish: () => void;
    onstart: () => void;
    onstop: () => void;
    onmanual: (minutes: number) => void;
    onexport: () => void;
    onretry: () => void;
  } = $props();
  let dialog: HTMLDialogElement;
  const scores = $derived(enteredScores(session));
  const progress = $derived(roundProgress(session));
  const beursault = $derived(session.scoringFormat === 'beursault');
  const choices = $derived(beursault ? beursaultScoreValues : scoreValues);
  onMount(() => {
    dialog.showModal();
    return () => dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  class="shooting-view"
  aria-label={t('Shooting mode')}
  oncancel={(event) => {
    event.preventDefault();
    onclose();
  }}
>
  <div class="shooting-content">
    <header>
      <div>
        <p class="eyebrow">{t('Shooting mode')}</p>
        <h1>{session.title || t('New practice')}</h1>
        <p>{session.distance} m · {session.target}</p>
      </div>
      <button class="secondary" onclick={onclose}>{t('Back to session')}</button
      >
    </header>
    {#if error}<div role="alert" class="error">
        {t(error as MessageKey)}
        <button onclick={onretry}>{t('Retry save')}</button><button
          onclick={onexport}>{t('Export a backup')}</button
        >
      </div>{/if}
    <TrainingTimer {session} {t} {onstart} {onstop} {onmanual} manual={false} />
    <RoundSummary {session} {t} />
    <div class="shooting-score">
      <strong>{progress.points}</strong><span>{t('points')}</span>
    </div>
    {#if beursault}<BeursaultSummary ends={[scores]} {t} />{/if}
    <div class="next-arrow" aria-live="polite">
      {#if progress.complete || session.status === 'completed'}<strong
          >{t(
            progress.complete ? 'All arrows are recorded.' : 'Session stopped',
          )}</strong
        >
      {:else}<strong
          >{t('Arrow')}
          {scores.length + 1}{#if progress.limit}
            / {progress.limit}{/if}</strong
        >
        <span
          >{t(beursault ? 'Halte' : 'End')}
          {beursault
            ? Math.floor(scores.length / 2) + 1
            : session.ends.length + 1} · {t('Arrow')}
          {beursault ? (scores.length % 2) + 1 : session.pendingEnd.length + 1} /
          {beursault ? 2 : 6}</span
        >{/if}
    </div>
    <div class="shooting-pad" class:beursault-pad={beursault}>
      {#each choices as value}<button
          class:gold={!beursault && ['X', '10', '9'].includes(value)}
          class:noir={beursault && value === '4'}
          disabled={progress.complete || session.status !== 'draft' || !!error}
          onclick={() => onscore(value)}>{value}</button
        >{/each}
    </div>
    <p class="field-hint">
      {t('Each tap saves one arrow and advances automatically.')}
    </p>
    <div class="shooting-actions">
      <button
        class="secondary"
        disabled={!scores.length || session.status !== 'draft'}
        onclick={onundo}>{t('Undo last arrow')}</button
      ><span aria-live="polite"
        >{t((saveLabel || 'Ready to save') as MessageKey)}</span
      ><button
        class="primary"
        disabled={session.status !== 'draft' || !!error}
        onclick={onfinish}>{t('Finish session ✓')}</button
      >
    </div>
    <details>
      <summary>{t('Scorecard')}</summary>
      <ol class="arrow-history">
        {#each scores as value, index}<li>
            <span>{index + 1}</span><strong>{value}</strong>
          </li>{/each}
      </ol>
    </details>
  </div>
</dialog>
