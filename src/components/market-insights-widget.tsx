"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const MOCK_INDICES = [
    { name: "S&P 500", value: 5204.34, change: 1.2 },
    { name: "Dow Jones", value: 39500.12, change: 0.8 },
    { name: "Nasdaq", value: 16400.55, change: 1.5 },
    { name: "Russell 2000", value: 2050.10, change: -0.4 },
];

const MOCK_SECTORS = [
    { name: "Technology", change: 2.1 },
    { name: "Healthcare", change: -0.5 },
    { name: "Financials", change: 1.2 },
    { name: "Energy", change: -1.8 },
    { name: "Consumer Discretionary", change: 0.9 },
];

export function MarketInsightsWidget() {
    const [sentiment, setSentiment] = useState<{summary: string, sentiment: string} | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchSentiment = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/market-insights');
                const data = await res.json();
                if (res.ok) setSentiment(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchSentiment();
    }, []);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Market Insights</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
                <Tabs defaultValue="sentiment" className="h-full space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
                        <TabsTrigger value="indices">Indices</TabsTrigger>
                        <TabsTrigger value="sectors">Sectors</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sentiment" className="space-y-4 min-h-[140px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analyzing markets...
                            </div>
                        ) : sentiment ? (
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Overall Mood:</span>
                                    <Badge variant={sentiment.sentiment === 'Bullish' ? 'default' : sentiment.sentiment === 'Bearish' ? 'destructive' : 'secondary'} className={sentiment.sentiment === 'Bullish' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : ''}>
                                        {sentiment.sentiment}
                                    </Badge>
                                </div>
                                <div className="text-sm bg-muted/50 p-3 rounded-md border text-muted-foreground flex gap-2 leading-relaxed">
                                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <span>{sentiment.summary}</span>
                                </div>
                            </div>
                        ) : (
                             <div className="flex items-center justify-center h-32 text-muted-foreground">
                                <AlertCircle className="h-4 w-4 mr-2" /> Failed to load insights.
                             </div>
                        )}
                    </TabsContent>

                    <TabsContent value="indices" className="space-y-4">
                        <div className="space-y-3 pt-2">
                            {MOCK_INDICES.map((item) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm">{item.value.toLocaleString()}</span>
                                        <span className={`text-xs flex items-center w-12 justify-end ${item.change > 0 ? 'text-green-500' : item.change < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {item.change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : item.change < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
                                            {Math.abs(item.change)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="sectors" className="space-y-4">
                        <div className="space-y-3 pt-2">
                            {MOCK_SECTORS.map((item) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{item.name}</span>
                                    <span className={`text-xs flex items-center ${item.change > 0 ? 'text-green-500' : item.change < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                        {item.change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : item.change < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
                                        {Math.abs(item.change)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
