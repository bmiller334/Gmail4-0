"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, TrendingUp, AlertCircle, RefreshCw, HelpCircle, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type MonarchAccount = {
    id: string;
    displayName: string;
    currentBalance: number;
    type: {
        name: string;
    };
};

export function MonarchWidget() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [accounts, setAccounts] = useState<MonarchAccount[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
      // Check if API key is stored locally
      const storedKey = localStorage.getItem("monarch_api_key");
      if (storedKey) {
          setApiKey(storedKey);
          fetchMonarchData(storedKey);
      }
  }, []);

  const fetchMonarchData = async (key: string) => {
      setLoading(true);
      try {
          const res = await fetch('/api/monarch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: key })
          });
          
          const data = await res.json();

          if (res.ok && data.accounts) {
              setAccounts(data.accounts);
              const total = data.accounts.reduce((sum: number, acc: MonarchAccount) => sum + acc.currentBalance, 0);
              
              setNetWorth(total);
              setIsConnected(true);
              localStorage.setItem("monarch_api_key", key);
          } else {
              throw new Error(data.error || "Failed to fetch data");
          }
      } catch (err: any) {
          console.error(err);
          if (isConnected) {
              toast({ variant: "destructive", title: "Monarch Sync Failed", description: err.message });
          }
          if (!isConnected) {
             localStorage.removeItem("monarch_api_key");
          }
      } finally {
          setLoading(false);
      }
  };

  const handleConnect = () => {
      if (!apiKey) return;
      fetchMonarchData(apiKey);
  };

  const handleDisconnect = () => {
      localStorage.removeItem("monarch_api_key");
      setIsConnected(false);
      setAccounts([]);
      setNetWorth(0);
      setApiKey("");
  };

  if (!isConnected) {
    return (
        <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Financial Overview</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-[180px] space-y-4 text-center">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Connect Monarch Money</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                            View your net worth and account balances directly.
                        </p>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="w-full max-w-[150px]">
                                Connect Account
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Connect Monarch Money</DialogTitle>
                                <DialogDescription>
                                    Monarch does not have a public API yet, so you need to use your session token.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>How to get your Token</AlertTitle>
                                    <AlertDescription className="text-xs mt-1 space-y-2">
                                        <p>1. Open <a href="https://app.monarchmoney.com" target="_blank" className="underline font-medium">Monarch Money</a> in Chrome/Edge.</p>
                                        <p>2. Right-click anywhere and select <b>Inspect</b>.</p>
                                        <p>3. Go to the <b>Network</b> tab and refresh the page.</p>
                                        <p>4. Click any request starting with <code>graphql</code>.</p>
                                        <p>5. In <b>Headers</b>, find <code>Authorization</code>.</p>
                                        <p>6. Copy the long string starting after <code>Token ...</code></p>
                                    </AlertDescription>
                                </Alert>

                                <div className="grid gap-2">
                                    <Label htmlFor="api-key">Session Token</Label>
                                    <Input 
                                        id="api-key" 
                                        type="password"
                                        placeholder="Paste token here..." 
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleConnect} disabled={loading || !apiKey}>
                                    {loading ? "Connecting..." : "Sync Account"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fetchMonarchData(apiKey)}>
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                Live
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div>
            <div className="text-2xl font-bold flex items-baseline gap-2 mb-4">
                ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <div className="space-y-3 max-h-[120px] overflow-y-auto pr-1">
                {accounts.slice(0, 4).map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="p-1 bg-secondary rounded-full shrink-0">
                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <span className="truncate max-w-[120px]" title={acc.displayName}>{acc.displayName}</span>
                        </div>
                        <div className={`text-right font-medium ${acc.currentBalance < 0 ? 'text-destructive' : ''}`}>
                            ${acc.currentBalance.toLocaleString()}
                        </div>
                    </div>
                ))}
                {accounts.length > 4 && (
                    <div className="text-xs text-center text-muted-foreground pt-1">
                        + {accounts.length - 4} more accounts
                    </div>
                )}
            </div>
        </div>
        
        <div className="pt-4 mt-2 border-t flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">Data from Monarch</span>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-destructive" onClick={handleDisconnect}>
                Disconnect
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
