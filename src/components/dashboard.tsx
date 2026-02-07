"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EMAIL_CATEGORIES, EmailCategory } from "@/lib/categories";
import { Activity, AlertTriangle, Mail, RefreshCw, Lightbulb, Loader2, Eraser, Edit2, Check, Search, Plus, Trash2, Siren, Sparkles, ExternalLink, Terminal, BrainCircuit, Hammer, Wrench } from "lucide-react"; 
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";

// New Components
import { WeatherWidget } from "./weather-widget";
import { CommodityTicker } from "./commodity-ticker";
import { ShiftNotes } from "./shift-notes";
import { CommunityEvents } from "./community-events";

// Types
type DashboardStats = {
    totalProcessed: number;
    categories: Record<string, number>;
    senders: Record<string, number>;
    lastUpdated?: any;
};

type WeeklyStat = {
    date: string;
    totalProcessed: number;
    [key: string]: any;
}

type EmailLog = {
    id: string;
    sender: string;
    subject: string;
    category: string;
    snippet?: string;
    timestamp: any;
    isUrgent?: boolean;
    reasoning?: string;
};

type SenderRule = {
    id: string;
    sender: string;
    category: string;
    createdAt: any;
};

type RuleSuggestion = {
    sender: string;
    category: string;
    count: number;
    confidence: number;
};

