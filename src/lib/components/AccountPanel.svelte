<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import type { Session, SupabaseClient } from '@supabase/supabase-js';
  import { configuration, getAuthClient } from '$lib/auth/client';
  import {
    accountAction,
    signOutOnDevice,
    type AccountMode,
  } from '$lib/auth/actions';
  import { authError } from '$lib/auth/errors';
  import type { MessageKey } from '$lib/i18n';
  let {
    t,
    online,
    open = $bindable(false),
    onbackup,
    loaded,
  }: {
    t: (key: MessageKey) => string;
    online: boolean;
    open?: boolean;
    onbackup: () => void;
    loaded: boolean;
  } = $props();
  let mode = $state<AccountMode>('signin');
  let session = $state<Session | null>(null);
  let client = $state.raw<SupabaseClient | undefined>();
  let loading = $state(!!configuration),
    busy = $state(false);
  let email = $state(''),
    password = $state(''),
    confirmation = $state('');
  let notice = $state<MessageKey | null>(null),
    error = $state<MessageKey | null>(null);
  const title = $derived(
    mode === 'signup'
      ? 'Create an account'
      : mode === 'reset'
        ? 'Reset password'
        : mode === 'password'
          ? 'Set a new password'
          : 'Sign in',
  );
  const needsPassword = $derived(mode !== 'reset');
  const newPassword = $derived(mode === 'signup' || mode === 'password');
  const recoveryKey = 'rainbow-password-recovery';

  function rememberRecovery(id: string | null) {
    try {
      if (id) sessionStorage.setItem(recoveryKey, id);
      else sessionStorage.removeItem(recoveryKey);
    } catch {
      /* Recovery still works in this visit. */
    }
  }
  function changeMode(next: AccountMode) {
    mode = next;
    password = '';
    confirmation = '';
    error = null;
    notice = null;
  }
  function applySession(value: Session | null) {
    session = value;
    if (!value) {
      rememberRecovery(null);
      if (mode === 'password') mode = 'signin';
    }
  }
  let disposed = false;
  let unsubscribe: (() => void) | undefined;
  async function initialize() {
    if (!configuration) return;
    loading = true;
    error = null;
    unsubscribe?.();
    const incoming = new URLSearchParams(location.hash.slice(1));
    const callback = incoming.has('access_token') || incoming.has('error');
    if (callback) open = true;
    if (incoming.has('error')) {
      error = 'This email link has expired or is invalid. Request a new one.';
      history.replaceState(
        history.state,
        '',
        `${location.pathname}${location.search}`,
      );
    }
    try {
      client = await getAuthClient();
      if (disposed) return;
      const { data } = client.auth.onAuthStateChange((event, value) => {
        if (disposed) return;
        applySession(value);
        if (event === 'PASSWORD_RECOVERY' && value) {
          rememberRecovery(value.user.id);
          mode = 'password';
          open = true;
        }
        if (event === 'SIGNED_OUT') {
          password = '';
          confirmation = '';
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const initialization = await client.auth.initialize();
      if (initialization.error) throw initialization.error;
      const result = await client.auth.getSession();
      if (disposed) return;
      if (result.error) throw result.error;
      applySession(result.data.session);
      try {
        if (
          session &&
          sessionStorage.getItem(recoveryKey) === session.user.id
        ) {
          mode = 'password';
          open = true;
        }
      } catch {
        /* Session storage may be unavailable. */
      }
      if (callback && !session && !error)
        error = 'This email link has expired or is invalid. Request a new one.';
    } catch (cause) {
      if (!disposed) error = authError(cause);
    } finally {
      if (callback)
        history.replaceState(
          history.state,
          '',
          `${location.pathname}${location.search}`,
        );
      if (!disposed) loading = false;
    }
  }
  onMount(() => {
    void initialize();
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  });

  async function submit() {
    if (!client || busy || !online) return;
    error = null;
    notice = null;
    if (newPassword && password !== confirmation) {
      error = 'Passwords do not match.';
      return;
    }
    busy = true;
    const redirectTo = `${location.origin}${base}/`;
    try {
      if (mode === 'password' && !session) throw new Error('Session required');
      const value = await accountAction(
        client,
        mode,
        email,
        password,
        redirectTo,
      );
      if (mode === 'signin' || mode === 'signup') applySession(value);
      if (mode === 'signup')
        notice =
          'Check your email to confirm your account. If you already have an account, sign in or reset your password.';
      if (mode === 'reset')
        notice =
          'If an account exists for this email, you will receive a password reset link.';
      if (mode === 'password') {
        rememberRecovery(null);
        mode = 'signin';
        notice = 'Password updated.';
      }
    } catch (cause) {
      error = authError(cause);
    } finally {
      busy = false;
      password = '';
      confirmation = '';
    }
  }
  async function signOut() {
    if (!client || busy || !online) return;
    busy = true;
    error = null;
    notice = null;
    try {
      await signOutOnDevice(client);
      applySession(null);
      changeMode('signin');
      email = '';
    } catch (cause) {
      error = authError(cause);
    } finally {
      busy = false;
    }
  }
</script>

<section
  id="account-panel"
  class="account-panel"
  hidden={!open}
  aria-labelledby="account-heading"
>
  <div class="section-title">
    <h2 id="account-heading">{t('Account')}</h2>
    <button class="secondary" onclick={() => (open = false)}
      >{t('Close account')}</button
    >
  </div>
  <p>
    {t(
      'Training stays in this browser. Signing in does not upload it or make it available on another device.',
    )}
  </p>
  <p class="field-hint">
    {t(
      'Anyone using this browser profile can access its local training, even after sign-out.',
    )}
  </p>
  {#if !online}<p role="status">
      {t(
        'Connect to the internet to manage your account. Offline training is still available.',
      )}
    </p>{/if}
  {#if error}<p class="error" role="alert">{t(error)}</p>{/if}
  {#if notice}<p role="status">{t(notice)}</p>{/if}
  {#if !configuration}<p>{t('Account access is not configured yet.')}</p>
  {:else if loading}<p role="status">{t('Loading account…')}</p>
  {:else if !client}<button
      class="secondary"
      disabled={!online}
      onclick={initialize}>{t('Retry account connection')}</button
    >
  {:else if session && mode !== 'password'}
    <p>{t('Signed in as')} <strong>{session.user.email}</strong></p>
    <button class="secondary" disabled={busy || !online} onclick={signOut}
      >{t('Sign out on this device')}</button
    >
  {:else}
    <form
      class="account-form"
      onsubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3>{t(title)}</h3>
      <fieldset disabled={busy || !online || !client}>
        {#if mode !== 'password'}<label
            >{t('Email')}<input
              type="email"
              autocomplete="email"
              required
              bind:value={email}
            /></label
          >{/if}
        {#if needsPassword}<label
            >{t(mode === 'password' ? 'New password' : 'Password')}<input
              type="password"
              autocomplete={newPassword ? 'new-password' : 'current-password'}
              minlength={newPassword ? 8 : undefined}
              required
              bind:value={password}
            /></label
          >{/if}
        {#if newPassword}<label
            >{t('Confirm password')}<input
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
              bind:value={confirmation}
            /></label
          >
          <p class="field-hint">
            {t(
              'Use at least 8 characters. Your account may require a stronger password.',
            )}
          </p>{/if}
        <button class="primary" type="submit"
          >{t(busy ? 'Please wait…' : title)}</button
        >
      </fieldset>
    </form>
    <div class="account-links">
      {#if mode !== 'signin' && mode !== 'password'}<button
          class="text-button"
          disabled={busy}
          onclick={() => changeMode('signin')}>{t('Sign in')}</button
        >{/if}
      {#if mode === 'signin'}<button
          class="text-button"
          disabled={busy}
          onclick={() => changeMode('signup')}>{t('Create an account')}</button
        ><button
          class="text-button"
          disabled={busy}
          onclick={() => changeMode('reset')}>{t('Forgot password?')}</button
        >{/if}
    </div>
  {/if}
  <details>
    <summary>{t('Local backup')}</summary>
    <p>{t('Download all training and equipment stored in this browser.')}</p>
    <button class="secondary" disabled={!loaded} onclick={onbackup}
      >{t('Export a backup')}</button
    >
  </details>
</section>
