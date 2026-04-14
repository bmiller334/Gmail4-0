"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Article = {
    title: string;
    link: string;
    pubDate: string;
    source?: string;
    tickerSource?: string;
};

export function NewsTicker() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllNews = async () => {
            setLoading(true);
            try {
                const [usRes, worldRes, marketRes] = await Promise.all([
                    fetch('/api/news?category=US'),
                    fetch('/api/news?category=World'),
                    fetch('/api/news?category=Market')
                ]);
                
                const [usData, worldData, marketData] = await Promise.all([
                    usRes.json(),
                    worldRes.json(),
                    marketRes.json()
                ]);

                const interleaved: Article[] = [];
                const maxLength = Math.max(
                    (usData.articles || []).length, 
                    (worldData.articles || []).length, 
                    (marketData.articles || []).length
                );
                
                for (let i = 0; i < maxLength; i++) {
                    if (usData.articles?.[i]) interleaved.push({...usData.articles[i], tickerSource: 'US News'});
                    if (worldData.articles?.[i]) interleaved.push({...worldData.articles[i], tickerSource: 'World News'});
                    if (marketData.articles?.[i]) interleaved.push({...marketData.articles[i], tickerSource: 'Market News'});
                }

                setArticles(interleaved);
            } catch (err) {
                console.error("Failed to fetch news for ticker", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllNews();
        
        // Refresh every 30 mins
        const interval = setInterval(fetchAllNews, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading && articles.length === 0) {
        return (
            <div className="w-full bg-muted/30 border-y py-2 px-4 flex items-center justify-center text-xs text-muted-foreground w-full">
                <Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading latest developments...
            </div>
        );
    }

    if (articles.length === 0) return null;

    // duplicate articles so marquee loops smoothly
    const marqueeContent = [...articles, ...articles].map((article: any, i) => (
        <a 
            key={i} 
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mx-4 group"
        >
            <span className="text-[10px] uppercase font-bold text-muted-foreground mr-2 group-hover:text-primary transition-colors">
                [{article.tickerSource}]
            </span>
            <span className="text-sm font-medium hover:underline text-foreground">
                {article.title}
            </span>
            <span className="mx-4 text-muted-foreground/30">•</span>
        </a>
    ));

    return (
        <div className="w-full bg-background border-y py-2 overflow-hidden flex items-center shadow-sm relative">
            <div className="w-24 bg-background/90 backdrop-blur-sm absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center font-bold text-xs shadow-[10px_0_15px_-3px_rgba(0,0,0,0.1)] dark:shadow-[10px_0_15px_-3px_rgba(255,255,255,0.05)] text-primary shrink-0 rounded-r-lg">
                <div className="animate-pulse mr-1 h-2 w-2 rounded-full bg-red-500"></div> LIVE
            </div>
            
            <div className="flex animate-marquee whitespace-nowrap pl-24 hover:[animation-play-state:paused]">
                {marqueeContent}
            </div>
        </div>
    );
}
