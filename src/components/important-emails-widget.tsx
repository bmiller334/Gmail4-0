"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, KeyRound, ExternalLink, Star, Check, Settings2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EMAIL_CATEGORIES } from "@/lib/categories";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EmailLog = {
    id: string;
    sender: string;
    subject: string;
    category: string;
    snippet?: string;
    timestamp: any;
    isUrgent?: boolean;
    otpCode?: string;
    isUnread?: boolean;
};

interface ImportantEmailsWidgetProps {
    logs: EmailLog[];
    onMarkAsRead?: (id: string) => Promise<void>;
    onCorrectCategory?: (log: any, newCategory: string) => Promise<void>;
}

export function ImportantEmailsWidget({ logs, onMarkAsRead, onCorrectCategory }: ImportantEmailsWidgetProps) {
    const { toast } = useToast();
    const [actioningId, setActioningId] = useState<string | null>(null);

    const [excludedCategories, setExcludedCategories] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("priority_inbox_excluded");
            return stored ? JSON.parse(stored) : ["Marketing", "Newsletter", "Promotions", "Social"];
        }
        return ["Marketing", "Newsletter", "Promotions", "Social"];
    });

    const toggleCategoryExclusion = (cat: string) => {
        const updated = excludedCategories.includes(cat)
            ? excludedCategories.filter(c => c !== cat)
            : [...excludedCategories, cat];
        setExcludedCategories(updated);
        localStorage.setItem("priority_inbox_excluded", JSON.stringify(updated));
    };

    const importantLogs = logs.filter(
        (log) => !excludedCategories.includes(log.category) && log.isUnread === true
    ).slice(0, 10); // Show top 10 unread

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({
            title: "Copied!",
            description: `OTP Code ${code} copied to clipboard.`,
        });
    };

    const handleMarkAsReadClick = async (id: string) => {
        if (!onMarkAsRead) return;
        setActioningId(id);
        try {
            await onMarkAsRead(id);
        } finally {
            setActioningId(null);
        }
    };

    const handleCategoryChange = async (log: EmailLog, newCategory: string) => {
        if (!onCorrectCategory) return;
        setActioningId(log.id);
        try {
            await onCorrectCategory(log, newCategory);
        } finally {
            setActioningId(null);
        }
    };

    if (importantLogs.length === 0) {
        return null; // Don't show if empty
    }

    return (
        <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800 shadow-sm transition-all duration-300 mb-6">
            <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-indigo-800 dark:text-indigo-400">
                        <Star className="h-5 w-5 fill-current animate-pulse" /> Priority Inbox
                    </CardTitle>
                    <CardDescription className="text-indigo-700/80 dark:text-indigo-500 mt-1">
                        Important updates, action items, and OTPs.
                    </CardDescription>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-800 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Priority Inbox Filters</h4>
                                <p className="text-xs text-muted-foreground">
                                    Configure which categories appear in your priority view.
                                </p>
                            </div>
                            <div className="grid gap-2 border-t pt-2 max-h-60 overflow-y-auto">
                                {EMAIL_CATEGORIES.map((category) => {
                                    const isShown = !excludedCategories.includes(category);
                                    return (
                                        <div key={category} className="flex items-center justify-between py-1">
                                            <Label htmlFor={`filter-${category}`} className="text-xs font-normal cursor-pointer flex-1">
                                                {category}
                                            </Label>
                                            <Switch
                                                id={`filter-${category}`}
                                                checked={isShown}
                                                onCheckedChange={() => toggleCategoryExclusion(category)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-3">
                    {importantLogs.map((log) => (
                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-card dark:bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow group gap-3">
                            <div className="flex-1 min-w-0">
                                <a
                                    href={`https://mail.google.com/mail/u/0/#all/${log.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-sm hover:underline flex items-center gap-1.5 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                                >
                                    {log.subject}
                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className="truncate max-w-[150px] sm:max-w-[200px]" title={log.sender}>{log.sender}</span>
                                    <span>•</span>
                                    
                                    <Select 
                                        value={log.category} 
                                        onValueChange={(val) => handleCategoryChange(log, val)}
                                        disabled={actioningId === log.id}
                                    >
                                        <SelectTrigger className="h-5 px-2 py-0 border-none shadow-none bg-indigo-50/50 dark:bg-indigo-950/30 text-[10px] hover:bg-indigo-100 dark:hover:bg-indigo-900/50 w-auto gap-1 text-indigo-700 dark:text-indigo-300 font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EMAIL_CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center ml-auto sm:ml-0">
                                {log.otpCode && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:hover:bg-indigo-800 dark:text-indigo-100 h-8 text-xs font-semibold"
                                        onClick={() => handleCopy(log.otpCode!)}
                                    >
                                        <KeyRound className="h-3.5 w-3.5" />
                                        <span className="font-mono tracking-wider">{log.otpCode}</span>
                                        <Copy className="h-3 w-3 opacity-50" />
                                    </Button>
                                )}
                                
                                {onMarkAsRead && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleMarkAsReadClick(log.id)}
                                        disabled={actioningId === log.id}
                                        className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950 border-indigo-200 dark:border-indigo-800"
                                        title="Mark as read"
                                    >
                                        {actioningId === log.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
