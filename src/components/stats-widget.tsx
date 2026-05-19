"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, TrendingUp, Mail, Plus, Trash2, Loader2, BarChart3, ArrowUpRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EMAIL_CATEGORIES } from "@/lib/categories";

type HistoricalStat = {
    date: string;
    totalProcessed: number;
    categories: Record<string, number>;
};

type Spammer = {
    sender: string;
    count: number;
    category: string;
};

export function StatsWidget() {
    const [timeRange, setTimeRange] = useState("30");
    const [stats, setStats] = useState<HistoricalStat[]>([]);
    const [spammers, setSpammers] = useState<Spammer[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingRuleFor, setAddingRuleFor] = useState<string | null>(null);
    const [showAllLabels, setShowAllLabels] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchData();
    }, [timeRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/advanced-stats?range=${timeRange}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data.historicalStats || []);
                setSpammers(data.topSpammers || []);
            }
        } catch (error) {
            console.error("Error fetching advanced stats", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async (sender: string, targetCategory: string) => {
        setAddingRuleFor(sender);
        try {
            const res = await fetch('/api/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender, category: targetCategory })
            });
            if (res.ok) {
                toast({ title: "Rule Added", description: `Future emails from ${sender} will go to ${targetCategory}.` });
                // Optimistically remove from spammers or just refresh
                setSpammers(prev => prev.filter(s => s.sender !== sender));
                fetchData();
            }
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: "Could not add rule." });
        } finally {
            setAddingRuleFor(null);
        }
    };

    const totalProcessed = stats.reduce((acc, curr) => acc + curr.totalProcessed, 0);
    const avgPerDay = stats.length > 0 ? Math.round(totalProcessed / stats.length) : 0;

    const chartData = stats.map(s => {
        const data: any = {
            ...s,
            dateFormatted: new Date(s.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }),
        };
        EMAIL_CATEGORIES.forEach(cat => {
            data[cat] = s.categories[cat] || 0;
        });
        return data;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" /> Inbox Analytics
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Deep dive into your email trends and control your inbox volume.</p>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 Days</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="90">Last 90 Days</SelectItem>
                        <SelectItem value="365">Last Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProcessed.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Emails in the last {timeRange} days</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgPerDay}</div>
                        <p className="text-xs text-muted-foreground">Emails per day</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Marketing/Spam Identified</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {chartData.reduce((acc, curr) => acc + curr.Spam + curr.Marketing, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Total junk filtered out</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-primary/20 shadow-md">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" /> Email Volume Trends
                            </CardTitle>
                            <CardDescription>Processed emails over the selected time range.</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="show-all-labels" checked={showAllLabels} onCheckedChange={setShowAllLabels} />
                            <Label htmlFor="show-all-labels" className="cursor-pointer">Show all labels</Label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.2)" />
                                    <XAxis dataKey="dateFormatted" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                                        cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="totalProcessed" name="Total Emails" fill="hsl(var(--primary) / 0.8)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    {showAllLabels ? (
                                        EMAIL_CATEGORIES.map((cat, i) => (
                                            <Bar key={cat} dataKey={cat} name={cat} fill={`hsl(${(i * 360) / EMAIL_CATEGORIES.length}, 70%, 50%)`} radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                                        ))
                                    ) : (
                                        <>
                                            <Bar dataKey="Marketing" name="Marketing" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                                        </>
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-destructive/30 shadow-md overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ShieldAlert className="w-64 h-64" />
                </div>
                <CardHeader className="bg-destructive/5 pb-6 border-b border-destructive/10">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <ShieldAlert className="h-5 w-5" /> Spammer Catcher
                    </CardTitle>
                    <CardDescription>
                        Top senders recently categorized as Marketing or Spam. Add rules to automatically trash or correctly categorize them.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {!loading && spammers.length > 0 && (
                        <div className="p-6 bg-destructive/5 border-b border-destructive/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xs font-bold text-destructive uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <ShieldAlert className="h-3 w-3" /> #1 Top Sender
                                </h3>
                                <div className="text-xl font-bold truncate max-w-md" title={spammers[0].sender}>
                                    {spammers[0].sender}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    Accountable for <span className="font-semibold text-foreground">{spammers[0].count}</span> recent emails ({spammers[0].category})
                                </div>
                            </div>
                            <Button 
                                variant="destructive" 
                                onClick={() => handleAddRule(spammers[0].sender, 'Spam')}
                                disabled={addingRuleFor === spammers[0].sender}
                                className="shrink-0 shadow-sm"
                            >
                                {addingRuleFor === spammers[0].sender ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                Ban Sender
                            </Button>
                        </div>
                    )}
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Sender</TableHead>
                                <TableHead>Volume</TableHead>
                                <TableHead>Current Category</TableHead>
                                <TableHead className="text-right pr-6">Quick Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : spammers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        No aggressive spammers detected recently. Good job!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                spammers.map((spammer, index) => (
                                    <TableRow key={spammer.sender} className="hover:bg-muted/30">
                                        <TableCell className="font-medium pl-6">
                                            <div className="flex items-center gap-2">
                                                {index < 3 && <Badge variant="destructive" className="h-5 px-1 bg-destructive/90">Top {index + 1}</Badge>}
                                                {spammer.sender}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{spammer.count}</span> emails
                                                <ArrowUpRight className="h-3 w-3 text-destructive" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={spammer.category === 'Spam' ? 'border-red-500 text-red-500' : 'border-amber-500 text-amber-500'}>
                                                {spammer.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => handleAddRule(spammer.sender, 'Spam')}
                                                    disabled={addingRuleFor === spammer.sender}
                                                    className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                                                >
                                                    {addingRuleFor === spammer.sender ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                                                    Send to Spam
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary"
                                                    onClick={() => handleAddRule(spammer.sender, 'Marketing')}
                                                    disabled={addingRuleFor === spammer.sender}
                                                >
                                                    Force Marketing
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
