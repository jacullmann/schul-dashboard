import { createI18n } from 'vue-i18n';
import de from '~/i18n/de';
import en from '~/i18n/en';

const LOCALE_KEY = 'user-locale';
const SUPPORTED = ['de', 'en'] as const;
type Locale = (typeof SUPPORTED)[number];

function getInitialLocale(): Locale {
  if (import.meta.server) return 'de';

  try {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (saved && SUPPORTED.includes(saved)) return saved;
    const browser = navigator.language?.split('-')[0] as Locale;
    if (SUPPORTED.includes(browser)) return browser;
  } catch {}
  return 'de';
}

export default defineNuxtPlugin((nuxtApp) => {
  const locale = getInitialLocale();

  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'de',
    messages: { de, en },
  });

  nuxtApp.vueApp.use(i18n);

  return {
    provide: {
      i18n,
      setLocale: (newLocale: string) => {
        if (!SUPPORTED.includes(newLocale as Locale)) return;
        i18n.global.locale.value = newLocale as Locale;
        try {
          localStorage.setItem(LOCALE_KEY, newLocale);
          document.documentElement.setAttribute('lang', newLocale);
        } catch {}
      },
      localeKey: LOCALE_KEY,
    },
  };
});
