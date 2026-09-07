import { en } from './en';
import { fr } from './fr';
export type Locale = 'en' | 'fr';
export type MessageKey = keyof typeof en;
export function isMessage(value: string): value is MessageKey {
  return Object.hasOwn(en, value);
}
export function translate(locale: Locale, key: MessageKey): string {
  return locale === 'fr' ? fr[key] : en[key];
}
