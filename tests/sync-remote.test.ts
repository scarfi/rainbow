import { afterEach, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cloudRemote } from '../src/lib/sync/remote';
import { newSession } from '../src/lib/model';
const token = 'test-token-placeholder';
function client(id: string) {
  return {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id }, access_token: token } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}
afterEach(() => vi.unstubAllGlobals());
it('rejects an account switch before issuing any request', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const remote = cloudRemote(
    client('b'),
    'https://example.supabase.co',
    'sb_publishable_example',
    'a',
    new AbortController().signal,
  );
  await expect(remote.pull()[Symbol.asyncIterator]().next()).rejects.toThrow(
    'Sign in again',
  );
  expect(fetch).not.toHaveBeenCalled();
});
it('sends a fixed account token and version precondition without a supplied owner field', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetch);
  const payload = newSession();
  const remote = cloudRemote(
    client('a'),
    'https://example.supabase.co',
    'sb_publishable_example',
    'a',
    new AbortController().signal,
  );
  await remote.push({
    key: 'session:' + payload.id,
    kind: 'session',
    id: payload.id,
    version: 7,
    dirty: true,
    inflight: { payload, localRevision: 1, mutationId: 'mutation' },
  });
  const args = fetch.mock.calls[0][1];
  expect(args.headers.Authorization).toBe('Bearer ' + token);
  expect(JSON.parse(args.body)).toMatchObject({
    p_expected_version: 7,
    p_mutation_id: 'mutation',
  });
  expect(JSON.parse(args.body)).not.toHaveProperty('user_id');
});
it('stops aborted workers and paginates reads beyond one page', async () => {
  const fetch = vi
    .fn()
    .mockImplementationOnce(
      async () => new Response(JSON.stringify(Array(100).fill({}))),
    )
    .mockImplementationOnce(async () => new Response('[]'));
  vi.stubGlobal('fetch', fetch);
  const abort = new AbortController();
  const remote = cloudRemote(
    client('a'),
    'https://example.supabase.co',
    'sb_publishable_example',
    'a',
    abort.signal,
  );
  const pages = [];
  for await (const page of remote.pull()) pages.push(page);
  expect(pages.map((p) => p.length)).toEqual([100, 0]);
  expect(fetch.mock.calls[1][0]).toContain('offset=100');
  abort.abort();
  await expect(remote.pull()[Symbol.asyncIterator]().next()).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(2);
});
