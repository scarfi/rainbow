<script lang="ts">
  import {
    hasScores,
    targetFaces,
    selectTargetFace,
    selectedTargetFace,
    type Session,
    type Setup,
  } from '$lib/model';
  import type { MessageKey } from '$lib/i18n';
  let {
    session = $bindable(),
    setups,
    t,
    onchange,
    onsetup,
  }: {
    session: Session;
    setups: Setup[];
    t: (key: MessageKey) => string;
    onchange: () => void;
    onsetup: (id: string) => void;
  } = $props();
  const scored = $derived(session.ends.flat().length);
</script>

<form onsubmit={(e) => e.preventDefault()} oninput={onchange}>
  <label
    >{t('Session name')}<input
      maxlength="120"
      placeholder={t('Evening practice')}
      bind:value={session.title}
    /></label
  >
  <div class="field-row">
    <label
      >{t('Date')}<input
        type="date"
        required
        bind:value={session.date}
      /></label
    ><label
      >{t('Location')}<input
        maxlength="180"
        placeholder={t('Your range')}
        bind:value={session.location}
      /></label
    >
  </div>
  <label
    >{t('Equipment setup')}<select
      value={session.setup?.id ?? ''}
      onchange={(e) => onsetup(e.currentTarget.value)}
      ><option value="">{t('No setup selected')}</option
      >{#each setups as setup}<option value={setup.id}
          >{setup.name} · {t(setup.bowType)}</option
        >{/each}{#if session.setup && !setups.some((s) => s.id === session?.setup?.id)}<option
          value={session.setup.id}>{session.setup.name}</option
        >{/if}</select
    ></label
  >
  {#if !setups.length}<p class="field-hint">
      {t('Create your bow setup in Equipment, then select it here.')}
    </p>{/if}
  <div class="field-row">
    <label
      >{t('Setting')}<select bind:value={session.environment} {onchange}
        ><option value="Indoor">{t('Indoor')}</option><option value="Outdoor"
          >{t('Outdoor')}</option
        ></select
      ></label
    ><label
      >{t('Distance (m)')}<input
        type="number"
        min="0"
        step="1"
        bind:value={session.distance}
      /></label
    >
  </div>
  <div class="field-row">
    <label
      >{t('Target face')}
      <select
        value={selectedTargetFace(session)}
        disabled={hasScores(session)}
        onchange={(event) => {
          selectTargetFace(session, event.currentTarget.value);
          onchange();
        }}
      >
        {#if selectedTargetFace(session) === 'saved'}<option
            value="saved"
            disabled
            >{session.target || t('Saved target')} ({t('Saved target')})</option
          >{/if}
        {#each targetFaces as face}<option value={face.id}
            >{t(face.label)}</option
          >{/each}
      </select>
    </label><label
      >{t('Duration (minutes)')}<input
        type="number"
        min="0"
        step="1"
        bind:value={session.duration}
      /></label
    >
  </div>
  {#if hasScores(session)}<p class="field-hint">
      {t('Start a new session to change the target face.')}
    </p>{/if}

  <label
    >{t('Total arrows shot')}<input
      type="number"
      min={scored}
      step="1"
      bind:value={session.arrows}
    /></label
  >
  <p class="field-hint">{t('Includes warm-up and unscored arrows.')}</p>
  <label
    >{t('Training notes')}<textarea
      rows="4"
      placeholder={t('What felt good? What will you work on next?')}
      bind:value={session.notes}></textarea></label
  >
</form>
