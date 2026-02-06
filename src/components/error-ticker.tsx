"use client";

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type LogEntry = {
  timestamp: string;
  severity: string;
  message: string;
  resourceType: string;
};

export function ErrorTicker() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs);
        }
      } catch (error) {
        console.error("Failed to fetch error logs", error);
      }
    }

    fetchLogs();
    // Poll every minute
    const interval = setInterval(fetchLogs, 60000);
    return () => clearInterval(interval);
  }, []);

  // Rotate through logs every 5 seconds
  useEffect(() => {
    if (logs.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % logs.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [logs.length]);

  if (!isVisible || logs.length === 0) return null;

  const currentLog = logs[currentIndex];

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 text-destructive-foreground text-sm py-2 px-4 relative overflow-hidden h-10 flex items-center justify-center">
      <div className="absolute left-4 flex items-center gap-2 font-semibold">
         <AlertCircle className="w-4 h-4" />
         <span className="text-xs uppercase tracking-wider">System Alert</span>
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
                <span className="font-mono text-xs opacity-75 mr-2">
                    [{new Date(currentLog.timestamp).toLocaleTimeString()}]
                </span>
                {currentLog.message}
            </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute right-4 flex items-center gap-2">
         {logs.length > 1 && (
             <div className="flex gap-1">
                 {logs.map((_, idx) => (
                     <div 
                        key={idx} 
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-destructive' : 'bg-destructive/30'}`}
                     />
                 ))}
             </div>
         )}
         <button 
            onClick={() => setIsVisible(false)}
            className="ml-4 hover:bg-destructive/20 p-1 rounded-full transition-colors"
         >
            <X className="w-3 h-3" />
         </button>
      </div>
    </div>
  );
}
