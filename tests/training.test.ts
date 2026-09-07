import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { TrainingDB, ConflictError } from '../src/lib/db';
import { newSession, total, type Setup } from '../src/lib/model';
import { en } from '../src/lib/i18n/en';
import { fr } from '../src/lib/i18n/fr';
import { translate } from '../src/lib/i18n';

const databases: TrainingDB[] = [];
function database(name = crypto.randomUUID()) {
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

describe('offline training durability', () => {
  it('restores a draft, notes and an unfinished end after closing the database', async () => {
    const name = crypto.randomUUID();
    const first = database(name);
    const session = newSession();
    session.title = 'Au club';
    session.notes = 'Travailler le lâcher';
    session.pendingEnd = ['X', '8'];
    const saved = await first.saveSession(session);
    first.close();
    const reopened = database(name);
    expect(await reopened.sessions.get(saved.id)).toEqual(saved);
  });
  it('rejects a stale write from a second tab without losing the accepted revision', async () => {
    const db = database();
    const original = await db.saveSession(newSession());
    const newer = await db.saveSession({ ...original, notes: 'First tab' });
    await expect(
      db.saveSession({ ...original, notes: 'Second tab' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await db.sessions.get(original.id)).toEqual(newer);
  });
  it('allows only one winner for simultaneous saves with the same revision', async () => {
    const db = database();
    const original = await db.saveSession(newSession());
    const results = await Promise.allSettled([
      db.saveSession({ ...original, notes: 'A' }),
      db.saveSession({ ...original, notes: 'B' }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(await db.sessions.count()).toBe(1);
  });
  it('keeps an equipment snapshot when the setup later changes', async () => {
    const db = database();
    const setup: Setup = {
      id: crypto.randomUUID(),
      name: 'Outdoor recurve',
      bowType: 'Recurve',
      notes: '28 lb',
      updatedAt: new Date().toISOString(),
      revision: 0,
    };
    const savedSetup = await db.saveSetup(setup);
    const savedSession = await db.saveSession({
      ...newSession(),
      setup: savedSetup,
    });
    await db.saveSetup({ ...savedSetup, notes: '30 lb' });
    expect((await db.sessions.get(savedSession.id))?.setup?.notes).toBe(
      '28 lb',
    );
  });
  it('does not replace a saved session when validation fails', async () => {
    const db = database();
    const original = await db.saveSession(newSession());
    await expect(db.saveSession({ ...original, arrows: -1 })).rejects.toThrow();
    expect(await db.sessions.get(original.id)).toEqual(original);
  });
  it('rejects impossible dates and invalid arrow scores', async () => {
    const db = database();
    await expect(
      db.saveSession({ ...newSession(), date: '2026-02-30' }),
    ).rejects.toThrow();
    await expect(
      db.saveSession({ ...newSession(), ends: [['11']], arrows: 1 }),
    ).rejects.toThrow();
    await expect(
      db.saveSession({ ...newSession(), pendingEnd: Array(7).fill('10') }),
    ).rejects.toThrow();
    await expect(
      db.saveSession({ ...newSession(), ends: [['10']], arrows: 0 }),
    ).rejects.toThrow();
    expect(await db.sessions.count()).toBe(0);
  });
  it('exports completed and draft sessions together with setups', async () => {
    const db = database();
    await db.saveSession(newSession());
    await db.saveSession({
      ...newSession(),
      status: 'completed',
      ends: [['X', '9', 'M']],
      arrows: 3,
    });
    const backup = await db.backup();
    expect(backup.schemaVersion).toBe(2);
    expect(backup.sessions).toHaveLength(2);
    expect(
      total(backup.sessions.find((s) => s.status === 'completed')!.ends),
    ).toBe(19);
  });
});

describe('translation catalogs', () => {
  it('has matching, nonempty English and French keys', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    for (const value of Object.values(fr))
      expect(value.trim().length).toBeGreaterThan(0);
  });
  it('translates bow labels without changing stable bow values', () => {
    expect(translate('fr', 'Compound')).toBe('Arc à poulies');
    expect(translate('en', 'Compound')).toBe('Compound');
  });
  it('preserves interpolation placeholders in translations', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(fr[key].match(/\{\w+\}/g) ?? []).toEqual(
        en[key].match(/\{\w+\}/g) ?? [],
      );
    }
  });
});
