import type { SupabaseClient } from '@supabase/supabase-js';
import { authConfig } from './config';

export const configuration = authConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
let client: Promise<SupabaseClient> | undefined;

/** Auth loads separately from training; it never reads or uploads the local journal. */
export function getAuthClient(): Promise<SupabaseClient> {
  if (!configuration)
    return Promise.reject(new Error('Account access is not configured yet.'));
  const config = configuration;
  client ??= import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'implicit',
        },
      }),
    )
    .catch((error) => {
      client = undefined;
      throw error;
    });
  return client;
}
