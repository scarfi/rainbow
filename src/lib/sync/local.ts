import type { TrainingDB } from '../db';
import { bowTypes, validateSession, type Session, type Setup } from '../model';
import { validateTraining } from '../training';
import {
  recordKey,
  type CloudRecord,
  type RecordKind,
  type TrainingRecord,
} from './types';

function table(db: TrainingDB, kind: RecordKind) {
  return db.table<TrainingRecord, string>(
    kind === 'session' ? 'sessions' : 'setups',
  );
}
export function validateCloud(record: CloudRecord, userId: string) {
  if (
    record.user_id !== userId ||
    !['session', 'setup'].includes(record.kind) ||
    !Number.isSafeInteger(record.version) ||
    record.version < 1 ||
    !record.payload ||
    record.record_id !== record.payload.id
  )
    throw new Error('Invalid cloud record');
  if (record.kind === 'session') {
    validateSession(record.payload as Session);
    validateTraining(record.payload as Session);
  } else {
    const setup = record.payload as Setup;
    if (
      typeof setup.name !== 'string' ||
      !setup.name.trim() ||
      typeof setup.notes !== 'string' ||
      !bowTypes.includes(setup.bowType)
    )
      throw new Error('Invalid cloud setup');
  }
}

/** Persist a stable request before sending. Retries reuse it even after further edits. */
export async function prepareWrite(db: TrainingDB, key: string) {
  return db.transaction(
    'rw',
    db.sessions,
    db.setups,
    db.syncState,
    async () => {
      const state = await db.syncState.get(key);
      if (!state?.dirty || state.conflict) return null;
      if (!state.inflight) {
        const payload = await table(db, state.kind).get(state.id);
        if (!payload) throw new Error('Missing local record');
        state.inflight = {
          payload,
          localRevision: payload.revision,
          mutationId: crypto.randomUUID(),
        };
        await db.syncState.put(state);
      }
      return state;
    },
  );
}

/** Acknowledge only the sent revision; edits made during upload remain queued. */
export async function receiveRecord(
  db: TrainingDB,
  record: CloudRecord,
  userId: string,
) {
  validateCloud(record, userId);
  return db.transaction(
    'rw',
    db.sessions,
    db.setups,
    db.syncState,
    async () => {
      const key = recordKey(record.kind, record.record_id);
      const state = await db.syncState.get(key);
      if (state && record.version <= state.version) return;
      const target = table(db, record.kind);
      const local = await target.get(record.record_id);
      if (state?.inflight?.mutationId === record.mutation_id) {
        await db.syncState.put({
          key,
          kind: record.kind,
          id: record.record_id,
          version: record.version,
          dirty: local?.revision !== state.inflight.localRevision,
        });
      } else if (state?.dirty) {
        await db.syncState.put({ ...state, conflict: record });
      } else {
        await target.put({
          ...record.payload,
          revision: (local?.revision ?? 0) + 1,
        });
        await db.syncState.put({
          key,
          kind: record.kind,
          id: record.record_id,
          version: record.version,
          dirty: false,
        });
      }
    },
  );
}

/** Keep local work under a new identity and restore the cloud version at its original identity. */
export async function keepBoth(db: TrainingDB, key: string) {
  return db.transaction(
    'rw',
    db.sessions,
    db.setups,
    db.syncState,
    async () => {
      const state = await db.syncState.get(key);
      if (!state?.conflict) return;
      const target = table(db, state.kind);
      const local = await target.get(state.id);
      if (!local) throw new Error('Missing conflicting record');
      const id = crypto.randomUUID();
      const copy = {
        ...local,
        id,
        revision: 1,
        updatedAt: new Date().toISOString(),
        conflictOf: state.id,
      };
      await target.put(copy);
      await db.syncState.put({
        key: recordKey(state.kind, id),
        kind: state.kind,
        id,
        version: 0,
        dirty: true,
      });
      await target.put({
        ...state.conflict.payload,
        revision: local.revision + 1,
      });
      await db.syncState.put({
        key,
        kind: state.kind,
        id: state.id,
        version: state.conflict.version,
        dirty: false,
      });
    },
  );
}
