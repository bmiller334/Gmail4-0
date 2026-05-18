"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { EMAIL_CATEGORIES } from "@/lib/categories";
import { Loader2, ExternalLink, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

type Message = {
    id: string;
    subject: string;
    sender: string;
};

export function LabelOverviewWidget() {
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});
    const [loadingCounts, setLoadingCounts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
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

    const handleExpand = useCallback(async (category: string) => {
        if (messagesCache[category] || loadingMessages[category]) return;

        setLoadingMessages(prev => ({ ...prev, [category]: true }));
        try {
            const res = await fetch(`/api/labels?category=${encodeURIComponent(category)}`);
            const data = await res.json();
            if (data.messages) {
                setMessagesCache(prev => ({ ...prev, [category]: data.messages }));
            }
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: `Failed to load messages for ${category}.` });
        } finally {
            setLoadingMessages(prev => ({ ...prev, [category]: false }));
        }
    }, [messagesCache, loadingMessages, toast]);

    const maxCount = Math.max(...Object.values(unreadCounts), 1);

    return (
        <Card className="hover:shadow-md transition-shadow h-full w-full border-primary/10">
            <CardHeader className="pb-4 border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-primary" />
                    Unread Labels Overview
                </CardTitle>
                <CardDescription>
                    Expand a label to see the most recent unread emails.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 bg-muted/10">
                {loadingCounts ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm font-medium animate-pulse">Syncing labels with Gmail...</span>
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full space-y-3" onValueChange={(val) => {
                        if (val) handleExpand(val);
                    }}>
                        {EMAIL_CATEGORIES.map((category) => {
                            const count = unreadCounts[category] || 0;
                            const percentage = Math.round((count / maxCount) * 100);
                            
                            return (
                                <AccordionItem key={category} value={category} className="border-none">
                                    <div className="flex flex-col border rounded-xl bg-background hover:border-primary/30 transition-all overflow-hidden shadow-sm hover:shadow-md">
                                        <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]]:bg-primary/5 group">
                                            <div className="flex flex-1 items-center justify-between mr-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-base group-hover:text-primary transition-colors">{category}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={count > 0 ? "default" : "secondary"} className={`font-mono px-2.5 py-1 ${count > 0 ? 'bg-primary text-primary-foreground animate-in slide-in-from-right-2' : 'opacity-70'}`}>
                                                        {count} Unread
                                                    </Badge>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-5 pb-5 pt-3 bg-gradient-to-b from-primary/5 to-transparent">
                                            <div className="space-y-4">
                                                {count > 0 && (
                                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                            <span>Volume relative to other labels</span>
                                                            <span>{percentage}%</span>
                                                        </div>
                                                        <Progress value={percentage} className="h-1.5" />
                                                    </div>
                                                )}
                                                
                                                {loadingMessages[category] ? (
                                                    <div className="flex items-center justify-center py-6 text-muted-foreground text-sm font-medium bg-background/50 rounded-lg border border-dashed">
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                                                        Loading latest emails...
                                                    </div>
                                                ) : messagesCache[category] ? (
                                                    messagesCache[category].length > 0 ? (
                                                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                                                Recent Unread Emails
                                                                <div className="h-px bg-primary/20 flex-1"></div>
                                                            </div>
                                                            <div className="grid gap-2">
                                                                {messagesCache[category].map((msg) => (
                                                                    <a
                                                                        key={msg.id}
                                                                        href={`https://mail.google.com/mail/u/0/#all/${msg.id}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="group flex flex-col gap-1.5 rounded-lg bg-background p-3 hover:bg-primary/5 hover:border-primary/30 transition-all border shadow-sm hover:shadow"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-4">
                                                                            <span className="text-sm font-medium line-clamp-1 text-foreground group-hover:text-primary transition-colors">
                                                                                {msg.subject}
                                                                            </span>
                                                                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary mt-0.5" />
                                                                        </div>
                                                                        <span className="text-xs text-muted-foreground truncate font-mono bg-muted/50 px-1.5 py-0.5 rounded w-fit max-w-full">
                                                                            {msg.sender}
                                                                        </span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground py-6 text-center bg-background/50 rounded-lg border border-dashed">
                                                            All caught up! No unread emails here.
                                                        </div>
                                                    )
                                                ) : null}
                                                <div className="flex justify-between items-center pt-2">
                                                    <div className="text-xs text-muted-foreground">Showing max 5 latest emails</div>
                                                    <Button variant="outline" size="sm" className="text-xs h-8 hover:bg-primary hover:text-primary-foreground transition-colors" asChild>
                                                        <a href={`https://mail.google.com/mail/u/0/#label/${encodeURIComponent(category)}`} target="_blank" rel="noopener noreferrer">
                                                            Open in Gmail <ExternalLink className="ml-1.5 h-3 w-3" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </div>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}
