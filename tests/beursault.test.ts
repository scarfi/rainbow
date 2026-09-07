import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, expect, it } from 'vitest';
import { TrainingDB } from '../src/lib/db';
import {
  beursaultTotals,
  newSession,
  selectTargetFace,
  selectedTargetFace,
  total,
  validateSession,
  type Session,
} from '../src/lib/model';

const databases: Dexie[] = [];
function createDB(name = crypto.randomUUID()) {
  const db = new TrainingDB(name);
  databases.push(db);
  return db;
}
afterEach(async () => {
  for (const db of databases) {
    db.close();
    await db.delete();
  }
  databases.length = 0;
});
function beursault(): Session {
  const session = newSession();
  selectTargetFace(session, 'beursault');
  return session;
}

it('counts nested honneurs, chapelets, and noirs correctly, with misses worth zero', () => {
  expect(beursaultTotals([['1'], ['2'], ['3'], ['4'], ['M']])).toEqual({
    honneurs: 4,
    points: 10,
    chapelets: 2,
    noirs: 1,
  });
  expect(beursaultTotals([])).toEqual({
    honneurs: 0,
    points: 0,
    chapelets: 0,
    noirs: 0,
  });
  expect(beursaultTotals([['M'], ['M']])).toEqual({
    honneurs: 0,
    points: 0,
    chapelets: 0,
    noirs: 0,
  });
});
it('scores a perfect 40-arrow Beursault session', () => {
  expect(beursaultTotals(Array.from({ length: 40 }, () => ['4']))).toEqual({
    honneurs: 40,
    points: 160,
    chapelets: 40,
    noirs: 40,
  });
});
it('validates every Beursault value, and rejects 10-zone values and multi-arrow entries', () => {
  for (const value of ['1', '2', '3', '4', 'M'])
    expect(() =>
      validateSession({ ...beursault(), ends: [[value]], arrows: 1 }),
    ).not.toThrow();
  for (const value of ['X', '10', '9', '8', '7', '6', '5', '0'])
    expect(() =>
      validateSession({ ...beursault(), pendingEnd: [value] }),
    ).toThrow();
  expect(() =>
    validateSession({ ...beursault(), ends: [['1', '2']], arrows: 2 }),
  ).toThrow();
  expect(() =>
    validateSession({ ...beursault(), pendingEnd: ['1', '2'] }),
  ).toThrow();
});
it('keeps all four standard face sizes on the normal scoring system', () => {
  for (const [id, target] of [
    ['40cm', '40 cm'],
    ['60cm', '60 cm'],
    ['80cm', '80 cm'],
    ['122cm', '122 cm'],
  ]) {
    const session = newSession();
    selectTargetFace(session, id);
    expect(session.target).toBe(target);
    expect(session.scoringFormat).toBe('ten-zone');
    expect(() =>
      validateSession({ ...session, ends: [['X', '10', '9', 'M']], arrows: 4 }),
    ).not.toThrow();
  }
  expect(total([['X', '10', '9', 'M']])).toBe(29);
});
it('does not change a scored or unfinished session when another target is selected', () => {
  for (const session of [
    { ...newSession(), ends: [['1']], arrows: 1 },
    { ...newSession(), pendingEnd: ['1'] },
  ]) {
    const before = structuredClone(session);
    expect(() => selectTargetFace(session, 'beursault')).toThrow();
    expect(() => selectTargetFace(session, '122cm')).toThrow();
    expect(session).toEqual(before);
  }
  expect(() => selectTargetFace(newSession(), 'unknown')).toThrow();
});
it('restores Beursault scoring, an unfinished arrow, and totals after reopening offline storage', async () => {
  const name = crypto.randomUUID();
  const first = createDB(name);
  const saved = await first.saveSession({
    ...beursault(),
    ends: [['4'], ['3'], ['M']],
    pendingEnd: ['2'],
    arrows: 3,
  });
  first.close();
  const reopened = createDB(name);
  const restored = (await reopened.sessions.get(saved.id))!;
  expect(restored).toEqual(saved);
  // Pending arrows are durable but do not count until explicitly added.
  expect(beursaultTotals(restored.ends)).toEqual({
    honneurs: 2,
    points: 7,
    chapelets: 2,
    noirs: 1,
  });
  expect((await reopened.backup()).sessions[0].scoringFormat).toBe('beursault');
});
it('blocks changing a stored scoring system even if the new numeric values are valid', async () => {
  const db = createDB();
  const original = await db.saveSession({
    ...newSession(),
    ends: [['3']],
    arrows: 1,
  });
  await expect(
    db.saveSession({
      ...original,
      target: 'Beursault',
      scoringFormat: 'beursault',
    }),
  ).rejects.toThrow();
  expect(await db.sessions.get(original.id)).toEqual(original);
});
it('migrates existing sessions without rewriting scores, notes, or custom face descriptions', async () => {
  const name = crypto.randomUUID();
  const old = new Dexie(name);
  databases.push(old);
  old
    .version(2)
    .stores({ sessions: 'id, date, updatedAt, status', setups: 'id, name' });
  const { scoringFormat: _, ...legacy } = {
    ...newSession(),
    target: 'My custom 80 cm face',
    ends: [['X', '9']],
    arrows: 2,
    notes: 'Keep this note',
  };
  await old.table('sessions').put(legacy);
  old.close();
  const current = createDB(name);
  const restored = (await current.sessions.get(legacy.id))!;
  expect(restored).toEqual({ ...legacy, scoringFormat: 'ten-zone' });
  expect(selectedTargetFace(restored)).toBe('saved');
  expect(selectedTargetFace({ ...restored, target: 'Beursault' })).toBe(
    'saved',
  );
});
