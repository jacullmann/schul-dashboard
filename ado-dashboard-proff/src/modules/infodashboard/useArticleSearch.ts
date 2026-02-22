import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Article, ViewState, SortOption } from '@/modules/infodashboard/types.ts';
import { articles } from '@/modules/infodashboard/data.ts';

export function useArticleSearch() {
    const { t } = useI18n();

    const currentView = ref<ViewState>('home');
    const searchQuery = ref('');
    const activeSearchQuery = ref('');
    const activeArticle = ref<Article | null>(null);

    const activeTopicFilter = ref<string>('All');
    const sortOption = ref<SortOption>('relevance');
    const minReadTime = ref<number>(0);

    const getLevenshteinDistance = (a: string, b: string): number => {
        if (a === b) return 0;
        if (Math.abs(a.length - b.length) > 2) return Infinity;
        if (a.length > b.length) [a, b] = [b, a];

        let prevRow: number[] = Array.from({ length: a.length + 1 }, (_, i) => i);
        let currentRow: number[] = new Array(a.length + 1).fill(0);

        for (let i = 1; i <= b.length; i++) {
            currentRow[0] = i;
            for (let j = 1; j <= a.length; j++) {
                if (b[i - 1] === a[j - 1]) {
                    currentRow[j] = prevRow[j - 1]!;
                } else {
                    currentRow[j] = Math.min(
                        prevRow[j - 1]!,
                        prevRow[j]!,
                        currentRow[j - 1]!
                    ) + 1;
                }
            }
            [prevRow, currentRow] = [currentRow, prevRow];
        }

        return prevRow[a.length]!;
    };

    const renderMarkdown = (key: string): string => {
        const raw = t(key);
        return DOMPurify.sanitize(marked.parse(raw) as string);
    };

    const getArticleContent = (article: Article): string => {
        if (!article.contentKey) return '';
        return t(article.contentKey);
    };

    const searchResults = computed(() => {
        if (!activeSearchQuery.value.trim() && currentView.value === 'search') return articles;
        if (!activeSearchQuery.value.trim()) return [];

        const queryTerms = activeSearchQuery.value.toLowerCase().split(/\s+/).filter(q => q.length > 0);
        const totalTerms = queryTerms.length;

        const scored = articles.map(article => {
            const titleLower = (article.title || '').toLowerCase();
            const contentText = getArticleContent(article);
            const excerptText = article.excerpt || '';

            const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, ' ');

            const contentCleaned = stripHtml(contentText) + ' ' + stripHtml(excerptText);
            const contentLower = contentCleaned.toLowerCase();

            const wordsCleaned = (titleLower + ' ' + contentLower).replace(/[.,/#!$%^&*;:{}=\-_`~()"]/g, '');
            const articleWords = new Set(wordsCleaned.split(/\s+/));

            let matchedTermsCount = 0;
            let score = 0;

            queryTerms.forEach(term => {
                let isMatch = false;
                if (titleLower.includes(term) || contentLower.includes(term)) {
                    isMatch = true;
                    score += 10;
                } else {
                    for (const word of articleWords) {
                        if (Math.abs(word.length - term.length) > 2) continue;
                        const allowedEdits = term.length > 4 ? 2 : 1;
                        if (getLevenshteinDistance(term, word) <= allowedEdits) {
                            isMatch = true;
                            score += 3;
                            break;
                        }
                    }
                }

                if (isMatch) {
                    matchedTermsCount++;
                }
            });

            return { article, score, matchedTermsCount };
        });

        return scored
            .filter(item => {
                const matchRatio = item.matchedTermsCount / totalTerms;
                return matchRatio >= (2 / 3);
            })
            .sort((a, b) => b.score - a.score)
            .map(item => item.article);
    });

    const processedArticles = computed(() => {
        let list = currentView.value === 'search' || activeSearchQuery.value
            ? searchResults.value
            : articles;

        if (activeTopicFilter.value !== 'All') {
            list = list.filter(a => a.topic === activeTopicFilter.value);
        }

        if (minReadTime.value > 0) {
            list = list.filter(a => a.readTime <= minReadTime.value);
        }

        return [...list].sort((a, b) => {
            switch (sortOption.value) {
                case 'dateDesc': return new Date(b.date).getTime() - new Date(a.date).getTime();
                case 'dateAsc': return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'readTime': return a.readTime - b.readTime;
                case 'relevance': default: return 0;
            }
        });
    });

    const recommendedArticles = computed(() => {
        if (!activeArticle.value) return [];

        const current = activeArticle.value;
        const maxRecs = 3;
        let recs: Article[] = [];
        const addedIds = new Set<number>([current.id]);

        if (current.recommendedIds && current.recommendedIds.length > 0) {
            const specificRecs = current.recommendedIds
                .map(id => articles.find(a => a.id === id))
                .filter((a): a is Article => !!a);

            specificRecs.forEach(a => {
                if (!addedIds.has(a.id) && recs.length < maxRecs) {
                    recs.push(a);
                    addedIds.add(a.id);
                }
            });
        }

        if (recs.length >= maxRecs) return recs;

        const sortByDateDesc = (a: Article, b: Article) =>
            new Date(b.date).getTime() - new Date(a.date).getTime();

        const sameTopic = articles
            .filter(a => a.topic === current.topic && !addedIds.has(a.id))
            .sort(sortByDateDesc);

        while (recs.length < maxRecs && sameTopic.length > 0) {
            const next = sameTopic.shift()!;
            recs.push(next);
            addedIds.add(next.id);
        }

        if (recs.length >= maxRecs) return recs;

        const fallback = articles
            .filter(a => !addedIds.has(a.id))
            .sort(sortByDateDesc);

        while (recs.length < maxRecs && fallback.length > 0) {
            const next = fallback.shift()!;
            recs.push(next);
            addedIds.add(next.id);
        }

        return recs;
    });

    const openArticle = (article: Article) => {
        activeArticle.value = article;
        currentView.value = 'article';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goHome = () => {
        currentView.value = 'home';
        searchQuery.value = '';
        activeSearchQuery.value = '';
        activeArticle.value = null;
        activeTopicFilter.value = 'All';
    };

    const triggerSearch = () => {
        activeSearchQuery.value = searchQuery.value;
        currentView.value = 'search';
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return {
        currentView,
        searchQuery,
        activeSearchQuery,
        activeArticle,
        activeTopicFilter,
        sortOption,
        minReadTime,
        processedArticles,
        recommendedArticles,
        openArticle,
        goHome,
        triggerSearch,
        formatDate,
        renderMarkdown,
    };
}