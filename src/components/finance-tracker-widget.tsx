"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { DollarSign, HelpCircle, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type CategoryItem = {
    category: string;
    amount: number;
    color: string;
};

type TrendItem = {
    month: string;
    Income: number;
    Expenses: number;
    Savings: number;
};

type FinanceData = {
    isMock: boolean;
    spreadsheetId: string | null;
    categories: CategoryItem[];
    trend: TrendItem[];
};

export function FinanceTrackerWidget() {
    const [data, setData] = useState<FinanceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchFinance() {
            try {
                const res = await fetch("/api/finance");
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error("Failed to fetch finance data", e);
            } finally {
                setLoading(false);
            }
        }
        fetchFinance();
    }, []);

    if (loading) {
        return <div className="h-64 flex items-center justify-center text-muted-foreground text-xs animate-pulse bg-muted/20 rounded-xl">Loading Finance Tracker...</div>;
    }
    if (!data) return null;

    const totalExpenses = data.categories.reduce((acc, curr) => acc + (curr.category.includes("Savings") ? 0 : curr.amount), 0);
    const totalSavings = data.categories.find(c => c.category.toLowerCase().includes("savings"))?.amount || 0;

    return (
        <Card className="hover:scale-[1.01] transition-transform duration-200 shadow-md hover:shadow-lg border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-transparent overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="h-4 w-4 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Personal Wealth Tracker
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Expenses & Savings overview
                    </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                    {data.isMock ? (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Badge variant="secondary" className="cursor-help text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 gap-1">
                                    <Sparkles className="h-3 w-3 animate-pulse" /> Live Mock Mode
                                </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 text-xs space-y-2 p-3">
                                <p className="font-semibold text-foreground">Showing Demo Data</p>
                                <p className="text-muted-foreground">To sync your actual finances, set the <strong>PERSONAL_FINANCE_SPREADSHEET_ID</strong> environment variable to your Google Sheet, or configure it in Firestore.</p>
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Synced Google Sheet
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-1 flex-1 flex flex-col justify-between">
                <Tabs defaultValue="spending" className="w-full flex-1 flex flex-col justify-between space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="text-left">
                            <span className="text-xs text-muted-foreground">Total Expenses</span>
                            <h4 className="text-2xl font-black font-mono text-foreground">${totalExpenses.toLocaleString()}</h4>
                        </div>
                        
                        <TabsList className="bg-muted/50 border h-8 p-0.5 rounded-lg">
                            <TabsTrigger value="spending" className="text-[10px] px-2.5 py-1 rounded-md">Spending</TabsTrigger>
                            <TabsTrigger value="trend" className="text-[10px] px-2.5 py-1 rounded-md">Trends</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="spending" className="flex-1 min-h-[160px] flex flex-col justify-between mt-0 outline-none">
                        <div className="h-[140px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.categories} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                    <XAxis dataKey="category" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none", borderRadius: "8px" }}
                                        labelStyle={{ color: "#fff", fontSize: "10px" }}
                                        itemStyle={{ color: "#fff", fontSize: "10px" }}
                                        formatter={(val: number) => [`$${val}`, "Amount"]}
                                    />
                                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                        {data.categories.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t text-[10px] text-muted-foreground">
                            <div>
                                <span className="block opacity-60">Savings Goal</span>
                                <span className="font-bold text-foreground text-xs font-mono">${totalSavings.toLocaleString()}</span>
                            </div>
                            <div className="col-span-2 text-right flex items-center justify-end gap-1 text-emerald-500 font-bold text-xs">
                                <TrendingUp className="h-3.5 w-3.5" /> Savings Rate: {Math.round((totalSavings / (totalExpenses + totalSavings)) * 100)}%
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="trend" className="flex-1 min-h-[160px] mt-0 outline-none">
                        <div className="h-[165px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.trend} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none", borderRadius: "8px" }}
                                        labelStyle={{ color: "#fff", fontSize: "10px" }}
                                        itemStyle={{ color: "#fff", fontSize: "10px" }}
                                    />
                                    <Area type="monotone" dataKey="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpenses)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
