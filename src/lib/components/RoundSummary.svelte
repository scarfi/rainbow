<script lang="ts">
  import type { Session } from '$lib/model';
  import { roundProgress } from '$lib/training';
  import type { MessageKey } from '$lib/i18n';
  let { session, t }: { session: Session; t: (key: MessageKey) => string } =
    $props();
  const progress = $derived(roundProgress(session));
</script>

{#if progress.limit !== null}
  <div class="round-summary">
    <div>
      <strong>{progress.count} / {progress.limit}</strong>
      {t('arrows')}
      {#if session.round === 'progression'}<span>
          · {t(session.progressionLevel)} · {session.distance} m</span
        >{/if}
    </div>
    <progress
      aria-label={t('Round progress')}
      value={progress.count}
      max={progress.limit}
    ></progress>
    {#if progress.goal !== null}<p>
        {progress.points} / {progress.goal}
        {t('points')} · {t(
          progress.achieved
            ? 'Target reached'
            : progress.complete
              ? 'Target not reached'
              : 'Round in progress',
        )}
      </p>
    {:else if progress.complete}<p>{t('All arrows are recorded.')}</p>{/if}
    {#if session.status === 'completed' && !progress.complete}<p>
        {t('Incomplete round')}
      </p>{/if}
  </div>
{/if}
