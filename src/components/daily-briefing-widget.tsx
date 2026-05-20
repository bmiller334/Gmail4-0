"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Coffee, Calendar, Mail, AlertCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type BriefingData = {
    briefing: string;
    weather: string;
    nextEvent: {
        summary: string;
        start: string;
        location?: string;
    } | null;
    inboxCount: number;
    urgentCount: number;
};

export function DailyBriefingWidget() {
    const [data, setData] = useState<BriefingData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBriefing() {
            try {
                const res = await fetch("/api/daily-briefing");
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error("Failed to fetch daily briefing", e);
            } finally {
                setLoading(false);
            }
        }
        fetchBriefing();
    }, []);

    if (loading) {
        return (
            <Card className="border-amber-500/10 bg-gradient-to-r from-amber-500/5 via-orange-500/2 to-transparent backdrop-blur-sm shadow-md animate-pulse">
                <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="bg-amber-500/10 p-4 rounded-full">
                        <Coffee className="h-8 w-8 text-amber-500/50 animate-bounce" />
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-5/6"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const briefingText = data?.briefing || "Welcome back to your dashboard. Your systems are online, and we are ready for the day ahead.";

    return (
        <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 group">
            {/* Ambient gold glow behind the widget */}
            <div className="absolute -left-16 -top-16 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/15 transition-all duration-300" />
            
            <CardContent className="p-6 flex flex-col md:flex-row items-center md:items-start lg:items-center gap-6 relative z-10">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl relative shadow-inner group-hover:scale-105 transition-transform duration-300">
                    <Coffee className="h-8 w-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <Sparkles className="h-4 w-4 text-orange-400 absolute -top-1 -right-1 animate-pulse" />
                </div>
                
                <div className="flex-1 space-y-3 text-center md:text-left">
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                        <h3 className="text-sm font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
                            Morning Coffee Briefing
                        </h3>
                        {data?.urgentCount && data.urgentCount > 0 ? (
                            <Badge variant="destructive" className="animate-pulse text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {data.urgentCount} Action Needed
                            </Badge>
                        ) : null}
                    </div>
                    
                    <p className="text-base font-medium text-foreground leading-relaxed drop-shadow-sm font-sans max-w-3xl">
                        {briefingText}
                    </p>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-1 text-xs text-muted-foreground">
                        {data?.weather && (
                            <span className="flex items-center gap-1.5 bg-muted/30 border border-muted-foreground/10 px-2.5 py-1 rounded-full hover:bg-muted/50 transition-colors">
                                ⛅ {data.weather}
                            </span>
                        )}
                        {data?.nextEvent && (
                            <span className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-full text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors">
                                <Calendar className="h-3.5 w-3.5" />
                                Next: {data.nextEvent.summary} ({new Date(data.nextEvent.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/10 px-2.5 py-1 rounded-full text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 transition-colors">
                            <Mail className="h-3.5 w-3.5" />
                            Unread: {data?.inboxCount || 0}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
