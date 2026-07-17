"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function DailyBriefTicker() {
    const [briefing, setBriefing] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBriefing = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/daily-briefing");
                if (res.ok) {
                    const data = await res.json();
                    setBriefing(data.briefing);
                }
            } catch (err) {
                console.error("Failed to fetch daily briefing", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBriefing();
        
        // Refresh periodically if desired
        const interval = setInterval(fetchBriefing, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="w-full bg-muted/30 border-y py-2 px-4 flex items-center justify-center text-xs text-muted-foreground w-full">
                <Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading Daily Brief...
            </div>
        );
    }

    if (!briefing) return null;

    return (
        <div className="w-full bg-background border-y py-2 overflow-hidden flex items-center shadow-sm relative">
            <div className="w-56 bg-background/90 backdrop-blur-sm absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center font-bold text-xs shadow-[10px_0_15px_-3px_rgba(0,0,0,0.1)] dark:shadow-[10px_0_15px_-3px_rgba(255,255,255,0.05)] text-amber-500 shrink-0 rounded-r-lg">
                <div className="animate-pulse mr-2 h-2 w-2 rounded-full bg-amber-500"></div> DAILY BRIEF (8AM)
            </div>
            
            <div className="flex animate-marquee whitespace-nowrap pl-56 hover:[animation-play-state:paused]">
                {/* Duplicate content to make the marquee loop smoothly */}
                <div className="inline-flex items-center mx-4">
                    <span className="text-sm font-medium text-foreground">
                        {briefing}
                    </span>
                    <span className="mx-24 text-muted-foreground/30">•</span>
                </div>
                <div className="inline-flex items-center mx-4">
                    <span className="text-sm font-medium text-foreground">
                        {briefing}
                    </span>
                    <span className="mx-24 text-muted-foreground/30">•</span>
                </div>
            </div>
        </div>
    );
}
