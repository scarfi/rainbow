import { describe, expect, it } from 'vitest';
import { newSession } from '../src/lib/model';
import { exportSelection, serializeSessions } from '../src/lib/exports';

describe('contextual exports', () => {
  it('exports all sessions on a day and applies the journal search separately', () => {
    const first = { ...newSession(), date: '2026-09-08', title: 'Morning' };
    const second = { ...newSession(), date: first.date, title: 'Evening' };
    const other = { ...newSession(), date: '2026-09-07' };
    expect(exportSelection([first, second, other], null, first.date)).toEqual([
      first,
      second,
    ]);
    expect(
      exportSelection([first, second, other], null, first.date, 'evening'),
    ).toEqual([second]);
  });
  it('overlays unsaved edits before filtering and keeps complete JSON details', () => {
    const saved = { ...newSession(), date: '2026-09-07' };
    const editor = {
      ...saved,
      date: '2026-09-08',
      pendingEnd: ['X', '9'],
      notes: 'équipement',
    };
    expect(exportSelection([saved], editor, saved.date)).toEqual([]);
    const chosen = exportSelection([saved], editor, editor.date);
    const data = JSON.parse(serializeSessions(chosen, 'json', 0));
    expect(data.sessions).toEqual([editor]);
    expect(saved.pendingEnd).toEqual([]);
  });
  it('quotes CSV commas, quotes and newlines and neutralizes formulas', () => {
    const session = {
      ...newSession(),
      title: '=1+1',
      notes: 'line, "two"\nnext',
    };
    const csv = serializeSessions([session], 'csv');
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"line, ""two""\nnext"');
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });
  it('includes pending Beursault scores in points and all four totals', () => {
    const session = {
      ...newSession(),
      scoringFormat: 'beursault' as const,
      ends: [['4'], ['3'], ['M']],
      pendingEnd: ['2'],
      arrows: 4,
    };
    const cells = serializeSessions([session], 'csv')
      .split('\r\n')[1]
      .split(',');
    expect(cells.slice(11, 15)).toEqual(['"9"', '"3"', '"2"', '"1"']);
  });
});
