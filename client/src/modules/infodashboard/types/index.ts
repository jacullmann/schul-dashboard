export interface Article {
  id: number;
  type: 'text' | 'video';
  titleKey: string;
  excerptKey: string;
  contentKey?: string;
  videoUrl?: string;
  duration?: string;
  author: string;
  date: string;
  readTime: number;
  topic: 'technology' | 'politics' | 'science' | 'culture' | 'economy';
  imageUrl: string;
  imageAttribution?: string;
  recommendedIds?: number[];
}

export type SortOption = 'relevance' | 'dateDesc' | 'dateAsc' | 'readTime';
export type ViewState = 'home' | 'search' | 'article';