// Personality: Dynamic Greetings (Helper)
const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Burning the midnight oil?";
    if (hour < 11) return "Good Morning, Syracuse.";
    if (hour < 14) return "Busy Lunch Rush?";
    if (hour < 18) return "Good Afternoon.";
    if (hour < 22) return "Evening Shift Mode.";
    return "Time to close up shop?";
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [rules, setRules] = useState<SenderRule[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [correcting, setCorrecting] = useState<string | null>(null); 
  
  // Date & Greeting State for Hydration safety
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [greeting, setGreeting] = useState<string>("Hello, Syracuse."); // Default for server render

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // New Rule Form
  const [newRuleSender, setNewRuleSender] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<string>(EMAIL_CATEGORIES[0]);
  const [isAddingRule, setIsAddingRule] = useState(false);

  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
        const queryParams = new URLSearchParams();
        if (searchTerm) queryParams.set('search', searchTerm);
        if (categoryFilter && categoryFilter !== 'All') queryParams.set('category', categoryFilter);

        const res = await fetch(`/api/stats?${queryParams.toString()}`);
        const data = await res.json();
        setStats(data.stats);
        setWeeklyStats(data.weeklyStats || []);
        setLogs(data.logs || []);
        setInsights(data.insights || []);
        setRules(data.rules || []);

        // Also fetch suggestions
        const suggestionsRes = await fetch('/api/rules/suggestions');
        const suggestionsData = await suggestionsRes.json();
        setSuggestions(suggestionsData.suggestions || []);

    } catch (err) {
        console.error("Failed to fetch dashboard data", err);
    } finally {
        setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
      const timer = setTimeout(() => {
          fetchData();
      }, 500);
      return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    // Client-side only logic to avoid hydration mismatch
    setCurrentDate(new Date());
    setGreeting(getGreetingText());

    // Initial fetch
    fetchData();
    // Poll every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []); 

  const handleCleanup = async () => {
      setCleaning(true);
      toast({
          title: "Starting Cleanup",
          description: "Processing up to 10 emails from your inbox...",
      });

      try {
          const res = await fetch('/api/cleanup', { method: 'POST' });
          const data = await res.json();

          if (res.ok) {
              toast({
                  title: "Cleanup Complete",
                  description: data.message,
              });
              fetchData();
          } else {
              // Safety check for error structure
              const errorMessage = data?.error || data?.message || "Unknown error";
              toast({ variant: "destructive", title: "Cleanup Failed", description: errorMessage });
          }
      } catch (err: any) {
           const message = err?.message || "Failed to connect to server.";
          toast({ variant: "destructive", title: "Error", description: message });
      } finally {
          setCleaning(false);
      }
  };

  const handleCorrection = async (log: EmailLog, newCategory: string) => {
    if (newCategory === log.category) return;
    
    setCorrecting(log.id);
    try {
        const res = await fetch('/api/correct-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: log.id,
                sender: log.sender,
                subject: log.subject,
                snippet: log.snippet,
                wrongCategory: log.category,
                correctCategory: newCategory
            })
        });

        if (res.ok) {
            toast({ title: "Correction Logged", description: "The AI will learn from this correction." });
            setLogs(logs.map(l => l.id === log.id ? { ...l, category: newCategory } : l));
        } else {
             toast({ variant: "destructive", title: "Correction Failed" });
        }
    } catch (err) {
        toast({ variant: "destructive", title: "Error" });
    } finally {
        setCorrecting(null);
    }
  };

  const handleUrgencyCorrection = async (log: EmailLog, shouldBeUrgent: boolean) => {
    try {
        const res = await fetch('/api/correct-urgency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: log.id,
                sender: log.sender,
                subject: log.subject,
                snippet: log.snippet,
                wasUrgent: log.isUrgent,
                shouldBeUrgent
            })
        });

        if (res.ok) {
            toast({ title: "Urgency Updated", description: "AI feedback recorded." });
            setLogs(logs.map(l => l.id === log.id ? { ...l, isUrgent: shouldBeUrgent } : l));
        } else {
            toast({ variant: "destructive", title: "Update Failed" });
        }
    } catch (err) {
        toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleAddRule = async (sender = newRuleSender, category = newRuleCategory) => {
      if (!sender) return;
      setIsAddingRule(true);
      try {
          const res = await fetch('/api/rules', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sender: sender, category: category })
          });
          
          if (res.ok) {
              toast({ title: "Rule Added", description: `Emails from "${sender}" will be moved to ${category}.` });
              if (sender === newRuleSender) setNewRuleSender("");
              fetchData(); // Refresh rules list
          }
      } catch (err) {
          toast({ variant: "destructive", title: "Error adding rule" });
      } finally {
          setIsAddingRule(false);
      }
  };

  const handleDeleteRule = async (id: string) => {
      try {
          const res = await fetch(`/api/rules?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
              toast({ title: "Rule Deleted" });
              setRules(rules.filter(r => r.id !== id));
          }
      } catch (err) {
          toast({ variant: "destructive", title: "Error deleting rule" });
      }
  };

  const maxCategoryCount = stats ? Math.max(...Object.values(stats.categories || {}), 1) : 1;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* 
          Main Header / Command Center Widgets 
          Weather Widget acts as the "Hero" header spanning full width
      */}
      <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        {/* Personality Injection: Dynamic Greeting (Client-Side Only) */}
                        {greeting}
                    </h2>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Wrench className="h-4 w-4 opacity-50" />
                        {currentDate ? currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : "Loading date..."}
                        <span className="opacity-30">|</span> 
                        Ready for the day?
                    </p>
                </div>
                
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground hidden md:flex">
                        <Activity className="h-4 w-4" />
                        <span>{loading ? "Updating..." : "System Active"}</span>
                    </div>
                    <Link href="/logs" passHref>
                        <Button variant="outline" size="icon" title="System Logs">
                            <Terminal className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Button variant="outline" size="icon" onClick={fetchData}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={handleCleanup} disabled={cleaning}>
                        {cleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eraser className="mr-2 h-4 w-4" />}
                        {cleaning ? "Cleaning..." : "Clean Inbox"}
                    </Button>
                </div>
          </div>

          <div className="w-full">
              <WeatherWidget />
          </div>

          {/* Secondary Operational Widgets Below Weather */}
          <div className="grid gap-4 md:grid-cols-3">
              <CommodityTicker />
              <CommunityEvents />
              <ShiftNotes />
          </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Email Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="rules">Sender Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:scale-[1.01] transition-transform duration-200 shadow-md hover:shadow-lg border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Volume</CardTitle>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalProcessed || 0}</div>
                    <p className="text-xs text-muted-foreground">Emails processed today</p>
                </CardContent>
                </Card>
                <Card className="hover:scale-[1.01] transition-transform duration-200 shadow-md hover:shadow-lg border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Spam Filtered</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.categories?.['Spam'] || 0}</div>
                    <p className="text-xs text-muted-foreground">Auto-archived</p>
                </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle>Weekly Activity</CardTitle>
                    <CardDescription>Email volume over the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={weeklyStats}>
                        <XAxis
                        dataKey="date"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                            // Fix: Use UTC components or timezone-agnostic parsing to prevent off-by-one errors
                            // "YYYY-MM-DD" parsed by `new Date()` is UTC midnight. 
                            // `toLocaleDateString` shifts it to local time (e.g. previous day 7pm).
                            // Solution: Append 'T00:00:00' to force local midnight context for formatting
                            const [year, month, day] = value.split('-');
                            const date = new Date(Number(year), Number(month) - 1, Number(day));
                            return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
                        }}
                        />
                        <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip 
                             cursor={{fill: 'transparent'}}
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="totalProcessed" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </CardContent>
                </Card>
                
                <Card className="col-span-3 hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle>Categories (Today)</CardTitle>
                        <CardDescription>Distribution of incoming emails.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                        {EMAIL_CATEGORIES.map((category) => {
                            const count = stats?.categories?.[category] || 0;
                            const percentage = Math.round((count / maxCategoryCount) * 100);
                            
                            return (
                                <div key={category} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        {/* Added Link to Gmail Label */}
                                        <a 
                                            href={`https://mail.google.com/mail/u/0/#label/${encodeURIComponent(category)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium hover:underline hover:text-primary transition-colors cursor-pointer"
                                            title={`Open ${category} in Gmail`}
                                        >
                                            {category}
                                        </a>
                                        <span className="text-muted-foreground">{count}</span>
                                    </div>
                                    <Progress value={percentage} className="h-2" />
                                </div>
                            )
                        })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
             <div className="flex items-center justify-between gap-4">
                 <div className="flex items-center flex-1 gap-2">
                     <Search className="h-4 w-4 text-muted-foreground" />
                     <Input 
                        placeholder="Search subject or sender..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                     />
                 </div>
                 <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Categories</SelectItem>
                        {EMAIL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                 </Select>
             </div>

             <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Sender</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Urgent?</TableHead>
                                <TableHead className="text-right">Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                        No emails found matching your filters.
                                    </TableCell>
                                </TableRow>
                            )}
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col space-y-1">
                                            <a 
                                                href={`https://mail.google.com/mail/u/0/#all/${log.id}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="hover:underline flex items-center gap-2 group text-primary"
                                            >
                                                {log.subject}
                                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={log.sender}>{log.sender}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                        <Badge variant="secondary" className="gap-1">
                                            {log.category}
                                            {log.reasoning && (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <BrainCircuit className="w-3 h-3 text-muted-foreground hover:text-primary cursor-help" />
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 text-sm">
                                                        <div className="font-semibold mb-1">AI Reasoning:</div>
                                                        <p className="text-muted-foreground">{log.reasoning}</p>
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </Badge>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100">
                                                    <Edit2 className="h-3 w-3" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Correct Category</DialogTitle>
                                                    <DialogDescription>
                                                        Tell the AI which category this email should have been sorted into.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-4">
                                                    <div className="text-sm font-medium mb-2">Subject: {log.subject}</div>
                                                    <div className="text-sm text-muted-foreground mb-4">Current: {log.category}</div>
                                                    
                                                    <Select onValueChange={(val) => handleCorrection(log, val)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select correct category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {EMAIL_CATEGORIES.map((cat) => (
                                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            {log.isUrgent ? (
                                                <Badge variant="destructive" className="flex items-center gap-1">
                                                    <Siren className="h-3 w-3" /> Urgent
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Normal</span>
                                            )}
                                            
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-30 hover:opacity-100">
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Correct Urgency</DialogTitle>
                                                        <DialogDescription>
                                                            Was this email actually urgent?
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-4 flex items-center justify-between border rounded-lg p-4">
                                                        <Label htmlFor="urgent-mode">Mark as Urgent</Label>
                                                        <Switch 
                                                            id="urgent-mode"
                                                            checked={log.isUrgent || false}
                                                            onCheckedChange={(checked) => handleUrgencyCorrection(log, checked)}
                                                        />
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {new Date(log.timestamp._seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
             {suggestions.length > 0 && (
                 <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                     <CardHeader className="pb-2">
                         <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-400">
                             <Sparkles className="h-5 w-5" /> AI Suggestions
                         </CardTitle>
                         <CardDescription className="text-amber-700/80 dark:text-amber-500">
                             The AI noticed these patterns in your inbox. Click "Add" to make them permanent rules.
                         </CardDescription>
                     </CardHeader>
                     <CardContent>
                         <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                             {suggestions.map((s, i) => (
                                 <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-background rounded-md border shadow-sm">
                                     <div className="overflow-hidden">
                                         <div className="font-medium truncate text-sm" title={s.sender}>{s.sender}</div>
                                         <div className="text-xs text-muted-foreground flex items-center gap-1">
                                             To: <Badge variant="secondary" className="text-[10px] h-4">{s.category}</Badge>
                                         </div>
                                     </div>
                                     <Button size="sm" variant="outline" onClick={() => handleAddRule(s.sender, s.category)}>
                                         Add
                                     </Button>
                                 </div>
                             ))}
                         </div>
                     </CardContent>
                 </Card>
             )}

             <Card>
                 <CardHeader>
                     <CardTitle>Deterministic Rules</CardTitle>
                     <CardDescription>
                         Force specific senders to always go to a certain category, bypassing AI classification.
                     </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="flex items-end gap-4 border-b pb-4">
                         <div className="space-y-2 flex-1">
                             <label className="text-sm font-medium">Sender (contains text)</label>
                             <Input 
                                placeholder="e.g. @bankofamerica.com" 
                                value={newRuleSender}
                                onChange={(e) => setSearchTerm(e.target.value)}
                             />
                         </div>
                         <div className="space-y-2 w-[200px]">
                             <label className="text-sm font-medium">Category</label>
                             <Select value={newRuleCategory} onValueChange={setNewRuleCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EMAIL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                             </Select>
                         </div>
                         <Button onClick={() => handleAddRule()} disabled={isAddingRule || !newRuleSender}>
                             <Plus className="mr-2 h-4 w-4" /> Add Rule
                         </Button>
                     </div>

                     <Table>
                         <TableHeader>
                             <TableRow>
                                 <TableHead>Sender Match</TableHead>
                                 <TableHead>Target Category</TableHead>
                                 <TableHead className="text-right">Actions</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {rules.length === 0 && (
                                 <TableRow>
                                     <TableCell colSpan={3} className="text-center text-muted-foreground">No rules defined yet.</TableCell>
                                 </TableRow>
                             )}
                             {rules.map((rule) => (
                                 <TableRow key={rule.id}>
                                     <TableCell className="font-mono">{rule.sender}</TableCell>
                                     <TableCell><Badge variant="outline">{rule.category}</Badge></TableCell>
                                     <TableCell className="text-right">
                                         <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                                             <Trash2 className="h-4 w-4 text-destructive" />
                                         </Button>
                                     </TableCell>
                                 </TableRow>
                             ))}
                         </TableBody>
                     </Table>
                 </CardContent>
             </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
