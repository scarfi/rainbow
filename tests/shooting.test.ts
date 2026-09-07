import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { TrainingDB } from '../src/lib/db';
import { newSession, type Session } from '../src/lib/model';
import {
  configureRound,
  recordArrow,
  undoArrow,
  enteredScores,
  roundProgress,
  startTimer,
  stopTimer,
  elapsedMs,
  setManualDuration,
  progressionReference,
  progressionLevels,
} from '../src/lib/training';

const databases: Dexie[] = [];
const createDB = (name = crypto.randomUUID()) => {
  const db = new TrainingDB(name);
  databases.push(db);
  return db;
};
afterEach(async () => {
  for (const db of databases) {
    db.close();
    await db.delete();
  }
  databases.length = 0;
});
const round = (kind: Session['round']) => {
  const s = newSession();
  configureRound(s, kind);
  return s;
};

describe('training timer', () => {
  it('starts, stops and resumes without counting stopped time', () => {
    const s = newSession();
    startTimer(s, 1000);
    startTimer(s, 3000);
    expect(elapsedMs(s, 61000)).toBe(60000);
    stopTimer(s, 61000);
    expect(s.duration).toBe(1);
    expect(elapsedMs(s, 100000)).toBe(60000);
    startTimer(s, 120000);
    stopTimer(s, 150000);
    expect(s.timerElapsedMs).toBe(90000);
    expect(s.timerStartedAt).toBeNull();
  });
  it('uses manual minutes as the new timer baseline', () => {
    const s = newSession();
    setManualDuration(s, 12);
    startTimer(s, 1000);
    expect(elapsedMs(s, 61000)).toBe(13 * 60000);
    expect(() => setManualDuration(s, 5)).toThrow();
    stopTimer(s, 61000);
    setManualDuration(s, 2);
    expect(elapsedMs(s)).toBe(120000);
    expect(() => setManualDuration(s, -1)).toThrow();
  });
  it('restores a running timer after closing storage', async () => {
    const name = crypto.randomUUID();
    const db = createDB(name);
    const s = newSession();
    startTimer(s, 1000);
    await db.saveSession(s);
    db.close();
    const reopened = createDB(name);
    const restored = (await reopened.sessions.get(s.id))!;
    expect(elapsedMs(restored, 181000)).toBe(180000);
  });
});

describe('automatic scoring', () => {
  it('commits the sixth arrow automatically and advances to the next end', () => {
    const s = round('progression');
    for (let i = 0; i < 6; i++) recordArrow(s, '8');
    expect(s.ends).toEqual([Array(6).fill('8')]);
    expect(s.pendingEnd).toEqual([]);
    recordArrow(s, '9');
    expect(s.pendingEnd).toEqual(['9']);
    expect(s.arrows).toBe(7);
    undoArrow(s);
    undoArrow(s);
    expect(s.ends).toEqual([]);
    expect(s.pendingEnd).toEqual(Array(5).fill('8'));
    expect(s.arrows).toBe(5);
  });
  it.each([
    ['beursault-10', 20],
    ['beursault-20', 40],
  ] as const)(
    'caps %s at %i arrows, retaining an undo path',
    async (kind, count) => {
      const db = createDB();
      const s = round(kind);
      for (let i = 0; i < count; i++) recordArrow(s, '4');
      expect(s.ends).toHaveLength(count);
      expect(roundProgress(s).complete).toBe(true);
      expect(() => recordArrow(s, '4')).toThrow();
      undoArrow(s);
      recordArrow(s, 'M');
      expect(roundProgress(s).points).toBe((count - 1) * 4);
      await expect(db.saveSession(s)).resolves.toMatchObject({ round: kind });
    },
  );
  it('preserves warm-up arrow counts when adding and undoing scores', () => {
    const s = newSession();
    s.arrows = 12;
    recordArrow(s, '8');
    expect(s.arrows).toBe(13);
    undoArrow(s);
    expect(s.arrows).toBe(12);
  });
  it('preserves an earlier complete manual end pending before scoring another arrow', () => {
    const s = newSession();
    s.pendingEnd = Array(6).fill('7');
    recordArrow(s, '8');
    expect(s.ends[0]).toEqual(Array(6).fill('7'));
    expect(s.pendingEnd).toEqual(['8']);
  });
  it('restores partial ends and rejects scoring after a session is finished', async () => {
    const name = crypto.randomUUID();
    const db = createDB(name);
    const s = round('progression');
    recordArrow(s, '9');
    recordArrow(s, '8');
    await db.saveSession(s);
    db.close();
    const reopened = createDB(name);
    const restored = (await reopened.sessions.get(s.id))!;
    expect(enteredScores(restored)).toEqual(['9', '8']);
    recordArrow(restored, '7');
    expect(restored.pendingEnd).toEqual(['9', '8', '7']);
    restored.status = 'completed';
    expect(() => recordArrow(restored, '8')).toThrow();
    expect(roundProgress(restored).achieved).toBe(false);
    await expect(reopened.saveSession(restored)).resolves.toMatchObject({
      status: 'completed',
    });
  });
});

