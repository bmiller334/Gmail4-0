"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RefreshCw, Terminal, ChevronDown, Zap, BarChart3, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";

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
    
    // Usage Stats
    const [totalProcessed, setTotalProcessed] = useState(0);
    const [usageLoading, setUsageLoading] = useState(true);

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

    const fetchUsage = async () => {
        setUsageLoading(true);
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            if (data.stats) {
                setTotalProcessed(data.stats.totalProcessed || 0);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        } finally {
            setUsageLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchUsage();
    }, []);

    // Simple polling for "streaming" effect if enabled
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchLogs(); 
            fetchUsage();
        }, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Quota Constants & Projections
    const DAILY_LIMIT = 1500;
    const usagePercent = Math.min((totalProcessed / DAILY_LIMIT) * 100, 100);
    const remaining = DAILY_LIMIT - totalProcessed;

    // Calculate Projection
    const now = new Date();
    // Hours passed since midnight (0.0 to 24.0)
    const hoursPassed = now.getHours() + (now.getMinutes() / 60);
    // Prevent division by zero or weird early morning spikes
    const effectiveHours = Math.max(hoursPassed, 1); 
    const hourlyRate = totalProcessed / effectiveHours;
    const projectedTotal = Math.round(hourlyRate * 24);
    
    const isProjectedOverLimit = projectedTotal > DAILY_LIMIT;

    return (
        <div className="container mx-auto p-6 max-w-7xl h-screen flex flex-col gap-6">
            
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-lg">
                        <Terminal className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">System Logs & Metrics</h1>
                        <p className="text-muted-foreground text-sm">Monitoring Gemini Usage & Cloud Run Logs</p>
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

            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
                
                {/* Main Log Window - Takes up 2/3 space */}
                <Card className="flex-1 lg:flex-[2] overflow-hidden bg-slate-950 border-slate-800 text-slate-300 font-mono text-sm shadow-2xl flex flex-col">
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
                                    No logs found.
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
                </Card>

                {/* Usage Tracker Sidebar - Takes up 1/3 space */}
                <div className="lg:flex-1 space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                Gemini Free Tier Quota
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Calls Today</span>
                                        <span className="font-medium">{totalProcessed} / {DAILY_LIMIT}</span>
                                    </div>
                                    <Progress value={usagePercent} className={`h-2 ${usagePercent > 90 ? 'bg-red-100' : ''}`} indicatorClassName={usagePercent > 90 ? 'bg-red-500' : usagePercent > 75 ? 'bg-amber-500' : 'bg-green-500'} />
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                        {remaining > 0 ? `${remaining} calls remaining` : 'Quota Exceeded!'}
                                    </p>
                                </div>

                                <div className="pt-4 border-t space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>Current Rate</span>
                                        </div>
                                        <span className="font-medium">~{Math.round(hourlyRate)} calls/hr</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <TrendingUp className="h-3 w-3" />
                                            <span>EOD Projection</span>
                                        </div>
                                        <span className={`font-bold ${isProjectedOverLimit ? 'text-red-500' : 'text-green-600'}`}>
                                            {projectedTotal} calls
                                        </span>
                                    </div>
                                    
                                    {isProjectedOverLimit && (
                                        <p className="text-[10px] text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                            Warning: At this rate, you will exceed your daily quota before midnight.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Est. Cost
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">$0.00</div>
                            <p className="text-xs text-muted-foreground">
                                Free Tier Active (Gemini 2.5 Flash)
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
