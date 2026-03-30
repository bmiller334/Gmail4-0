"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

type Article = {
    title: string;
    link: string;
    pubDate: string;
    source?: string;
};

export function HeadlineWidget() {
    const [category, setCategory] = useState("Local");
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchNews = async (cat: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/news?category=${cat}`);
            const data = await res.json();
            if (res.ok) {
                setArticles(data.articles || []);
            } else {
                toast({ variant: "destructive", title: "Failed to load news", description: data.error });
            }
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch headlines." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category]);

    return (
        <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Top Headlines
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fetchNews(category)}>
                        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 pt-0">
                <Tabs value={category} onValueChange={setCategory} className="w-full mb-3 mt-1">
                    <TabsList className="grid w-full grid-cols-3 h-8">
                        <TabsTrigger value="Local" className="text-xs">Local</TabsTrigger>
                        <TabsTrigger value="US" className="text-xs">US</TabsTrigger>
                        <TabsTrigger value="World" className="text-xs">World</TabsTrigger>
                    </TabsList>
                </Tabs>
                
                <div className="flex-1 overflow-y-auto pr-1 space-y-3" style={{ maxHeight: '180px' }}>
                    {loading ? (
                        <div className="flex items-center justify-center h-full pt-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground pt-4">No headlines available.</div>
                    ) : (
                        articles.map((article, i) => (
                            <a 
                                key={i}
                                href={article.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block group flex flex-col gap-1 border-b pb-2 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
                            >
                                <h4 className="text-xs font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2" title={article.title}>
                                    {article.title}
                                </h4>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 line-clamp-1 w-full">
                                        {article.source && <span className="font-semibold text-foreground/70 shrink-0">{article.source}</span>}
                                        {article.source && <span className="shrink-0">•</span>}
                                        <span className="truncate">
                                            {new Date(article.pubDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(article.pubDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </span>
                                </div>
                            </a>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
