import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { TrainingDB } from '../src/lib/db';
import { newSession, type Setup } from '../src/lib/model';
import { prepareWrite, receiveRecord, keepBoth } from '../src/lib/sync/local';
import { syncOnce } from '../src/lib/sync/engine';
import {
  accountDatabaseName,
  recordKey,
  type CloudRecord,
  type SyncState,
} from '../src/lib/sync/types';
import type { SyncRemote } from '../src/lib/sync/remote';
const databases: TrainingDB[] = [];
function database() {
  const db = new TrainingDB(crypto.randomUUID());
  databases.push(db);
  return db;
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
function server() {
  const records = new Map<string, CloudRecord>();
  const remote: SyncRemote = {
    async push(state: SyncState) {
      const current = records.get(state.key);
      if (
        current &&
        (current.mutation_id === state.inflight!.mutationId ||
          current.version !== state.version)
      )
        return structuredClone(current);
      const record = {
        user_id: 'archer-a',
        kind: state.kind,
        record_id: state.id,
        version: (current?.version ?? 0) + 1,
        mutation_id: state.inflight!.mutationId,
        payload: structuredClone(state.inflight!.payload),
      };
      records.set(state.key, record);
      return structuredClone(record);
    },
    async *pull() {
      yield [...records.values()].map((row) => structuredClone(row));
    },
  };
  return { remote, records };
}
describe('offline account synchronization', () => {
  it('atomically queues sessions and equipment and transfers them to another device', async () => {
    const desktop = database(),
      phone = database(),
      { remote } = server();
    const session = await desktop.saveSession(newSession());
    const setup: Setup = {
      id: crypto.randomUUID(),
      name: 'My bow',
      bowType: 'Barebow',
      notes: '',
      revision: 0,
      updatedAt: new Date().toISOString(),
    };
    await desktop.saveSetup(setup);
    expect(await desktop.syncState.count()).toBe(2);
    await syncOnce(desktop, remote, 'archer-a');
    await syncOnce(phone, remote, 'archer-a');
    expect((await phone.sessions.get(session.id))?.title).toBe(session.title);
    expect((await phone.setups.get(setup.id))?.name).toBe(setup.name);
    expect(
      (await desktop.syncState.toArray()).every((item) => !item.dirty),
    ).toBe(true);
  });
  it('retries the same mutation after the server commits but the response is lost', async () => {
    const db = database(),
      { remote, records } = server();
    const session = await db.saveSession(newSession());
    const state = (await prepareWrite(db, recordKey('session', session.id)))!;
    await remote.push(state);
    db.close();
    await db.open();
    await syncOnce(db, remote, 'archer-a');
    expect(records.size).toBe(1);
    expect(records.get(state.key)?.version).toBe(1);
    expect((await db.syncState.get(state.key))?.dirty).toBe(false);
  });
  it('keeps newer edits queued when an older upload completes', async () => {
    const db = database(),
      { remote } = server();
    const original = await db.saveSession(newSession());
    const key = recordKey('session', original.id);
    const request = (await prepareWrite(db, key))!;
    await db.saveSession({ ...original, notes: 'New note during upload' });
    await receiveRecord(db, await remote.push(request), 'archer-a');
    expect((await db.syncState.get(key))?.dirty).toBe(true);
    await syncOnce(db, remote, 'archer-a');
    expect((await db.sessions.get(original.id))?.notes).toBe(
      'New note during upload',
    );
    expect((await db.syncState.get(key))?.version).toBe(2);
  });
  it('retains conflicting edits and resolves them by keeping both versions', async () => {
    const first = database(),
      second = database(),
      { remote } = server();
    const original = await first.saveSession(newSession());
    await syncOnce(first, remote, 'archer-a');
    await syncOnce(second, remote, 'archer-a');
    await first.saveSession({
      ...(await first.sessions.get(original.id))!,
      notes: 'Desktop edit',
    });
    await second.saveSession({
      ...(await second.sessions.get(original.id))!,
      notes: 'Phone edit',
    });
    await syncOnce(first, remote, 'archer-a');
    await syncOnce(second, remote, 'archer-a');
    const key = recordKey('session', original.id);
    expect((await second.syncState.get(key))?.conflict?.payload.notes).toBe(
      'Desktop edit',
    );
    expect((await second.sessions.get(original.id))?.notes).toBe('Phone edit');
    await keepBoth(second, key);
    await syncOnce(second, remote, 'archer-a');
    await syncOnce(first, remote, 'archer-a');
    expect((await first.sessions.toArray()).map((s) => s.notes).sort()).toEqual(
      ['Desktop edit', 'Phone edit'],
    );
    expect(
      (await first.sessions.toArray()).find((s) => s.notes === 'Phone edit')
        ?.conflictOf,
    ).toBe(original.id);
  });
  it('rejects another account and separates project, guest, and account caches', async () => {
    const db = database(),
      { remote } = server();
    const session = await db.saveSession(newSession());
    const request = (await prepareWrite(db, recordKey('session', session.id)))!;
    await expect(
      receiveRecord(db, await remote.push(request), 'archer-b'),
    ).rejects.toThrow('Invalid cloud record');
    expect(
      new Set([
        accountDatabaseName('p', null),
        accountDatabaseName('p', 'a'),
        accountDatabaseName('p', 'b'),
        accountDatabaseName('q', 'a'),
      ]).size,
    ).toBe(4);
  });
  it('retains local data and a queued request on network failure', async () => {
    const db = database(),
      { remote } = server();
    const session = await db.saveSession(newSession());
    remote.push = async () => {
      throw new Error('offline');
    };
    await expect(syncOnce(db, remote, 'archer-a')).rejects.toThrow('offline');
    expect(await db.sessions.get(session.id)).toEqual(session);
    expect((await db.syncState.toArray())[0].inflight).toBeDefined();
  });
  it('ignores duplicate or stale cloud records without invalidating an open editor', async () => {
    const db = database(),
      { remote } = server();
    const saved = await db.saveSession(newSession());
    await syncOnce(db, remote, 'archer-a');
    await syncOnce(db, remote, 'archer-a');
    expect((await db.sessions.get(saved.id))?.revision).toBe(saved.revision);
    await expect(
      db.saveSession({ ...saved, notes: 'Still editable' }),
    ).resolves.toBeDefined();
  });
});
