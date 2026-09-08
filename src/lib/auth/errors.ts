import type { MessageKey } from '$lib/i18n';

/** Map provider codes to translated copy without exposing raw responses or credentials. */
export function authError(error: unknown): MessageKey {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : '';
  switch (code) {
    case 'invalid_credentials':
      return 'Email or password is incorrect.';
    case 'email_not_confirmed':
      return 'Confirm your email before signing in.';
    case 'weak_password':
    case 'same_password':
      return 'Choose a stronger, different password.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many attempts. Please wait before trying again.';
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
      return 'This email link has expired or is invalid. Request a new one.';
    default:
      return 'Account request failed. Check your connection and try again.';
  }
}
