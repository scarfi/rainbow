<script lang="ts">
  import { hasScores, type Session } from '$lib/model';
  import {
    configureRound,
    progressionLevels,
    type RoundType,
    type ProgressionLevel,
  } from '$lib/training';
  import type { MessageKey } from '$lib/i18n';
  let {
    session = $bindable(),
    t,
    onchange,
  }: {
    session: Session;
    t: (key: MessageKey) => string;
    onchange: () => void;
  } = $props();
</script>

<div class="round-settings">
  <label
    >{t('Session format')}<select
      value={session.round}
      disabled={hasScores(session)}
      onchange={(event) => {
        configureRound(session, event.currentTarget.value as RoundType);
        onchange();
      }}
    >
      <option value="free">{t('Free practice')}</option>
      <option value="beursault-10"
        >{t('Beursault · 10 haltes · 20 arrows')}</option
      >
      <option value="beursault-20"
        >{t('Beursault · 20 haltes · 40 arrows')}</option
      >
      <option value="progression">{t('Progression arrow · 36 arrows')}</option>
    </select></label
  >
  {#if session.round === 'progression'}
    <label
      >{t('Progression level')}<select
        value={session.progressionLevel}
        disabled={hasScores(session)}
        onchange={(event) => {
          configureRound(
            session,
            'progression',
            event.currentTarget.value as ProgressionLevel,
          );
          onchange();
        }}
        >{#each progressionLevels as level}<option value={level}
            >{t(level)}</option
          >{/each}</select
      ></label
    >
    <p class="field-hint">
      {t('Reference bow')}: {t(session.setup?.bowType ?? 'Recurve')}. {t(
        'Training benchmark; official awards are validated by your club.',
      )}
    </p>
    {#if session.setup?.bowType === 'Barebow'}<p class="field-hint">
        {t('Barebow uses the recurve training benchmark here.')}
      </p>{/if}
  {/if}
  {#if session.round.startsWith('beursault-')}<p class="field-hint">
      {t(
        'One halte = two arrows, out and back. Warm-up arrows are not scored in this round.',
      )}
    </p>{/if}
</div>
