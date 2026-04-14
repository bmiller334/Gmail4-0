"use client";

import { useEffect, useState } from 'react';
import { AlertCircle, Terminal, XCircle, AlertTriangle, Mail } from 'lucide-react';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type LogStats = {
    errorCount: number;
    warningCount: number;
    lastError?: string;
    lastErrorTime?: string;
    watchExpiration?: string;
    isWatchActive?: boolean;
};

export function StatusIndicator() {
  const [stats, setStats] = useState<LogStats>({ errorCount: 0, warningCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
        const res = await fetch('/api/system-logs?limit=50');
        const data = await res.json();
        
        const logs = data.logs || [];
        const errors = logs.filter((l: any) => l.severity === 'ERROR' || l.severity === 'CRITICAL');
        const warnings = logs.filter((l: any) => l.severity === 'WARNING');

        let isWatchActive = false;
        let watchExpiration = "";

        try {
            const watchRes = await fetch('/api/watch/status');
            const watchData = await watchRes.json();
            if (watchData.success && watchData.status?.expiration) {
                watchExpiration = watchData.status.expiration;
                const expirationDate = new Date(watchExpiration);
                isWatchActive = expirationDate > new Date();
            }
        } catch (e) {
            console.warn("Failed to fetch watch status", e);
        }
        
        setStats({
            errorCount: errors.length,
            warningCount: warnings.length,
            lastError: errors[0]?.message,
            lastErrorTime: errors[0]?.timestamp,
            watchExpiration,
            isWatchActive
        });
    } catch (error) {
        console.error("Failed to fetch log stats", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  const WatchStatusInfo = () => (
    <div className="pt-2 border-t border-slate-800">
        <div className="font-semibold mb-1 flex items-center gap-2 text-xs">
            <Mail className={`w-3 h-3 ${stats.isWatchActive ? 'text-green-500' : 'text-red-500'}`} />
            Gmail Watch Status:
        </div>
        <div className="flex items-center justify-between gap-2">
            <span className={`text-[10px] ${stats.isWatchActive ? 'text-green-400' : 'text-red-400 font-bold'}`}>
                {stats.isWatchActive ? 'Active' : 'Expired'}
                {stats.watchExpiration && ` (Exp: ${new Date(stats.watchExpiration).toLocaleDateString()})`}
            </span>
            <button 
                onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const res = await fetch('/api/watch');
                        if (res.ok) fetchStats();
                    } catch (err) {}
                }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300 border border-slate-700 transition-colors"
            >
                {stats.isWatchActive ? 'Refresh' : 'Fix'}
            </button>
        </div>
    </div>
  );

  const getStatusColor = () => {
    if (stats.errorCount > 0 || !stats.isWatchActive) return 'red';
    if (stats.warningCount > 0) return 'yellow';
    return 'green';
  };

  const statusColor = getStatusColor();

  return (
    <Link href="/logs">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-${statusColor}-500/10 hover:bg-${statusColor}-500/20 text-${statusColor}-600 border border-${statusColor}-500/20 transition-colors cursor-pointer text-sm font-medium animate-in fade-in duration-500`}>
                        {statusColor === 'green' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                        {statusColor === 'yellow' && <AlertTriangle className="w-4 h-4" />}
                        {statusColor === 'red' && <XCircle className="w-4 h-4" />}
                        
                        <span>
                            {statusColor === 'green' && "System Healthy"}
                            {statusColor === 'yellow' && `${stats.warningCount} Warnings`}
                            {statusColor === 'red' && (stats.errorCount > 0 ? `${stats.errorCount} Errors` : "Watch Expired")}
                        </span>

                        {stats.lastErrorTime && stats.errorCount > 0 && (
                            <span className="text-xs opacity-70 ml-1 border-l border-red-500/20 pl-2">
                                {new Date(stats.lastErrorTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs space-y-2 p-3">
                    {stats.errorCount > 0 ? (
                        <div>
                            <div className="font-semibold mb-1 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3 text-red-500" />
                                Recent Error:
                            </div>
                            <p className="text-[10px] break-words text-slate-300">{stats.lastError || "Check logs for details."}</p>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-300">
                            {stats.warningCount > 0 ? `${stats.warningCount} warnings detected.` : "No recent errors detected."}
                        </p>
                    )}

                    <WatchStatusInfo />

                    <div className="pt-1 text-[10px] text-muted-foreground italic border-t border-slate-800/50 mt-1 uppercase tracking-wider font-bold">
                        Click to view full logs
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </Link>
  );
}
