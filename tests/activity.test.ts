import { describe, expect, it } from 'vitest';
import {
  activityByDay,
  activityLevel,
  calendarWeeks,
  sessionsOnDay,
} from '../src/lib/activity';

describe('daily arrow activity', () => {
  it('sums multiple sessions on the recorded date, including zero-arrow sessions', () => {
    const days = activityByDay([
      { date: '2026-09-07', arrows: 36 },
      { date: '2026-09-07', arrows: 20 },
      { date: '2026-09-08', arrows: 0 },
    ]);
    expect(days.get('2026-09-07')).toEqual({ arrows: 56, sessions: 2 });
    expect(days.get('2026-09-08')).toEqual({ arrows: 0, sessions: 1 });
    expect(days.has('2026-09-09')).toBe(false);
  });
  it('does not double count scores or move sessions to their last-edit date', () => {
    const session = {
      date: '2026-09-07',
      arrows: 40,
      ends: [['10']],
      updatedAt: '2026-09-08T01:00:00Z',
      status: 'draft',
    };
    expect(activityByDay([session]).get('2026-09-07')?.arrows).toBe(40);
  });
  it('filters all sessions for a day and restores all sessions when cleared', () => {
    const sessions = [
      { id: 1, date: '2026-09-07' },
      { id: 2, date: '2026-09-08' },
      { id: 3, date: '2026-09-07' },
    ];
    expect(sessionsOnDay(sessions, '2026-09-07').map((s) => s.id)).toEqual([
      1, 3,
    ]);
    expect(sessionsOnDay(sessions, '2026-09-09')).toEqual([]);
    expect(sessionsOnDay(sessions, null)).toBe(sessions);
  });
  it('uses stable intensity boundaries', () => {
    expect([0, 1, 29, 30, 59, 60, 99, 100, 500].map(activityLevel)).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4, 4,
    ]);
  });
});

describe('calendar geometry', () => {
  it.each([
    [2024, 366],
    [2025, 365],
    [2026, 365],
  ])('includes every day of %i exactly once', (year, count) => {
    const weeks = calendarWeeks(year);
    const days = weeks.flat().filter(Boolean);
    expect(days).toHaveLength(count);
    expect(new Set(days).size).toBe(count);
    expect(days[0]).toBe(`${year}-01-01`);
    expect(days.at(-1)).toBe(`${year}-12-31`);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
  it('aligns weekdays Monday first and includes leap day', () => {
    expect(calendarWeeks(2024)[0][0]).toBe('2024-01-01');
    expect(calendarWeeks(2026)[0]).toEqual([
      null,
      null,
      null,
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ]);
    expect(calendarWeeks(2024).flat()).toContain('2024-02-29');
    expect(calendarWeeks(2025).flat()).not.toContain('2025-02-29');
  });
  it('handles early years without the Date constructor 1900 offset', () => {
    expect(calendarWeeks(1).flat().filter(Boolean)[0]).toBe('0001-01-01');
    expect(calendarWeeks(NaN)).toEqual([]);
  });
});
