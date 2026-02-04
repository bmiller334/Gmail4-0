"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EMAIL_CATEGORIES } from "@/lib/categories";
import { Activity, AlertTriangle, Mail, RefreshCw, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

// Types for our stats
type DashboardStats = {
    totalProcessed: number;
    categories: Record<string, number>;
    senders: Record<string, number>;
    lastUpdated?: any;
};

type EmailLog = {
    id: string;
    sender: string;
    subject: string;
    category: string;
    timestamp: any;
    isUrgent?: boolean;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data.stats);
        setLogs(data.logs || []);
        setInsights(data.insights || []);
    } catch (err) {
        console.error("Failed to fetch dashboard data", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const maxCategoryCount = stats ? Math.max(...Object.values(stats.categories || {}), 1) : 1;
  const sortedSenders = stats ? Object.entries(stats.senders || {}).sort((a,b) => b[1] - a[1]).slice(0, 5) : [];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inbox Zero Dashboard</h2>
        <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>{loading ? "Updating..." : "System Active"}</span>
            </div>
            <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Volume</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProcessed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Emails processed today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spam Filtered</CardTitle>
             <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{stats?.categories?.['Spam'] || 0}</div>
             <p className="text-xs text-muted-foreground">
               Auto-archived
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Email Categories</CardTitle>
            <CardDescription>
              Distribution of incoming emails today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {EMAIL_CATEGORIES.map((category) => {
                  const count = stats?.categories?.[category] || 0;
                  const percentage = Math.round((count / maxCategoryCount) * 100);
                  
                  return (
                    <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                             <span className="font-medium">{category}</span>
                             <span className="text-muted-foreground">{count}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                    </div>
                  )
              })}
            </div>
          </CardContent>
        </Card>
        
        <div className="col-span-3 space-y-4">
            <Card>
            <CardHeader>
                <CardTitle>Top Senders</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-sm">
                    {sortedSenders.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
                    {sortedSenders.map(([name, count], i) => (
                        <li key={i} className="flex justify-between border-b pb-1 last:border-0">
                            <span className="truncate max-w-[200px]" title={name}>{name.replace(/_/g, '.')}</span>
                            <span className="font-mono text-muted-foreground">{count}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            </Card>

            <Card className="bg-muted/50">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-base">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span>Insights</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                 <ul className="space-y-2 text-sm">
                     {insights.length === 0 && <li className="text-muted-foreground">No anomalies detected.</li>}
                     {insights.map((insight, i) => (
                         <li key={i} className="flex items-start space-x-2">
                             <span className="block mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                             <span>{insight}</span>
                         </li>
                     ))}
                 </ul>
            </CardContent>
            </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
          <Card>
              <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                      {logs.length === 0 && <p className="text-sm text-muted-foreground">No recent emails processed.</p>}
                      {logs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                              <div className="flex flex-col">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium">{log.subject}</span>
                                    {log.isUrgent && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-800 rounded font-bold">URGENT</span>}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{log.sender}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                                      {log.category}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                      {new Date(log.timestamp._seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                              </div>
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
