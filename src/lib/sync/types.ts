import type { Session, Setup } from '../model';
export type RecordKind = 'session' | 'setup';
export type TrainingRecord = Session | Setup;
export type CloudRecord = {
  user_id: string;
  kind: RecordKind;
  record_id: string;
  payload: TrainingRecord;
  version: number;
  mutation_id: string;
};
export type PendingWrite = {
  mutationId: string;
  payload: TrainingRecord;
  localRevision: number;
};
export type SyncState = {
  key: string;
  kind: RecordKind;
  id: string;
  version: number;
  dirty: boolean;
  inflight?: PendingWrite;
  conflict?: CloudRecord;
};
export const recordKey = (kind: RecordKind, id: string) => `${kind}:${id}`;
export function accountDatabaseName(project: string, userId: string | null) {
  return `rainbow-account-v1:${encodeURIComponent(project)}:${userId ?? 'guest'}`;
}
