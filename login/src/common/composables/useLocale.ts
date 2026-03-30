import { useI18n } from 'vue-i18n';
import { watch } from 'vue';
import { SUPPORTED_LOCALES, LOCALE_KEY, type SupportedLocale } from '@/i18n';

export function useLocale() {
  const { locale, t, availableLocales } = useI18n();

  watch(
    locale,
    (newLocale) => {
      try {
        localStorage.setItem(LOCALE_KEY, newLocale);
        document.documentElement.setAttribute('lang', newLocale);
      } catch {}
    },
    { immediate: true },
  );

  function setLocale(newLocale: string) {
    if (SUPPORTED_LOCALES.includes(newLocale as SupportedLocale)) {
      locale.value = newLocale;
    }
  }

  return { locale, t, setLocale, availableLocales, supportedLocales: SUPPORTED_LOCALES };
}
