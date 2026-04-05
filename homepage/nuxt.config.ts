export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  ssr: true,

  modules: [
    '@vueuse/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@nuxtjs/sitemap',
    '@nuxtjs/i18n',
  ],

  colorMode: {
    preference: 'system',
    fallback: 'dark',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '',
    storage: 'cookie',
    storageKey: 'nuxt-homepage-color-mode',
    cookieAttrs: {
      'max-age': '31536000',
      path: '/',
      sameSite: 'lax',
    }
  },

  i18n: {
    lazy: true,
    langDir: '../locales',
    defaultLocale: 'en',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
    ],
    strategy: 'prefix_except_default',
    vueI18n: './i18n.config.ts',
    customRoutes: 'config',
    pages: {
      index: {
        en: '/',
        de: '/',
      },
      features: {
        en: '/features',
        de: '/vorteile',
      },
      pricing: {
        en: '/pricing',
        de: '/preise',
      },
      about: {
        en: '/about',
        de: '/uber-uns',
      },
      contact: {
        en: '/contact',
        de: '/kontakt',
      },
      'legal-imprint': {
        en: '/legal/imprint',
        de: '/legal/impressum',
      },
      'legal-privacy-policy': {
        en: '/legal/privacy-policy',
        de: '/legal/datenschutz',
      },
      'legal-terms': {
        en: '/legal/terms',
        de: '/legal/nutzungsbedingungen',
      },
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root'
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'schul-dashboard – The collaborative school management system',
      meta: [
        { name: 'description', content: 'schul-dashboard is the free, ad-free school management system for students. Developed by students for students. Homework, timetable, and more – all in one place.' },
        { name: 'keywords', content: 'School Dashboard, School Management, Homework, Timetable, Student App, School Administration, free, by students for students' },
        { name: 'author', content: 'schul-dashboard' },
        { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
        { name: 'language', content: 'en' },
        { name: 'revisit-after', content: '7 days' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://schul-dashboard.com' },
        { property: 'og:title', content: 'schul-dashboard – Free School Management for Students' },
        { property: 'og:description', content: 'The collaborative school management system. Developed by students for students.' },
        { property: 'og:image', content: 'https://schul-dashboard.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:site_name', content: 'schul-dashboard' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:url', content: 'https://schul-dashboard.com' },
        { name: 'twitter:title', content: 'schul-dashboard – Free School Management' },
        { name: 'twitter:description', content: 'The collaborative school dashboard by students for students.' },
        { name: 'twitter:image', content: 'https://schul-dashboard.com/og-image.png' },
        { name: 'theme-color', content: '#0f0f0f' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'google-site-verification', content: 'EWIYTbU2hlYorTqIulVfAyKjArTsWmgQ9O9g0Tb0L8c' },
      ],
      link: [
        { rel: 'canonical', href: 'https://schul-dashboard.com' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Noto+Serif:wght@400;500&display=swap',
        },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                '@id': 'https://schul-dashboard.com/#website',
                'url': 'https://schul-dashboard.com',
                'name': 'schul-dashboard',
                'description': 'The collaborative school management system for students',
                'inLanguage': 'en-US',
              },
              {
                '@type': 'WebApplication',
                '@id': 'https://schul-dashboard.com/#webapp',
                'url': 'https://schul-dashboard.com',
                'name': 'schul-dashboard',
                'description': 'The free school management system by students for students',
                'applicationCategory': 'EducationalApplication',
                'inLanguage': 'en-US',
                'operatingSystem': 'Web',
                'offers': {
                  '@type': 'Offer',
                  'price': '0',
                  'priceCurrency': 'EUR',
                },
                'author': {
                  '@type': 'Organization',
                  'name': 'schul-dashboard',
                  'url': 'https://schul-dashboard.com',
                },
              },
              {
                '@type': 'Organization',
                '@id': 'https://schul-dashboard.com/#organization',
                'name': 'schul-dashboard',
                'url': 'https://schul-dashboard.com',
                'logo': 'https://schul-dashboard.com/schul-dashboard_logo.svg',
                'description': 'Free school administration by students for students',
              },
            ],
          }),
        },
      ],
    },
  },

  sitemap: {
    enabled: true,
    urls: [
      { loc: 'https://schul-dashboard.com', priority: 1.0, changefreq: 'weekly' },
      { loc: 'https://schul-dashboard.com/features', priority: 0.9, changefreq: 'monthly' },
      { loc: 'https://schul-dashboard.com/pricing', priority: 0.9, changefreq: 'monthly' },
      { loc: 'https://schul-dashboard.com/about', priority: 0.8, changefreq: 'monthly' },
      { loc: 'https://schul-dashboard.com/contact', priority: 0.7, changefreq: 'monthly' },
      { loc: 'https://schul-dashboard.com/legal/imprint', priority: 0.3, changefreq: 'yearly' },
      { loc: 'https://schul-dashboard.com/legal/privacy-policy', priority: 0.3, changefreq: 'yearly' },
      { loc: 'https://schul-dashboard.com/legal/terms', priority: 0.3, changefreq: 'yearly' },
      { loc: 'https://schul-dashboard.com/de/vorteile', priority: 0.9, changefreq: 'monthly' },
      { loc: 'https://schul-dashboard.com/de/preise', priority: 0.9, changefreq: 'monthly' },
      { loc: 'https://schul-dashboard.com/de/uber-uns', priority: 0.8, changefreq: 'monthly' },
      { loc: 'https://schul-dashboard.com/de/kontakt', priority: 0.7, changefreq: 'monthly' },
      { loc: 'https://schul-dashboard.com/de/legal/impressum', priority: 0.3, changefreq: 'yearly' },
      { loc: 'https://schul-dashboard.com/de/legal/datenschutz', priority: 0.3, changefreq: 'yearly' },
      { loc: 'https://schul-dashboard.com/de/legal/nutzungsbedingungen', priority: 0.3, changefreq: 'yearly' },
    ],
    sitemaps: true,
  },

  runtimeConfig: {
    public: {
      loginUrl: '',
      appUrl: '',
      hwApiBase: '',
    },
  },

  devServer: {
    host: '0.0.0.0',
    port: 3001,
  },
})


