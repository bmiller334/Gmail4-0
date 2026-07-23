"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ExternalLink, Bookmark, Clock, Loader2, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type BookmarkItem = {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    timestamp: any;
    attachments?: {
        id: string;
        name: string;
        mimeType: string;
        webViewLink: string;
    }[];
};

export function ReadLaterWidget() {
    const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchBookmarks = async () => {
        try {
            const res = await fetch("/api/stats?category=Read-Later");
            if (res.ok) {
                const data = await res.json();
                setBookmarks(data.logs || []);
            }
        } catch (e) {
            console.error("Failed to load bookmarks:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookmarks();
    }, []);

    const handleCheckOff = async (id: string) => {
        setArchivingId(id);
        try {
            const res = await fetch("/api/read-later/archive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                toast({
                    title: "Bookmark Completed!",
                    description: "Item archived and removed from your queue.",
                });
                setBookmarks(bookmarks.filter(b => b.id !== id));
            } else {
                toast({
                    variant: "destructive",
                    title: "Archive Failed",
                    description: "Could not archive the item at this time.",
                });
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred.",
            });
        } finally {
            setArchivingId(null);
        }
    };

    // Helper to extract URLs from subject or snippet
    const getArticleUrl = (subject: string, snippet: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const matchSubject = subject.match(urlRegex);
        if (matchSubject) return matchSubject[0];
        
        const matchSnippet = snippet.match(urlRegex);
        if (matchSnippet) return matchSnippet[0];

        return null;
    };

    const getCleanSubject = (subject: string) => {
        // Strip out raw URLs from subject to keep it neat
        return subject.replace(/https?:\/\/[^\s]+/g, '').trim() || "Saved Bookmark";
    };

    if (loading) {
        return <div className="h-64 flex items-center justify-center text-muted-foreground text-xs animate-pulse bg-muted/20 rounded-xl">Loading Bookmarks Queue...</div>;
    }

    return (
        <Card className="hover:scale-[1.01] transition-transform duration-200 shadow-md hover:shadow-lg border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-transparent overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <Bookmark className="h-4 w-4 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" /> Read Later Queue
                </CardTitle>
                <CardDescription className="text-xs">
                    Saved links, articles, and Google Drive attachments
                </CardDescription>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-1 flex-1 flex flex-col justify-between overflow-y-auto max-h-[300px]">
                {bookmarks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                        <div className="bg-purple-500/10 p-3 rounded-full">
                            <Sparkles className="h-6 w-6 text-purple-400" />
                        </div>
                        <p className="text-xs font-semibold text-foreground">Your queue is fully cleared!</p>
                        <p className="text-[10px] text-muted-foreground max-w-[200px]">Manually label emails with Read-Later to save articles and attachments here.</p>
                    </div>
                ) : (
                    <div className="space-y-2 divide-y divide-purple-500/10">
                        {bookmarks.map((b, i) => {
                            const rawUrl = getArticleUrl(b.subject, b.snippet);
                            const cleanSubject = getCleanSubject(b.subject);
                            
                            return (
                                <div key={b.id} className={`flex items-start justify-between gap-3 pt-2 ${i === 0 ? 'pt-0' : ''} group/item`}>
                                    <div className="flex-1 space-y-1 overflow-hidden">
                                        <div className="flex items-center gap-1.5">
                                            {rawUrl ? (
                                                <a 
                                                    href={rawUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-xs font-bold text-foreground hover:text-purple-500 hover:underline transition-colors flex items-center gap-1 truncate"
                                                >
                                                    {cleanSubject}
                                                    <ExternalLink className="h-3 w-3 opacity-50 group-hover/item:opacity-100 transition-opacity" />
                                                </a>
                                            ) : (
                                                <span className="text-xs font-bold text-foreground truncate">
                                                    {cleanSubject}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <p className="text-[10px] text-muted-foreground line-clamp-2 pr-2 leading-relaxed">
                                            {b.snippet}
                                        </p>

                                        {b.attachments && b.attachments.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {b.attachments.map((att) => (
                                                    <a
                                                        key={att.id}
                                                        href={att.webViewLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[9px] font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full transition-colors truncate max-w-[180px]"
                                                        title={`Open ${att.name} in Google Drive`}
                                                    >
                                                        <FileText className="h-2.5 w-2.5 shrink-0" />
                                                        <span className="truncate">{att.name}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center gap-2 pt-1 text-[9px] text-muted-foreground/60">
                                            <span className="truncate max-w-[120px]" title={b.sender}>From: {b.sender.split("<")[0].trim()}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-0.5">
                                                <Clock className="h-2.5 w-2.5" />
                                                {(() => {
                                                    const dateObj = b.timestamp?._seconds 
                                                        ? new Date(b.timestamp._seconds * 1000) 
                                                        : new Date(b.timestamp);
                                                    return isNaN(dateObj.getTime()) 
                                                        ? "Invalid Date" 
                                                        : dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
                                                })()}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 rounded-full"
                                        disabled={archivingId === b.id}
                                        onClick={() => handleCheckOff(b.id)}
                                    >
                                        {archivingId === b.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
