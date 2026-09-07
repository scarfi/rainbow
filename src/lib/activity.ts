import type { Session } from './model';

export type DayActivity = { arrows: number; sessions: number };

/** Use the recorded training date, not a UTC conversion of its save timestamp. */
export function activityByDay(sessions: Pick<Session, 'date' | 'arrows'>[]) {
  const days = new Map<string, DayActivity>();
  for (const session of sessions) {
    const previous = days.get(session.date) ?? { arrows: 0, sessions: 0 };
    days.set(session.date, {
      arrows: previous.arrows + session.arrows,
      sessions: previous.sessions + 1,
    });
  }
  return days;
}

/** Monday-first columns, padded only outside the selected calendar year. */
export function calendarWeeks(year: number): (string | null)[][] {
  if (!Number.isInteger(year) || year < 1 || year > 9999) return [];
  const first = new Date(0);
  first.setUTCFullYear(year, 0, 1);
  const padding = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(padding).fill(null);
  for (
    let day = first;
    day.getUTCFullYear() === year;
    day = new Date(day.getTime() + 86400000)
  ) {
    cells.push(day.toISOString().slice(0, 10));
  }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) =>
    cells.slice(week * 7, week * 7 + 7),
  );
}

/** Fixed buckets let an archer compare activity across years consistently. */
export function activityLevel(arrows: number) {
  return arrows === 0
    ? 0
    : arrows < 30
      ? 1
      : arrows < 60
        ? 2
        : arrows < 100
          ? 3
          : 4;
}

export function sessionsOnDay<T extends { date: string }>(
  sessions: T[],
  date: string | null,
) {
  return date === null
    ? sessions
    : sessions.filter((session) => session.date === date);
}
