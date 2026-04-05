/**
 * Composable for managing SEO metadata with i18n support
 * Handles meta tags, OG tags, and structured data
 */
export const useSeoMetaWithI18n = (options: {
  title: string | (() => string);
  description: string | (() => string);
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, any>;
}) => {
  const { t } = useI18n();
  const route = useRoute();

  const title = typeof options.title === 'function' ? options.title() : options.title;
  const description = typeof options.description === 'function' ? options.description() : options.description;
  const keywords = options.keywords || '';
  const ogImage = options.ogImage || '/og-image.png';
  const ogType = options.ogType || 'website';
  const canonicalUrl = options.canonicalUrl || `https://schul-dashboard.com${route.path}`;

  useSeoMeta({
    title,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogType,
    ogUrl: canonicalUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: ogImage,
  });

  useHead({
    link: [
      {
        rel: 'canonical',
        href: canonicalUrl,
      },
    ],
  });

  // Add structured data if provided
  if (options.structuredData) {
    useHead({
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(options.structuredData),
        },
      ],
    });
  }
};
