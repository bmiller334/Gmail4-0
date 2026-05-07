import { NextResponse } from 'next/server';
import { analyzeMarketSentiment } from '@/ai/market-analyzer';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

const parser = new Parser();

export async function GET() {
    try {
        const url = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en';
        const feed = await parser.parseURL(url);
        const headlines = feed.items.slice(0, 10).map(item => item.title || "");

        const aiResult = await analyzeMarketSentiment({ headlines });

        return NextResponse.json(aiResult);
    } catch (error) {
        console.error("Market Insights API Error:", error);
        return NextResponse.json({ error: "Failed to load market insights" }, { status: 500 });
    }
}
