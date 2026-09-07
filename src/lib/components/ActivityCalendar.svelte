<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { activityByDay, activityLevel, calendarWeeks } from '$lib/activity';
  import { localDate, type Session } from '$lib/model';
  import type { Locale, MessageKey } from '$lib/i18n';
  let {
    sessions,
    selectedDay,
    locale,
    t,
    onselect,
  }: {
    sessions: Session[];
    selectedDay: string | null;
    locale: Locale;
    t: (key: MessageKey) => string;
    onselect: (date: string | null) => void;
  } = $props();
  const initialDate = localDate();
  let today = $state(initialDate);
  let year = $state(Number(initialDate.slice(0, 4)));
  let focusDay = $state(initialDate);
  let scrollArea: HTMLDivElement;
  const days = $derived(activityByDay(sessions));
  const weeks = $derived(calendarWeeks(year));
  const years = $derived(
    [
      ...new Set([
        year,
        ...Array.from({ length: 5 }, (_, i) => Number(today.slice(0, 4)) - i),
        ...sessions.map((s) => Number(s.date.slice(0, 4))),
      ]),
    ].sort((a, b) => b - a),
  );
  const yearDays = $derived(
    [...days.entries()].filter(([date]) => Number(date.slice(0, 4)) === year),
  );
  const arrows = $derived(
    yearDays.reduce((sum, [, day]) => sum + day.arrows, 0),
  );
  const activeDays = $derived(
    yearDays.filter(([, day]) => day.arrows > 0).length,
  );
  const dateFormat = $derived(
    new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }),
  );
  const monthFormat = $derived(
    new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }),
  );
  function dateValue(date: string) {
    return new Date(`${date}T12:00:00Z`);
  }
  function label(date: string) {
    const activity = days.get(date);
    return `${dateFormat.format(dateValue(date))}: ${(activity?.arrows ?? 0).toLocaleString(locale)} ${t('arrows')}, ${activity?.sessions ?? 0} ${t('sessions')}`;
  }
  function choose(date: string) {
    focusDay = date;
    onselect(date);
  }
  async function showYear(next: number) {
    year = next;
    focusDay =
      next === Number(today.slice(0, 4))
        ? today
        : `${String(next).padStart(4, '0')}-01-01`;
    onselect(null);
    await tick();
    reveal();
  }
  function reveal() {
    const tile = scrollArea?.querySelector<HTMLButtonElement>(
      `[data-date="${focusDay}"]`,
    );
    if (tile)
      scrollArea.scrollLeft = Math.max(
        0,
        tile.offsetLeft - scrollArea.clientWidth / 2,
      );
  }
  function move(event: KeyboardEvent, date: string) {
    const offsets: Record<string, number> = {
      ArrowUp: -1,
      ArrowDown: 1,
      ArrowLeft: -7,
      ArrowRight: 7,
    };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = new Date(
      dateValue(date).getTime() + offsets[event.key] * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    if (Number(next.slice(0, 4)) !== year) return;
    focusDay = next;
    void tick().then(() =>
      scrollArea
        .querySelector<HTMLButtonElement>(`[data-date="${next}"]`)
        ?.focus(),
    );
  }
  onMount(() => {
    today = localDate();
    year = Number(today.slice(0, 4));
    focusDay = today;
    void tick().then(reveal);
  });
</script>

<section class="activity-calendar" aria-label={t('Arrow activity')}>
  <div class="section-title">
    <div>
      <h2>{t('Arrow activity')}</h2>
      <p class="field-hint">
        {arrows.toLocaleString(locale)}
        {t('arrows')} · {activeDays}
        {t('active days')} · {year}
      </p>
    </div>
    <label
      ><span class="sr-only">{t('Calendar year')}</span><select
        aria-label={t('Calendar year')}
        value={year}
        onchange={(event) => void showYear(Number(event.currentTarget.value))}
        >{#each years as value}<option {value}>{value}</option>{/each}</select
      ></label
    >
  </div>
  <div class="calendar-scroll" bind:this={scrollArea}>
    <div class="calendar-weeks">
      <div class="calendar-week weekday-labels" aria-hidden="true">
        <span></span>{#each [1, 2, 3, 4, 5, 6, 7] as day}<span
            >{new Intl.DateTimeFormat(locale, {
              weekday: 'short',
              timeZone: 'UTC',
            }).format(new Date(`2024-01-0${day}T12:00:00Z`))}</span
          >{/each}
      </div>
      {#each weeks as week}
        <div class="calendar-week">
          <span class="calendar-month"
            >{#if week.some( (date) => date?.endsWith('-01') )}{monthFormat.format(
                dateValue(week.find((date) => date?.endsWith('-01'))!),
              )}{/if}</span
          >
          {#each week as date}
            {#if date}<button
                type="button"
                class="activity-cell"
                class:selected={selectedDay === date}
                class:has-session={(days.get(date)?.sessions ?? 0) > 0}
                data-level={activityLevel(days.get(date)?.arrows ?? 0)}
                data-date={date}
                aria-label={label(date)}
                aria-pressed={selectedDay === date}
                aria-current={date === today ? 'date' : undefined}
                title={label(date)}
                tabindex={focusDay === date ? 0 : -1}
                onfocus={() => (focusDay = date)}
                onkeydown={(event) => move(event, date)}
                onclick={() => choose(date)}
              ></button>
            {:else}<span
                class="activity-cell calendar-padding"
                aria-hidden="true"
              ></span>{/if}
          {/each}
        </div>
      {/each}
    </div>
  </div>
  <div class="calendar-footer">
    <p class="field-hint">
      {t(
        'Monday first. Select a day to view its sessions. Drafts are included.',
      )}
    </p>
    <div class="calendar-legend" aria-label={t('Arrows per day')}>
      <span>{t('arrows')}</span
      >{#each ['0', '1–29', '30–59', '60–99', '100+'] as bucket, index}<span
          ><i class="activity-cell" data-level={index} aria-hidden="true"
          ></i>{bucket}</span
        >{/each}
    </div>
  </div>
  <div class="calendar-selection">
    <label
      >{t('View a day')}<input
        type="date"
        value={selectedDay ?? ''}
        onchange={(event) => {
          const date = event.currentTarget.value;
          if (date) {
            year = Number(date.slice(0, 4));
            choose(date);
            void tick().then(reveal);
          } else onselect(null);
        }}
      /></label
    >
    <button
      class="secondary"
      disabled={!selectedDay}
      onclick={() => onselect(null)}>{t('Show all sessions')}</button
    >
    {#if selectedDay}<p aria-live="polite">{label(selectedDay)}</p>{/if}
  </div>
</section>
