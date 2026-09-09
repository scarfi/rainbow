import type { TrainingDB } from '../db';
import { prepareWrite, receiveRecord } from './local';
import type { SyncRemote } from './remote';

/** No network work runs inside local save transactions. */
export async function syncOnce(
  db: TrainingDB,
  remote: SyncRemote,
  userId: string,
  active = () => true,
) {
  for (const item of await db.syncState.toArray()) {
    if (!active()) return;
    const pending = await prepareWrite(db, item.key);
    if (!pending || !active()) continue;
    const record = await remote.push(pending);
    if (!active()) return;
    await receiveRecord(db, record, userId);
  }
  for await (const rows of remote.pull()) {
    if (!active()) return;
    for (const record of rows) {
      if (!active()) return;
      await receiveRecord(db, record, userId);
    }
  }
}
