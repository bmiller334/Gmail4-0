"use client";

import { useEffect, useState } from 'react';
import { AlertCircle, Terminal, XCircle, AlertTriangle } from 'lucide-react';
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
};

export function StatusIndicator() {
  const [stats, setStats] = useState<LogStats>({ errorCount: 0, warningCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
        const res = await fetch('/api/system-logs?limit=50');
        const data = await res.json();
        
        if (data.logs) {
            const errors = data.logs.filter((l: any) => l.severity === 'ERROR' || l.severity === 'CRITICAL');
            const warnings = data.logs.filter((l: any) => l.severity === 'WARNING');
            
            setStats({
                errorCount: errors.length,
                warningCount: warnings.length,
                lastError: errors[0]?.message,
                lastErrorTime: errors[0]?.timestamp
            });
        }
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

  // State 1: All Good (Green)
  if (stats.errorCount === 0 && stats.warningCount === 0) {
      return (
          <Link href="/logs">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-600 border border-green-500/20 transition-colors cursor-pointer text-sm font-medium">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span>System Healthy</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>No recent errors in the last 50 logs.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </Link>
      );
  }

  // State 2: Warnings Only (Yellow)
  if (stats.errorCount === 0 && stats.warningCount > 0) {
      return (
          <Link href="/logs">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 border border-yellow-500/20 transition-colors cursor-pointer text-sm font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            <span>{stats.warningCount} Warnings</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Non-critical issues detected recently.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </Link>
      );
  }

  // State 3: Errors Detected (Red)
  return (
      <Link href="/logs">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 transition-colors cursor-pointer text-sm font-medium animate-in fade-in duration-500">
                        <XCircle className="w-4 h-4" />
                        <span>{stats.errorCount} Errors</span>
                        {stats.lastErrorTime && (
                             <span className="text-xs opacity-70 ml-1 border-l border-red-500/20 pl-2">
                                {new Date(stats.lastErrorTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <div className="font-semibold mb-1">Recent Error:</div>
                    <p className="text-xs break-words">{stats.lastError || "Check logs for details."}</p>
                    <div className="mt-2 text-xs text-muted-foreground">Click to view full logs.</div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </Link>
  );
}
