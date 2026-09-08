import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authConfig } from '../src/lib/auth/config';
import { authError } from '../src/lib/auth/errors';
import { accountAction, signOutOnDevice } from '../src/lib/auth/actions';
import { en } from '../src/lib/i18n/en';
import { fr } from '../src/lib/i18n/fr';

function mockClient() {
  const auth = {
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'archer' } } },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  return { auth, client: { auth } as unknown as SupabaseClient };
}
const callback = 'https://scarfi.github.io/rainbow/';
const password = 'test-only-placeholder';
describe('account access', () => {
  it('requires HTTPS project URLs and publishable keys, never privileged keys', () => {
    const url = 'https://example.supabase.co';
    expect(authConfig(url, 'sb_publishable_example')?.url).toBe(url);
    for (const key of [undefined, '', 'sb_secret_example', 'eyJlegacy'])
      expect(authConfig(url, key)).toBeNull();
    for (const bad of [
      'http://example.supabase.co',
      'https://example.supabase.co.attacker.test',
      'https://user:pass@example.supabase.co',
      'https://example.supabase.co?x=1',
    ])
      expect(authConfig(bad, 'sb_publishable_example')).toBeNull();
  });
  it('returns the authenticated session and preserves password whitespace', async () => {
    const { client, auth } = mockClient();
    const result = await accountAction(
      client,
      'signin',
      ' archer@example.test ',
      ` ${password} `,
      callback,
    );
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'archer@example.test',
      password: ` ${password} `,
    });
    expect(result?.user.id).toBe('archer');
  });
  it('does not treat an unconfirmed signup as a logged-in session', async () => {
    const { client, auth } = mockClient();
    expect(
      await accountAction(
        client,
        'signup',
        'archer@example.test',
        password,
        callback,
      ),
    ).toBeNull();
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'archer@example.test',
      password,
      options: { emailRedirectTo: callback },
    });
  });
  it('uses the deployed app path for reset emails and sends only the new password on update', async () => {
    const { client, auth } = mockClient();
    await accountAction(client, 'reset', 'archer@example.test', '', callback);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'archer@example.test',
      { redirectTo: callback },
    );
    await accountAction(client, 'password', '', password, callback);
    expect(auth.updateUser).toHaveBeenCalledWith({ password });
  });
  it('signs out only this device and propagates failure for retry', async () => {
    const { client, auth } = mockClient();
    await signOutOnDevice(client);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    auth.signOut.mockResolvedValue({ error: { code: 'network_failure' } });
    await expect(signOutOnDevice(client)).rejects.toEqual({
      code: 'network_failure',
    });
  });
  it('does not report success for rejected credentials and translates safe error messages', async () => {
    const { client, auth } = mockClient();
    const error = {
      code: 'invalid_credentials',
      message: 'sensitive raw provider response',
    };
    auth.signInWithPassword.mockResolvedValue({
      error,
      data: { session: null },
    });
    await expect(
      accountAction(client, 'signin', '', password, callback),
    ).rejects.toEqual(error);
    expect(authError(error)).toBe('Email or password is incorrect.');
    expect(authError(new Error('private detail'))).not.toContain(
      'private detail',
    );
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });
});
