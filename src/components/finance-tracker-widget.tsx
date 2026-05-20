"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { 
    DollarSign, 
    Settings, 
    TrendingUp, 
    Wallet, 
    CreditCard, 
    PiggyBank, 
    TrendingDown,
    ArrowUpRight, 
    HelpCircle, 
    Link, 
    Unlink, 
    Trash2, 
    CheckCircle, 
    AlertCircle, 
    ShieldAlert, 
    Loader2, 
    Plus,
    RefreshCw
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "@/hooks/use-toast";

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

type PlaidAccount = {
    accountId: string;
    name: string;
    officialName: string;
    type: string;
    subtype: string;
    balance: number;
    availableBalance: number;
    currency: string;
    institutionName: string;
};

type PlaidTransaction = {
    id: string;
    date: string;
    name: string;
    amount: number;
    category: string;
    institutionName: string;
    pending: boolean;
};

type FinanceData = {
    isMock: boolean;
    isPlaid: boolean;
    spreadsheetId?: string | null;
    netWorth?: number;
    totalCash?: number;
    totalInvestments?: number;
    totalDebts?: number;
    accounts?: PlaidAccount[];
    categories: CategoryItem[];
    transactions?: PlaidTransaction[];
    trend: TrendItem[];
};

type PlaidConfig = {
    isConfigured: boolean;
    env: string;
    clientId: string | null;
    linkedItems: {
        itemId: string;
        institutionId: string;
        institutionName: string;
        linkedAt: string;
    }[];
};

