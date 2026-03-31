import { createI18n } from 'vue-i18n';
import de from '~/i18n/de';
import en from '~/i18n/en';

const LOCALE_COOKIE = 'user-locale';
const SUPPORTED = ['de', 'en'] as const;
type Locale = (typeof SUPPORTED)[number];

export default defineNuxtPlugin((nuxtApp) => {
  const localeCookie = useCookie<Locale>(LOCALE_COOKIE, {
    default: () => 'de',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  const locale: Locale = SUPPORTED.includes(localeCookie.value) ? localeCookie.value : 'de';

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
        localeCookie.value = newLocale as Locale;
        if (import.meta.client) {
          document.documentElement.setAttribute('lang', newLocale);
        }
      },
      localeKey: LOCALE_COOKIE,
    },
  };
});
