import type { SupabaseClient } from '@supabase/supabase-js';

export type AccountMode = 'signin' | 'signup' | 'reset' | 'password';

/** Authentication only. Local training is never read, transferred, or cleared here. */
export async function accountAction(
  client: Pick<SupabaseClient, 'auth'>,
  mode: AccountMode,
  email: string,
  password: string,
  redirectTo: string,
) {
  if (mode === 'signin') {
    const result = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (result.error) throw result.error;
    return result.data.session;
  }
  if (mode === 'signup') {
    const result = await client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (result.error) throw result.error;
    return result.data.session;
  }
  if (mode === 'reset') {
    const result = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (result.error) throw result.error;
    return null;
  }
  const result = await client.auth.updateUser({ password });
  if (result.error) throw result.error;
  return null;
}

export async function signOutOnDevice(client: Pick<SupabaseClient, 'auth'>) {
  const result = await client.auth.signOut({ scope: 'local' });
  if (result.error) throw result.error;
}
