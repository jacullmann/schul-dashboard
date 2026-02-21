export interface Article {
    id: number;
    type: 'text' | 'video';
    title: string;
    excerpt: string;
    contentKey?: string;
    videoUrl?: string;
    duration?: string;
    author: string;
    date: string;
    readTime: number;
    topic: 'Technologie' | 'Politik' | 'Wissenschaft' | 'Kultur' | 'Wirtschaft';
    imageUrl: string;
    imageAttribution?: string;
    recommendedIds?: number[];
}

export type SortOption = 'relevance' | 'dateDesc' | 'dateAsc' | 'readTime';
export type ViewState = 'home' | 'search' | 'article';