describe('progression targets', () => {
  it('requires all 36 arrows and at least 280 points for the recurve benchmark', () => {
    const s = round('progression');
    for (let i = 0; i < 35; i++) recordArrow(s, '8');
    expect(roundProgress(s)).toMatchObject({ points: 280, achieved: false });
    recordArrow(s, 'M');
    expect(roundProgress(s)).toMatchObject({
      points: 280,
      achieved: true,
      complete: true,
    });
    undoArrow(s);
    undoArrow(s);
    recordArrow(s, '7');
    recordArrow(s, 'M');
    expect(roundProgress(s).achieved).toBe(false);
  });
  it('assigns recurve colour, distance and face together', () => {
    const s = newSession();
    const distances = [10, 15, 20, 25, 30, 40, 60, 70];
    for (const [i, level] of progressionLevels.entries()) {
      configureRound(s, 'progression', level);
      expect(s.distance).toBe(distances[i]);
      expect(progressionReference(s).goal).toBe(280);
      expect(s.target).toBe(i >= 6 ? '122 cm' : '80 cm');
    }
  });
  it('applies compound bronze, silver and gold thresholds independently of distance alone', () => {
    const s = newSession();
    s.setup = {
      id: 'test',
      name: 'Compound',
      bowType: 'Compound',
      notes: '',
      revision: 0,
      updatedAt: '',
    };
    for (const [level, distance, goal] of [
      ['Bronze', 40, 310],
      ['Silver', 50, 310],
      ['Gold', 50, 330],
    ] as const) {
      configureRound(s, 'progression', level);
      expect(progressionReference(s)).toMatchObject({
        distance,
        goal,
        target: '80 cm',
      });
    }
  });
  it('locks the selected preset and rejects inconsistent targets or overfilled rounds', async () => {
    const db = createDB();
    const s = round('progression');
    recordArrow(s, '8');
    expect(() => configureRound(s, 'beursault-10')).toThrow();
    await expect(db.saveSession({ ...s, distance: 25 })).rejects.toThrow();
    const full = round('progression');
    full.ends = Array.from({ length: 7 }, () => Array(6).fill('8'));
    full.arrows = 42;
    await expect(db.saveSession(full)).rejects.toThrow();
  });
  it('migrates existing durations and scores without starting a timer or guessing a preset', async () => {
    const name = crypto.randomUUID();
    const old = new Dexie(name);
    databases.push(old);
    old
      .version(3)
      .stores({ sessions: 'id, date, updatedAt, status', setups: 'id, name' });
    const s = newSession();
    s.duration = 15;
    s.ends = [['X', '9']];
    s.arrows = 2;
    const {
      timerElapsedMs: _,
      timerStartedAt: __,
      round: ___,
      progressionLevel: ____,
      ...legacy
    } = s;
    await old.table('sessions').put(legacy);
    old.close();
    const db = createDB(name);
    expect(await db.sessions.get(s.id)).toMatchObject({
      ...legacy,
      round: 'free',
      timerElapsedMs: 900000,
      timerStartedAt: null,
    });
  });
});
