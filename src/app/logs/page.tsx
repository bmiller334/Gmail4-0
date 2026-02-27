"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Terminal, ChevronDown, Zap, BarChart3, TrendingUp, Clock, Bug, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { useDebounce } from '@/hooks/use-debounce';

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
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [debug, setDebug] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [pageLimit, setPageLimit] = useState(20);
    
    // Reset logs when search changes
    useEffect(() => {
        setLogs([]);
        setNextPageToken(undefined);
        fetchLogs(undefined, false, debouncedSearchTerm);
    }, [debouncedSearchTerm]);

    const fetchLogs = async (token?: string, append = false, search?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: pageLimit.toString() });
            if (token) params.set('pageToken', token);
            if (search) params.set('search', search);
            
            const res = await fetch(`/api/system-logs?${params}`);
            const data = await res.json();
            
            setDebug(data.debug);

            if (append) {
                setLogs(prev => [...prev, ...(data.logs || [])]);
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

    const handleLoadMore = () => {
        if (nextPageToken) {
            fetchLogs(nextPageToken, true, debouncedSearchTerm);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl h-screen flex flex-col gap-6">
            
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-lg">
                            <Terminal className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
                            {debug && (
                                <div className="flex items-center gap-2 text-[10px] text-amber-500 font-mono mt-1">
                                    <Bug className="w-3 h-3" />
                                    <span>DEBUG: Received {debug.count} logs from server at {new Date(debug.serverTime).toLocaleTimeString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <Button 
                        variant={autoRefresh ? "secondary" : "outline"}
                        onClick={() => {
                            setAutoRefresh(!autoRefresh);
                            if (!autoRefresh) fetchLogs(undefined, false, debouncedSearchTerm);
                        }}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                        {autoRefresh ? 'Auto Refresh On' : 'Refresh'}
                    </Button>
                </div>

                <div className="flex gap-4 items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <Search className="w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Search logs (e.g., 'category', 'error', 'email-sorter')..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none text-slate-200 placeholder:text-slate-500 focus-visible:ring-0 h-auto p-0"
                    />
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                </div>
            </div>

            <Card className="flex-1 overflow-hidden bg-slate-950 border-slate-800 text-slate-300 font-mono text-sm shadow-2xl flex flex-col">
                <ScrollArea className="flex-1 p-4">
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
                                No logs found matching your criteria.
                            </div>
                        )}
                        
                        {nextPageToken && (
                            <div className="pt-4 flex justify-center">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                    className="text-slate-500 hover:text-slate-300"
                                >
                                    {loading ? 'Loading...' : 'Load older logs'}
                                    <ChevronDown className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </Card>
        </div>
    );
}
