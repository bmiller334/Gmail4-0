"use client";

import { useEffect, useState, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

            <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                    <CardTitle>Historical Summaries</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : summaries.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 border border-dashed border-slate-800 rounded-lg">
                            No AI summaries found in history. Summaries will appear here as they are generated.
                        </div>
                    ) : (
                        <div className="rounded-md border border-slate-800 bg-slate-950/50">
                            <ScrollArea className="h-[700px]">
                                <Table>
                                    <TableHeader className="bg-slate-900 sticky top-0 z-10">
                                        <TableRow className="border-slate-800 hover:bg-slate-900">
                                            <TableHead className="w-[180px]">Date</TableHead>
                                            <TableHead className="w-[120px]">Type</TableHead>
                                            <TableHead className="w-[150px]">Emails Included</TableHead>
                                            <TableHead className="w-[40%] min-w-[300px]">Prompt Sent to Gemini</TableHead>
                                            <TableHead className="w-[40%] min-w-[300px]">Result / Summary</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summaries.map((summary) => {
                                            const dateObj = summary.timestamp?._seconds 
                                                ? new Date(summary.timestamp._seconds * 1000) 
                                                : new Date(summary.timestamp);

                                            return (
                                                <TableRow key={summary.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                                                    <TableCell className="align-top whitespace-nowrap text-xs text-slate-400">
                                                        {dateObj.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10 whitespace-nowrap">
                                                            {summary.promptType === 'recent_emails' ? 'Recent Emails' : summary.promptType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">
                                                            {summary.emailsIncluded?.length || 0} items
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        <div className="max-h-[200px] overflow-y-auto whitespace-pre-wrap text-[11px] font-mono text-slate-400 bg-slate-950 p-3 rounded border border-slate-800 custom-scrollbar">
                                                            {summary.promptUsed || 'N/A'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        <div className="max-h-[200px] overflow-y-auto whitespace-pre-wrap text-sm text-slate-300 bg-slate-950/30 p-3 rounded custom-scrollbar">
                                                            {summary.summaryResult}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>
            </Card>
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
