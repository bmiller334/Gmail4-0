"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Terminal, ChevronDown, Zap, BarChart3, TrendingUp, Clock, Bug, Search, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { useDebounce } from '@/hooks/use-debounce';
import GmailConnectButton from '@/components/auth/gmail-connect-button'; // Import the button

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

function LogsContent() {
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
            
            // Add a cache-busting timestamp to force fresh fetch
            params.set('_t', Date.now().toString());
            
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

    const hasAuthError = logs.some(log => 
        log.message.includes('invalid_grant') || 
        log.message.includes('Token has been expired') || 
        log.message.includes('unauthorized_client')
    );

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

                {hasAuthError && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex flex-col gap-3 animate-pulse">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                            <div>
                                <p className="font-bold text-red-500">Authentication Error Detected</p>
                                <p className="text-xs mt-1 text-red-300">
                                    The system is failing to authenticate with Gmail ("invalid_grant").
                                </p>
                            </div>
                        </div>
                        <div className="pl-8 text-sm text-red-300/80 space-y-2">
                             <p>You can re-authenticate directly from here:</p>
                             <div className="flex flex-col gap-2">
                                <div className="text-xs bg-black/20 p-2 rounded">
                                    <strong>Prerequisite:</strong> Ensure 
                                    <code className="mx-1 text-white select-all">https://nextn-email-sorter-fuuedc4idq-uc.a.run.app/api/auth/google/callback</code> 
                                    is added to <strong>Authorized redirect URIs</strong> in your Google Cloud Console.
                                </div>
                                <div className="w-fit">
                                    <GmailConnectButton />
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* Show the button even if no error detected, just in case manual re-auth is needed */}
                {!hasAuthError && (
                    <div className="flex justify-end">
                        <GmailConnectButton />
                    </div>
                )}

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

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading logs...</div>}>
      <LogsContent />
    </Suspense>
  );
}
