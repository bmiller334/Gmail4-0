import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser({
    customFields: {
        item: [['source', 'sourceName']]
    }
});

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'Local';

    let url = 'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-US&gl=US&ceid=US:en';

    if (category === 'World') {
        url = 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en';
    } else if (category === 'Local') {
        const query = '("Syracuse" AND "Kansas") OR "Kansas" OR "Western Colorado" OR "Oklahoma" OR "Nebraska" OR "Missouri" OR "Texas"';
        url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    } else if (category === 'US') {
        url = 'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-US&gl=US&ceid=US:en';
    } else if (category === 'Market') {
        url = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en';
    }

    try {
        const feed = await parser.parseURL(url);
        
        const articles = feed.items.slice(0, 10).map(item => {
            // Google News sometimes provides source info internally or at the end of the title
            let source = item.sourceName || feed.title;
            let title = item.title || "";
            
            // Heuristic to remove " - Source Name" appended to Google News titles
            if (title.includes(' - ')) {
                const parts = title.split(' - ');
                if (parts.length > 1) {
                    const potentialSource = parts.pop();
                    if (potentialSource && !item.sourceName) {
                        source = potentialSource;
                    }
                    title = parts.join(' - ');
                }
            }
            
            return {
                title,
                link: item.link,
                pubDate: item.pubDate || new Date().toISOString(),
                source
            };
        });

        return NextResponse.json({ articles });
    } catch (error: any) {
        console.error("Failed to fetch RSS:", error);
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}
