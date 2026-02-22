import type { Article } from '@/modules/infodashboard/types.ts';

export const articles: Article[] = [
    {
        id: 1,
        type: 'text',
        title: 'Niemand hat die Absicht, einen Zaun zu errichten',
        excerpt: '\u201eNiemand hat die Absicht, eine Mauer zu errichten.\u201c So hie\u00df es vor 60 Jahren. Dann wurde eine Mauer errichtet. Heute ist es ein Zaun und statt der Sozialisten will die CDU ihn bauen.',
        contentKey: 'infodashboard.articles.1.content',
        author: 'Herbert Fischer',
        date: '2026-01-09',
        readTime: 2,
        topic: 'Politik',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Berlin-kreuzberg_goerlitzer-park_20050923_527.jpg',
        imageAttribution: 'Georg Slickers, CC BY-SA 2.5, via Wikimedia Commons'
    }
];