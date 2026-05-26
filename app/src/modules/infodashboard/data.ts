import type { Article } from '@/modules/infodashboard/types';

export const articles: Article[] = [
  {
    id: 1,
    type: 'text',
    titleKey: 'infodashboard.articles.1.title',
    excerptKey: 'infodashboard.articles.1.excerpt',
    contentKey: 'infodashboard.articles.1.content',
    author: 'Herbert Fischer',
    date: '2026-01-09',
    readTime: 2,
    topic: 'politics',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/5/53/Berlin-kreuzberg_goerlitzer-park_20050923_527.jpg',
    imageAttribution: 'Georg Slickers, CC BY-SA 2.5, via Wikimedia Commons',
  },
];
