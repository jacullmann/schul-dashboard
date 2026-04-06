export const useSeoMetaWithI18n = (options: {
  title: string | (() => string);
  description: string | (() => string);
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown>;
}) => {
  const route = useRoute();

  const title = typeof options.title === 'function' ? options.title() : options.title;
  const description =
    typeof options.description === 'function' ? options.description() : options.description;
  const ogImage = options.ogImage || 'https://schul-dashboard.com/og-image.png';
  const canonicalUrl = options.canonicalUrl || `https://schul-dashboard.com${route.path}`;

  useSeoMeta({
    title,
    description,
    keywords: options.keywords,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogType: options.ogType || 'website',
    ogUrl: canonicalUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: ogImage,
  });

  useHead({
    link: [{ rel: 'canonical', href: canonicalUrl }],
  });

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
