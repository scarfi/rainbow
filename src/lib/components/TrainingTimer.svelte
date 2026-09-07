<script lang="ts">
  import { onMount } from 'svelte';
  import { clockLabel, elapsedMs } from '$lib/training';
  import type { Session } from '$lib/model';
  import type { MessageKey } from '$lib/i18n';
  let {
    session,
    t,
    onstart,
    onstop,
    onmanual,
    manual = true,
  }: {
    session: Session;
    t: (key: MessageKey) => string;
    onstart: () => void;
    onstop: () => void;
    onmanual: (minutes: number) => void;
    manual?: boolean;
  } = $props();
  let now = $state(Date.now());
  onMount(() => {
    const interval = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(interval);
  });
</script>

<div class="training-timer">
  <div class="timer-row">
    <div>
      <span class="field-hint">{t('Session duration')}</span><strong
        class="clock"
        aria-label={t('Session duration')}
        >{clockLabel(elapsedMs(session, now))}</strong
      >
    </div>
    {#if session.timerStartedAt === null}<button
        class="secondary"
        disabled={session.status !== 'draft'}
        onclick={() => {
          now = Date.now();
          onstart();
        }}>{t('Start')}</button
      >
    {:else}<button
        class="primary"
        onclick={() => {
          now = Date.now();
          onstop();
        }}>{t('Stop')}</button
      >{/if}
  </div>
  {#if manual}<label
      >{t('Or enter minutes manually')}<input
        type="number"
        min="0"
        step="1"
        value={session.duration}
        disabled={session.timerStartedAt !== null}
        onchange={(event) => onmanual(event.currentTarget.valueAsNumber)}
      /></label
    >{/if}
</div>
