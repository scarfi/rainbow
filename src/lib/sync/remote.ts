import type { SupabaseClient } from '@supabase/supabase-js';
import type { CloudRecord, SyncState } from './types';
export interface SyncRemote {
  push(state: SyncState): Promise<CloudRecord>;
  pull(): AsyncIterable<CloudRecord[]>;
}

/** Capture the bearer token per request so an account switch can never retarget a write. */
export function cloudRemote(
  client: SupabaseClient,
  url: string,
  key: string,
  userId: string,
  signal: AbortSignal,
): SyncRemote {
  async function request(path: string, body?: unknown) {
    const result = await client.auth.getSession();
    if (result.error || result.data.session?.user.id !== userId)
      throw new Error('Sign in again to sync.');
    signal.throwIfAborted();
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${result.data.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401 || response.status === 403)
      throw new Error('Sign in again to sync.');
    if (!response.ok)
      throw new Error('Sync failed. Your changes are saved on this device.');
    return response.json();
  }
  return {
    push(state) {
      if (!state.inflight) throw new Error('Missing queued write');
      return request('rpc/rainbow_write_record', {
        p_kind: state.kind,
        p_record_id: state.id,
        p_payload: state.inflight.payload,
        p_expected_version: state.version,
        p_mutation_id: state.inflight.mutationId,
      });
    },
    async *pull() {
      for (let offset = 0; ; offset += 100) {
        const rows: CloudRecord[] = await request(
          `rainbow_records?select=*&user_id=eq.${encodeURIComponent(userId)}&order=kind.asc,record_id.asc&limit=100&offset=${offset}`,
        );
        if (!Array.isArray(rows)) throw new Error('Invalid cloud response');
        yield rows;
        if (rows.length < 100) break;
      }
    },
  };
}
