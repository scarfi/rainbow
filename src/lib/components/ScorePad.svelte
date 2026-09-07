<script lang="ts">
  import BeursaultSummary from './BeursaultSummary.svelte';
  import {
    total,
    scoreValues,
    beursaultScoreValues,
    type Session,
  } from '$lib/model';
  import type { MessageKey } from '$lib/i18n';
  let {
    ends,
    scoringFormat,
    pendingEnd,
    t,
    onpending,
    onadd,
    onremove,
  }: {
    ends: string[][];
    scoringFormat: Session['scoringFormat'];
    pendingEnd: string[];
    t: (key: MessageKey) => string;
    onpending: (values: string[]) => void;
    onadd: () => void;
    onremove: (index: number) => void;
  } = $props();
  const isBeursault = $derived(scoringFormat === 'beursault');
  const choices = $derived(isBeursault ? beursaultScoreValues : scoreValues);
  const maxArrows = $derived(isBeursault ? 1 : 6);
</script>

<div class="scoring">
  <div class="section-title">
    <h3>
      {t(isBeursault ? 'Score your arrows' : 'Score your ends')}
      <span>{t('Optional')}</span>
    </h3>
    {#if !isBeursault}<strong>{total(ends)} {t('pts')}</strong>{/if}
  </div>
  <p class="field-hint">
    {t(
      isBeursault
        ? 'Beursault · one arrow at a time · 1–4 points, M = miss'
        : '10-zone target scoring · up to 6 arrows per end · X = 10, M = miss',
    )}
  </p>
  {#if isBeursault}<BeursaultSummary {ends} {t} />
    <p class="field-hint">
      {t(
        'Honneurs: 1–4. Chapelets: 3–4. Noirs: 4. Totals include recorded arrows only.',
      )}
    </p>{/if}
  {#if ends.length}<ol class="ends">
      {#each ends as end, i}<li>
          <span class="end-number">{i + 1}</span><span class="end-scores"
            >{end.join(' · ')}</span
          ><strong>{total([end])}</strong><button
            aria-label={t(
              isBeursault ? 'Remove arrow {number}' : 'Remove end {number}',
            ).replace('{number}', String(i + 1))}
            onclick={() => onremove(i)}>✕</button
          >
        </li>{/each}
    </ol>{/if}
  <div class="pending-end" aria-live="polite">
    {pendingEnd.length
      ? pendingEnd.join(' · ')
      : t(
          isBeursault
            ? 'Tap a score to record an arrow'
            : 'Tap scores to record an end',
        )}
  </div>
  <div class="score-pad" class:beursault-pad={isBeursault}>
    {#each choices as value}<button
        class:gold={!isBeursault && ['X', '10', '9'].includes(value)}
        class:red={!isBeursault && ['8', '7'].includes(value)}
        class:blue={!isBeursault && ['6', '5'].includes(value)}
        class:noir={isBeursault && value === '4'}
        disabled={pendingEnd.length >= maxArrows}
        onclick={() => onpending([...pendingEnd, value])}>{value}</button
      >{/each}
  </div>
  <div class="end-actions">
    <button
      class="text-button"
      disabled={!pendingEnd.length}
      onclick={() => onpending(pendingEnd.slice(0, -1))}
      >{t('Undo arrow')}</button
    ><button class="secondary" disabled={!pendingEnd.length} onclick={onadd}
      >{t(isBeursault ? 'Add arrow ＋' : 'Add end ＋')}</button
    >
  </div>
</div>
