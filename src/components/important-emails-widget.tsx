"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, KeyRound, ExternalLink, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EmailLog = {
    id: string;
    sender: string;
    subject: string;
    category: string;
    timestamp: any;
    isUrgent?: boolean;
    otpCode?: string;
    isUnread?: boolean;
};

interface ImportantEmailsWidgetProps {
    logs: EmailLog[];
}

const EXCLUDED_CATEGORIES = ["Marketing", "Newsletter", "Promotions", "Social"];

export function ImportantEmailsWidget({ logs }: ImportantEmailsWidgetProps) {
    const { toast } = useToast();

    const importantLogs = logs.filter(
        (log) => !EXCLUDED_CATEGORIES.includes(log.category) && log.isUnread === true
    ).slice(0, 10); // Show top 10 unread

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({
            title: "Copied!",
            description: `OTP Code ${code} copied to clipboard.`,
        });
    };

    if (importantLogs.length === 0) {
        return null; // Don't show if empty
    }

    return (
        <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800 shadow-sm transition-all duration-300 mb-6">
            <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
                <CardTitle className="text-lg flex items-center gap-2 text-indigo-800 dark:text-indigo-400">
                    <Star className="h-5 w-5 fill-current" /> Priority Inbox
                </CardTitle>
                <CardDescription className="text-indigo-700/80 dark:text-indigo-500">
                    Important updates, action items, and OTPs.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-3">
                    {importantLogs.map((log) => (
                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex-1 min-w-0 mr-4">
                                <a
                                    href={`https://mail.google.com/mail/u/0/#all/${log.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-sm hover:underline flex items-center gap-1.5 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                                >
                                    {log.subject}
                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 truncate">
                                    <span className="truncate" title={log.sender}>{log.sender}</span>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-[10px] h-4 py-0 font-normal">
                                        {log.category}
                                    </Badge>
                                </div>
                            </div>
                            
                            {log.otpCode && (
                                <div className="mt-2 sm:mt-0 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:hover:bg-indigo-800 dark:text-indigo-100 w-full sm:w-auto"
                                        onClick={() => handleCopy(log.otpCode!)}
                                    >
                                        <KeyRound className="h-4 w-4" />
                                        <span className="font-mono font-bold tracking-wider">{log.otpCode}</span>
                                        <Copy className="h-3 w-3 ml-1 opacity-50" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
