import { createI18n } from 'vue-i18n';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';

export const LOCALE_KEY = 'user-locale';
export const SUPPORTED_LOCALES = ['de', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function getInitialLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY) as SupportedLocale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
    const browser = navigator.language?.split('-')[0] as SupportedLocale;
    if (SUPPORTED_LOCALES.includes(browser)) return browser;
  } catch {}
  return 'de';
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'de',
  messages: { de, en },
});

export default i18n;
