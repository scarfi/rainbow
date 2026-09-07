import Dexie, { type Table } from 'dexie';
import {
  validateSession,
  bowTypes,
  hasScores,
  type Session,
  type Setup,
} from './model';
export class ConflictError extends Error {
  constructor() {
    super(
      'This entry changed in another tab. Your edits are still here. Export them before reloading the saved version.',
    );
  }
}
export class TrainingDB extends Dexie {
  sessions!: Table<Session, string>;
  setups!: Table<Setup, string>;
  constructor(name = 'rainbow-training') {
    super(name);
    this.version(1).stores({
      sessions: 'id, date, updatedAt, status',
      setups: 'id, name',
    });
    this.version(2)
      .stores({ sessions: 'id, date, updatedAt, status', setups: 'id, name' })
      .upgrade((transaction) =>
        transaction
          .table('sessions')
          .toCollection()
          .modify((session) => {
            session.pendingEnd ??= [];
          }),
      );
    this.version(3)
      .stores({ sessions: 'id, date, updatedAt, status', setups: 'id, name' })
      .upgrade((transaction) =>
        transaction
          .table('sessions')
          .toCollection()
          .modify((session) => {
            // Prior free-text target names never implied a different scoring system.
            session.scoringFormat = 'ten-zone';
          }),
      );
  }
  async saveSession(input: Session): Promise<Session> {
    const data: Session = JSON.parse(JSON.stringify(input));
    validateSession(data);
    return this.transaction('rw', this.sessions, async () => {
      const previous = await this.sessions.get(data.id);
      if ((previous?.revision ?? 0) !== data.revision)
        throw new ConflictError();
      if (
        previous &&
        (previous.scoringFormat !== data.scoringFormat ||
          previous.target !== data.target) &&
        hasScores(previous)
      ) {
        throw new Error('Start a new session to change the target face.');
      }
      data.revision++;
      data.updatedAt = new Date().toISOString();
      await this.sessions.put(data);
      return data;
    });
  }
  async saveSetup(input: Setup): Promise<Setup> {
    const data: Setup = JSON.parse(JSON.stringify(input));
    data.name = data.name.trim();
    if (!data.name || !bowTypes.includes(data.bowType))
      throw new Error('Give your setup a name and bow type.');
    return this.transaction('rw', this.setups, async () => {
      const previous = await this.setups.get(data.id);
      if ((previous?.revision ?? 0) !== data.revision)
        throw new ConflictError();
      data.revision++;
      data.updatedAt = new Date().toISOString();
      await this.setups.put(data);
      return data;
    });
  }
  async backup() {
    return this.transaction('r', this.sessions, this.setups, async () => ({
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      sessions: await this.sessions.toArray(),
      setups: await this.setups.toArray(),
    }));
  }
}
export const db = new TrainingDB();
