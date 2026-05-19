"use client";

import { useEffect, useState, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Terminal } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type AiSummary = {
    id: string;
    promptType: string;
    promptUsed: string;
    emailsIncluded: string[];
    summaryResult: string;
    timestamp: any;
};

function AiHistoryContent() {
    const [summaries, setSummaries] = useState<AiSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/ai-summaries')
            .then(res => res.json())
            .then(data => {
                if (data.summaries) {
                    setSummaries(data.summaries);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch AI summaries", err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="container mx-auto p-6 max-w-[1400px]">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">AI Summary History</h1>
            </div>

            <div className="mb-8">
                {loading ? (
                    <Card className="bg-slate-900 border-slate-800 shadow-xl">
                        <CardContent className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </CardContent>
                    </Card>
                ) : summaries.length === 0 ? (
                    <Card className="bg-slate-900 border-slate-800 shadow-xl">
                        <CardContent className="text-center py-20 text-slate-400 border border-dashed border-slate-800 rounded-lg m-6">
                            No AI summaries found in history. Summaries will appear here as they are generated.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-6">
                        {summaries.map((summary) => {
                            const dateObj = summary.timestamp?._seconds 
                                ? new Date(summary.timestamp._seconds * 1000) 
                                : new Date(summary.timestamp);

                            return (
                                <Card key={summary.id} className="bg-slate-900 border-slate-800 shadow-xl transition-all duration-200 hover:border-slate-700">
                                    <CardHeader className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-slate-200 text-lg">
                                                    {dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </span>
                                                <span className="text-sm text-slate-500 font-mono">
                                                    {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10">
                                                    {summary.promptType === 'recent_emails' ? 'Recent Emails' : summary.promptType}
                                                </Badge>
                                                <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">
                                                    {summary.emailsIncluded?.length || 0} emails included
                                                </Badge>
                                            </div>
                                        </div>
                                        
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="text-xs bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200">
                                                    <Terminal className="w-3 h-3 mr-2" />
                                                    View Prompt
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col bg-slate-950 border-slate-800">
                                                <DialogHeader>
                                                    <DialogTitle className="text-slate-200">Prompt Sent to Gemini</DialogTitle>
                                                </DialogHeader>
                                                <ScrollArea className="flex-1 mt-4 border border-slate-800 rounded-md p-4 bg-slate-900">
                                                    <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap">
                                                        {summary.promptUsed || 'N/A'}
                                                    </pre>
                                                </ScrollArea>
                                            </DialogContent>
                                        </Dialog>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="whitespace-pre-wrap text-[15px] text-slate-300 leading-relaxed custom-scrollbar">
                                            {summary.summaryResult}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AiHistoryPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <AiHistoryContent />
        </Suspense>
    );
}