export function FinanceTrackerWidget() {
    const [data, setData] = useState<FinanceData | null>(null);
    const [config, setConfig] = useState<PlaidConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Credentials form states
    const [clientIdInput, setClientIdInput] = useState("");
    const [secretInput, setSecretInput] = useState("");
    const [envInput, setEnvInput] = useState<"sandbox" | "development" | "production">("development");
    const [savingKeys, setSavingKeys] = useState(false);
    
    // Plaid Link state
    const [linkToken, setLinkToken] = useState<string | null>(null);
    const [generatingLinkToken, setGeneratingLinkToken] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const fetchFinance = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
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
            setRefreshing(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/plaid/config");
            if (res.ok) {
                const json = await res.json();
                setConfig(json);
            }
        } catch (e) {
            console.error("Failed to fetch Plaid config", e);
        }
    };

    useEffect(() => {
        fetchFinance();
        fetchConfig();
    }, []);

    // Load dynamic link token when settings open or when clicked
    const handlePrepareLink = async () => {
        setGeneratingLinkToken(true);
        try {
            const res = await fetch("/api/plaid/link-token", { method: "POST" });
            const json = await res.json();
            if (res.ok && json.link_token) {
                setLinkToken(json.link_token);
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to generate Link Token",
                    description: json.error || "Please verify your Plaid developer credentials."
                });
            }
        } catch (e: any) {
            toast({
                variant: "destructive",
                title: "API Error",
                description: e.message || "Failed to contact Plaid endpoint."
            });
        } finally {
            setGeneratingLinkToken(false);
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientIdInput || !secretInput) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please enter both Client ID and Secret key." });
            return;
        }

        setSavingKeys(true);
        try {
            const res = await fetch("/api/plaid/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId: clientIdInput, secret: secretInput, env: envInput })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                toast({ title: "Credentials Saved", description: "Plaid Developer credentials successfully registered." });
                fetchConfig();
                // Reset inputs for security
                setClientIdInput("");
                setSecretInput("");
            } else {
                toast({ variant: "destructive", title: "Failed to save configuration", description: json.error });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error Saving Config", description: e.message });
        } finally {
            setSavingKeys(false);
        }
    };

    const handleDisconnect = async (itemId: string, instName: string) => {
        if (!confirm(`Are you sure you want to disconnect ${instName}? This will revoke access tokens.`)) {
            return;
        }

        try {
            const res = await fetch("/api/plaid/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                toast({ title: "Bank Disconnected", description: `${instName} was successfully disconnected.` });
                fetchConfig();
                fetchFinance();
            } else {
                toast({ variant: "destructive", title: "Disconnection Failed", description: json.error });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        }
    };

    if (loading) {
        return <div className="h-[360px] flex items-center justify-center text-muted-foreground text-xs animate-pulse bg-muted/20 rounded-xl border border-emerald-500/20">Loading Finance Tracker...</div>;
    }
    if (!data) return null;

    const totalExpenses = data.categories.reduce((acc, curr) => acc + (curr.category.includes("Savings") ? 0 : curr.amount), 0);
    const totalSavings = data.categories.find(c => c.category.toLowerCase().includes("savings"))?.amount || 0;

    return (
        <Card className="hover:scale-[1.005] transition-transform duration-200 shadow-md hover:shadow-lg border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-transparent overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="h-4 w-4 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Personal Wealth Tracker
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {data.isPlaid ? "Real-time Plaid Bank Sync" : "Expenses & Savings overview"}
                    </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                    {data.isPlaid ? (
                        <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Plaid Active
                        </Badge>
                    ) : data.isMock ? (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 gap-1 animate-pulse">
                            Live Mock Mode
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Synced Google Sheet
                        </Badge>
                    )}

                    {/* Plaid Config Dialog */}
                    <Dialog open={isSettingsOpen} onOpenChange={(open) => {
                        setIsSettingsOpen(open);
                        if (open) fetchConfig();
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <Plus className="h-5 w-5" /> Plaid Integration Manager
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Manage your developer keys and link your Fidelity or Lending Club accounts.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 pt-2">
                                {/* Credentials Form */}
                                <form onSubmit={handleSaveConfig} className="space-y-3 border-b pb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plaid API Credentials</h4>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-muted-foreground">Client ID</label>
                                        <Input 
                                            placeholder={config?.clientId ? "(Configured)" : "Enter Plaid Client ID"}
                                            value={clientIdInput}
                                            onChange={(e) => setClientIdInput(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-muted-foreground">Secret Key</label>
                                        <Input 
                                            type="password"
                                            placeholder={config?.isConfigured ? "••••••••••••••••" : "Enter Plaid Secret key"}
                                            value={secretInput}
                                            onChange={(e) => setSecretInput(e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">Environment</label>
                                            <Select value={envInput} onValueChange={(val: any) => setEnvInput(val)}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Environment" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sandbox">Sandbox (Test Mode)</SelectItem>
                                                    <SelectItem value="development">Development (Free Real Accounts)</SelectItem>
                                                    <SelectItem value="production">Production (Commercial)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-end">
                                            <Button type="submit" disabled={savingKeys} className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                                                {savingKeys ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                Save Keys
                                            </Button>
                                        </div>
                                    </div>
                                </form>

                                {/* Linked Banks List */}
                                <div className="space-y-2 border-b pb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                                        <span>Linked Institutions</span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted">
                                            {config?.linkedItems?.length || 0} Connected
                                        </Badge>
                                    </h4>

                                    {config?.linkedItems && config.linkedItems.length > 0 ? (
                                        <div className="space-y-2">
                                            {config.linkedItems.map((item) => (
                                                <div key={item.itemId} className="flex items-center justify-between p-2 bg-muted/40 rounded-lg border border-border/55 text-xs">
                                                    <div>
                                                        <span className="font-bold text-foreground block">{item.institutionName}</span>
                                                        <span className="text-[10px] text-muted-foreground">Linked: {new Date(item.linkedAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleDisconnect(item.itemId, item.institutionName)}
                                                        className="text-destructive hover:bg-destructive/10 h-7 w-7"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-muted/20 border border-dashed rounded-lg text-xs text-muted-foreground">
                                            No financial institutions linked yet.
                                        </div>
                                    )}
                                </div>

                                {/* Link Button Trigger */}
                                <div>
                                    {config?.isConfigured ? (
                                        linkToken ? (
                                            <PlaidLauncher 
                                                linkToken={linkToken} 
                                                onSuccess={() => {
                                                    setLinkToken(null);
                                                    setIsSettingsOpen(false);
                                                    fetchConfig();
                                                    fetchFinance();
                                                }}
                                            />
                                        ) : (
                                            <Button 
                                                onClick={handlePrepareLink} 
                                                disabled={generatingLinkToken} 
                                                className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                {generatingLinkToken ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Link className="h-3.5 w-3.5 mr-2" />}
                                                Link New Institution (Fidelity/Lending Club)
                                            </Button>
                                        )
                                    ) : (
                                        <div className="flex gap-2 p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px]">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>Please save your Plaid API Client ID and Secret key above to enable the "Link Institution" flow.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-1 flex-1 flex flex-col justify-between">
                <Tabs defaultValue={data.isPlaid ? "balances" : "spending"} className="w-full flex-1 flex flex-col justify-between space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="text-left">
                            <span className="text-xs text-muted-foreground">{data.isPlaid ? "Combined Net Worth" : "Total Expenses"}</span>
                            <h4 className="text-2xl font-black font-mono text-foreground tracking-tight">
                                ${data.isPlaid ? data.netWorth?.toLocaleString() : totalExpenses.toLocaleString()}
                            </h4>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            {data.isPlaid && refreshing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mr-1" />}
                            {data.isPlaid && !refreshing && (
                                <button onClick={() => fetchFinance(true)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground mr-1">
                                    <RefreshCw className="h-3 w-3" />
                                </button>
                            )}
                            <TabsList className="bg-muted/50 border h-8 p-0.5 rounded-lg">
                                {data.isPlaid && <TabsTrigger value="balances" className="text-[10px] px-2.5 py-1 rounded-md">Balances</TabsTrigger>}
                                <TabsTrigger value="spending" className="text-[10px] px-2.5 py-1 rounded-md">Spending</TabsTrigger>
                                {data.isPlaid && <TabsTrigger value="txs" className="text-[10px] px-2.5 py-1 rounded-md">Activity</TabsTrigger>}
                                <TabsTrigger value="trend" className="text-[10px] px-2.5 py-1 rounded-md">Trends</TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    {/* Balances Tab (Plaid only) */}
                    {data.isPlaid && data.accounts && (
                        <TabsContent value="balances" className="flex-1 min-h-[160px] flex flex-col justify-between mt-0 outline-none">
                            <ScrollArea className="h-[150px] pr-2">
                                <div className="space-y-2">
                                    {/* Display aggregated segments */}
                                    <div className="grid grid-cols-3 gap-2 pb-2 border-b border-border/40 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                                        <div className="flex items-center gap-1"><Wallet className="h-3 w-3 text-blue-500" /> Cash: ${data.totalCash?.toLocaleString()}</div>
                                        <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" /> Invest: ${data.totalInvestments?.toLocaleString()}</div>
                                        <div className="flex items-center gap-1"><CreditCard className="h-3 w-3 text-red-500" /> Debt: ${data.totalDebts?.toLocaleString()}</div>
                                    </div>

                                    {/* Account listing cards grouped by institution */}
                                    {data.accounts.map((acc) => (
                                        <div key={acc.accountId} className="flex justify-between items-center p-1.5 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors">
                                            <div className="overflow-hidden mr-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-xs truncate max-w-[150px]" title={acc.officialName}>{acc.name}</span>
                                                    <Badge variant="outline" className="text-[8px] h-3 px-1 py-0 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 capitalize">
                                                        {acc.institutionName}
                                                    </Badge>
                                                </div>
                                                <span className="text-[9px] text-muted-foreground capitalize">{acc.type} • {acc.subtype}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-mono text-xs font-bold ${acc.type === 'credit' || acc.type === 'loan' ? 'text-red-500' : 'text-foreground'}`}>
                                                    {acc.type === 'credit' || acc.type === 'loan' ? '-' : ''}${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <div className="pt-2 border-t text-[10px] text-muted-foreground flex justify-between items-center">
                                <span className="flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5 text-emerald-500" /> Bank-grade encryption verified</span>
                                <span className="text-emerald-500 font-bold font-mono">NET: ${data.netWorth?.toLocaleString()}</span>
                            </div>
                        </TabsContent>
                    )}

                    {/* Spending Tab */}
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
                                <span className="block opacity-60">{data.isPlaid ? "Cash Balance" : "Savings Goal"}</span>
                                <span className="font-bold text-foreground text-xs font-mono">
                                    ${data.isPlaid ? data.totalCash?.toLocaleString() : totalSavings.toLocaleString()}
                                </span>
                            </div>
                            <div className="col-span-2 text-right flex items-center justify-end gap-1 text-emerald-500 font-bold text-xs">
                                <TrendingUp className="h-3.5 w-3.5" /> 
                                {data.isPlaid ? (
                                    <span>Cash Reserve: {Math.round(((data.totalCash || 0) / (data.netWorth || 1)) * 100)}% of net wealth</span>
                                ) : (
                                    <span>Savings Rate: {Math.round((totalSavings / (totalExpenses + totalSavings)) * 100)}%</span>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Transactions Activity Tab (Plaid only) */}
                    {data.isPlaid && data.transactions && (
                        <TabsContent value="txs" className="flex-1 min-h-[160px] flex flex-col justify-between mt-0 outline-none">
                            <ScrollArea className="h-[150px] pr-2">
                                <div className="space-y-1.5">
                                    {data.transactions.length > 0 ? (
                                        data.transactions.map((tx) => (
                                            <div key={tx.id} className="flex justify-between items-center p-1.5 rounded-lg bg-muted/10 border border-border/20 text-[11px] hover:bg-muted/20 transition-colors">
                                                <div className="overflow-hidden mr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-foreground truncate max-w-[130px]">{tx.name}</span>
                                                        <Badge variant="outline" className="text-[7px] h-3 px-1 py-0 border-muted bg-muted/30 text-muted-foreground whitespace-nowrap">
                                                            {tx.category}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-[9px] text-muted-foreground">{new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {tx.institutionName}</span>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-foreground' : 'text-emerald-500'}`}>
                                                        {tx.amount > 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-xs text-muted-foreground">
                                            No transactions found in the last 30 days.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="pt-2 border-t text-[10px] text-muted-foreground flex justify-between items-center">
                                <span>Recent transactions feed</span>
                                <span className="text-emerald-500 font-bold">Aggregated</span>
                            </div>
                        </TabsContent>
                    )}

                    {/* Trends Tab */}
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

// Inner helper component to launch Plaid Link safely to prevent hook crashes if token is not ready
function PlaidLauncher({ linkToken, onSuccess }: { linkToken: string; onSuccess: () => void }) {
    const { open, ready } = usePlaidLink({
        token: linkToken,
        onSuccess: async (publicToken, metadata) => {
            try {
                const res = await fetch("/api/plaid/exchange", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        publicToken,
                        institutionId: metadata.institution?.institution_id || "unknown",
                        institutionName: metadata.institution?.name || "Financial Institution"
                    })
                });
                
                const json = await res.json();
                if (res.ok && json.success) {
                    toast({
                        title: "Account Sync Complete!",
                        description: `Successfully linked ${metadata.institution?.name || "your bank account"}.`
                    });
                    onSuccess();
                } else {
                    toast({
                        variant: "destructive",
                        title: "Token Exchange Failed",
                        description: json.error || "Please contact support."
                    });
                }
            } catch (e: any) {
                toast({
                    variant: "destructive",
                    title: "Network Error",
                    description: e.message || "Failed to exchange Plaid public token."
                });
            }
        },
        onExit: (error, metadata) => {
            if (error) {
                console.error("Plaid Link Exit Error:", error);
                toast({
                    variant: "destructive",
                    title: "Plaid Connection Closed",
                    description: error.display_message || "The authentication process was cancelled."
                });
            }
        }
    });

    return (
        <Button 
            onClick={() => open()} 
            disabled={!ready} 
            className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-750 text-white animate-pulse"
        >
            <ArrowUpRight className="h-3.5 w-3.5 mr-2" />
            Click here to authenticate with Plaid
        </Button>
    );
}
