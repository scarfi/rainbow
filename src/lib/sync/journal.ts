import { liveQuery } from 'dexie';
import type { TrainingDB } from '../db';
import { configuration, getAuthClient } from '../auth/client';
import type { Session, Setup } from '../model';
import { syncOnce } from './engine';
import { cloudRemote } from './remote';
import type { SyncState } from './types';
import type { MessageKey } from '../i18n';

export function watchJournal(
  db: TrainingDB,
  userId: string | null,
  callbacks: {
    data: (sessions: Session[], setups: Setup[], states: SyncState[]) => void;
    status: (message: MessageKey, syncing: boolean) => void;
    error: (error: unknown) => void;
  },
) {
  let stopped = false,
    running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = new AbortController();
  const active = () => !stopped;
  let rerun = false;
  let retryDelay = 5000;
  async function run() {
    timer = undefined;
    if (stopped || !userId || !configuration) return;
    if (running) {
      rerun = true;
      return;
    }
    if (!navigator.onLine) {
      callbacks.status('Offline. Changes will sync when connected.', false);
      return;
    }
    running = true;
    callbacks.status('Syncing…', true);
    try {
      const client = await getAuthClient();
      if (!active()) return;
      const remote = cloudRemote(
        client,
        configuration.url,
        configuration.key,
        userId,
        abort.signal,
      );
      await syncOnce(db, remote, userId, active);
      if (!active()) return;
      const states = await db.syncState.toArray();
      retryDelay = 5000;
      if (states.some((state) => state.dirty && !state.conflict)) rerun = true;
      callbacks.status(
        states.some((state) => state.conflict)
          ? 'Conflicting edits need review.'
          : states.some((state) => state.dirty)
            ? 'Changes waiting to sync.'
            : 'Synced to your account',
        false,
      );
    } catch (cause) {
      rerun = false;
      if (
        active() &&
        navigator.onLine &&
        document.visibilityState === 'visible'
      ) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void run(), retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60000);
      }
      if (active())
        callbacks.status(
          cause instanceof Error && cause.message === 'Sign in again to sync.'
            ? 'Sign in again to sync.'
            : 'Sync failed. Your changes are saved on this device.',
          false,
        );
    } finally {
      running = false;
      if (rerun && active()) {
        rerun = false;
        schedule();
      }
    }
  }
  function schedule() {
    if (timer) clearTimeout(timer);
    if (!stopped && userId) timer = setTimeout(() => void run(), 1000);
  }
  const subscription = liveQuery(async () => ({
    sessions: await db.sessions.orderBy('date').reverse().toArray(),
    setups: await db.setups.orderBy('name').toArray(),
    states: await db.syncState.toArray(),
  })).subscribe({
    next: ({ sessions, setups, states }) => {
      if (stopped) return;
      callbacks.data(sessions, setups, states);
      if (states.some((state) => state.dirty && !state.conflict)) schedule();
    },
    error: (error) => {
      if (active()) callbacks.error(error);
    },
  });
  const resume = () => {
    if (document.visibilityState === 'visible') schedule();
  };
  window.addEventListener('online', schedule);
  document.addEventListener('visibilitychange', resume);
  schedule();
  return {
    sync: schedule,
    stop() {
      stopped = true;
      abort.abort();
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
      window.removeEventListener('online', schedule);
      document.removeEventListener('visibilitychange', resume);
    },
  };
}
