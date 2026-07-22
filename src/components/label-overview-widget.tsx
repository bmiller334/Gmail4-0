"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EMAIL_CATEGORIES } from "@/lib/categories";
import { Loader2, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function LabelOverviewWidget() {
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [loadingCounts, setLoadingCounts] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const res = await fetch('/api/labels');
                const data = await res.json();
                if (data.unreadCounts) {
                    setUnreadCounts(data.unreadCounts);
                }
            } catch (err) {
                toast({ variant: "destructive", title: "Error", description: "Failed to load unread counts." });
            } finally {
                setLoadingCounts(false);
            }
        };
        fetchCounts();
    }, [toast]);

    if (loadingCounts) {
        return (
            <Card className="w-full border-primary/10">
                <CardContent className="p-3 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium animate-pulse text-muted-foreground">Syncing labels...</span>
                </CardContent>
            </Card>
        );
    }

    const activeCategories = EMAIL_CATEGORIES.filter((category) => (unreadCounts[category] || 0) > 0);

    return (
        <Card className="w-full border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground mr-1">
                    <Inbox className="h-4 w-4 text-primary" />
                    Unread Labels:
                </div>
                {activeCategories.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">None</span>
                ) : (
                    activeCategories.map((category) => {
                        const count = unreadCounts[category] || 0;
                        return (
                            <a 
                                key={category}
                                href={`https://mail.google.com/mail/u/0/#label/${encodeURIComponent(category)}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="no-underline transition-transform hover:scale-105"
                            >
                                <Badge 
                                    variant="default" 
                                    className="gap-1.5 py-1 px-2.5 shadow-sm"
                                >
                                    {category}
                                    <span className="bg-background text-foreground text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none">
                                        {count}
                                    </span>
                                </Badge>
                            </a>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
