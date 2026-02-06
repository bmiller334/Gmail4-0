"use client";

import { useEffect, useState } from 'react';
import { AlertCircle, ZapOff, X, Activity, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type LogEntry = {
  timestamp: string;
  severity: string;
  message: string;
  resourceType: string;
};

// Quota Constants
const WARNING_LIMIT = 1000;
const HARD_LIMIT = 1300;

export function ErrorTicker() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [quotaUsage, setQuotaUsage] = useState(0);
  
  // Status Flags
  const isHardLimitHit = quotaUsage >= HARD_LIMIT;
  const isWarningLimitHit = quotaUsage >= WARNING_LIMIT && !isHardLimitHit;

  // Fetch Logs & Quota
  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch Errors
        const logRes = await fetch('/api/logs');
        const logData = await logRes.json();
        
        // 2. Fetch Quota Stats
        const statsRes = await fetch('/api/stats');
        const statsData = await statsRes.json();
        const currentUsage = statsData.stats?.totalProcessed || 0;
        
        setQuotaUsage(currentUsage);

        let activeLogs = logData.logs || [];
        setLogs(activeLogs);

      } catch (error) {
        console.error("Ticker fetch failed", error);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  // Rotate ticker
  useEffect(() => {
    // If quota alert is active, don't rotate
    if (isHardLimitHit || isWarningLimitHit) return; 
    
    if (logs.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % logs.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [logs.length, isHardLimitHit, isWarningLimitHit]);

  // 1. HARD LIMIT (Red - Processing Stopped)
  if (isHardLimitHit && isVisible) {
      return (
        <div className="bg-red-50 border-b border-red-200 text-red-900 text-sm py-3 px-4 relative flex items-center justify-center shadow-sm">
            <div className="flex items-center gap-3 font-semibold">
                <ZapOff className="w-5 h-5 text-red-600" />
                <span className="uppercase tracking-wider text-xs">Processing Paused</span>
            </div>
            <div className="mx-4 font-medium">
                Daily Limit Reached ({quotaUsage} / {HARD_LIMIT}). Automatic processing stopped to prevent overages.
            </div>
            <button onClick={() => setIsVisible(false)} className="absolute right-4 p-1 hover:bg-red-200/50 rounded-full">
                <X className="w-4 h-4" />
            </button>
        </div>
      );
  }

  // 2. WARNING LIMIT (Orange/Yellow - Caution)
  if (isWarningLimitHit && isVisible) {
      return (
        <div className="bg-orange-50 border-b border-orange-200 text-orange-900 text-sm py-3 px-4 relative flex items-center justify-center shadow-sm">
            <div className="flex items-center gap-3 font-semibold">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="uppercase tracking-wider text-xs">Usage Warning</span>
            </div>
            <div className="mx-4 font-medium">
                Approaching Daily Limit ({quotaUsage} calls). Processing will stop at {HARD_LIMIT}.
            </div>
            <button onClick={() => setIsVisible(false)} className="absolute right-4 p-1 hover:bg-orange-200/50 rounded-full">
                <X className="w-4 h-4" />
            </button>
        </div>
      );
  }

  // 3. STANDARD LOGS (Amber/Pastel)
  if (!isVisible || logs.length === 0) return null;

  const currentLog = logs[currentIndex];
  const cleanMessage = currentLog.message.length > 100 
    ? currentLog.message.substring(0, 100) + "..." 
    : currentLog.message;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm py-2 px-4 relative overflow-hidden h-10 flex items-center justify-center">
      <div className="absolute left-4 flex items-center gap-2 font-semibold text-amber-700">
         <Activity className="w-4 h-4" />
         <span className="text-xs uppercase tracking-wider hidden sm:inline">System Activity</span>
      </div>
      
      <div className="flex-1 max-w-2xl mx-auto text-center overflow-hidden">
        <AnimatePresence mode="wait">
            <motion.div
                key={currentIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="truncate px-4"
                title={currentLog.message}
            >
                <span className="font-mono text-xs opacity-60 mr-2">
                    [{new Date(currentLog.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]
                </span>
                {cleanMessage}
            </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute right-4 flex items-center gap-2">
         {logs.length > 1 && (
             <div className="flex gap-1 hidden sm:flex">
                 {logs.map((_, idx) => (
                     <div 
                        key={idx} 
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-amber-600' : 'bg-amber-600/20'}`}
                     />
                 ))}
             </div>
         )}
         <button 
            onClick={() => setIsVisible(false)}
            className="ml-4 hover:bg-amber-200/50 p-1 rounded-full transition-colors text-amber-700"
         >
            <X className="w-3 h-3" />
         </button>
      </div>
    </div>
  );
}
