"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RefreshCw, Terminal, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type LogEntry = {
    timestamp: string;
    severity: string;
    message: string;
    resourceType: string;
    id: string;
};

const SEVERITY_COLORS: Record<string, string> = {
    'ERROR': 'text-red-500',
    'CRITICAL': 'text-red-700 font-bold',
    'WARNING': 'text-yellow-500',
    'INFO': 'text-blue-400',
    'DEBUG': 'text-gray-400',
    'DEFAULT': 'text-gray-300'
};

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const fetchLogs = async (token?: string, append = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '50' });
            if (token) params.set('pageToken', token);
            
            const res = await fetch(`/api/system-logs?${params}`);
            
            if (!res.ok) {
                console.error("Failed to fetch logs:", res.statusText);
                return;
            }
            
            const data = await res.json();
            
            if (append) {
                setLogs(prev => [...prev, ...data.logs]);
            } else {
                setLogs(data.logs || []);
            }
            setNextPageToken(data.nextPageToken);
        } catch (error) {
            console.error("Failed to load logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Simple polling for "streaming" effect if enabled
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            // In a real stream we'd fetch only new ones, but for simplicity we just refresh the top
            fetchLogs(); 
        }, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    return (
        <div className="container mx-auto p-6 max-w-6xl h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-lg">
                        <Terminal className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
                        <p className="text-muted-foreground text-sm">Live stream from Google Cloud Logging</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant={autoRefresh ? "secondary" : "outline"}
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                        {autoRefresh ? 'Live' : 'Refresh'}
                    </Button>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden bg-slate-950 border-slate-800 text-slate-300 font-mono text-sm shadow-2xl">
                <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-800 text-xs text-slate-500 uppercase tracking-widest">
                        <span>Timestamp</span>
                        <span>Severity / Message</span>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-1">
                            {logs.map((log) => (
                                <div key={log.id} className="group flex gap-4 hover:bg-slate-900/40 p-1.5 rounded transition-colors break-words">
                                    <span className="text-slate-500 shrink-0 select-none w-36 text-xs mt-0.5">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Badge variant="outline" className={`h-4 text-[10px] px-1 py-0 border-0 ${SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.DEFAULT} bg-transparent p-0`}>
                                                {log.severity}
                                            </Badge>
                                            <span className="text-slate-600 text-[10px]">{log.resourceType}</span>
                                        </div>
                                        <p className={`whitespace-pre-wrap ${log.severity === 'ERROR' ? 'text-red-200' : 'text-slate-300'}`}>
                                            {log.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            
                            {logs.length === 0 && !loading && (
                                <div className="text-center py-20 text-slate-600">
                                    No logs found. (Check your Cloud Logging permissions or if any logs exist)
                                </div>
                            )}

                             {logs.length > 0 && nextPageToken && (
                                <div className="pt-4 pb-2 text-center">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => fetchLogs(nextPageToken, true)}
                                        disabled={loading}
                                        className="text-slate-500 hover:text-slate-300"
                                    >
                                        {loading ? 'Loading...' : 'Load More'}
                                        <ChevronDown className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </Card>
        </div>
    );
}
