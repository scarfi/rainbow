/** Only browser-safe, modern publishable keys are accepted for this application. */
export function authConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      !parsed.hostname.endsWith('.supabase.co') ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    )
      return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
