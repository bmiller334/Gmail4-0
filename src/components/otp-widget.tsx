"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Copy, Check, X, ShieldCheck, Timer, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OtpData = {
    id: string;
    code: string;
    sender: string;
    subject: string;
    timestamp: any;
};

const LOCAL_STORAGE_CLEARED_KEY = "gmail_otp_cleared_ids";
const LOCAL_STORAGE_COPIED_KEY = "gmail_otp_copy_time_";

export function OtpWidget() {
    const [otp, setOtp] = useState<OtpData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const [manualCleared, setManualCleared] = useState(false);
    
    const { toast } = useToast();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const getClearedIds = (): string[] => {
        try {
            const item = localStorage.getItem(LOCAL_STORAGE_CLEARED_KEY);
            return item ? JSON.parse(item) : [];
        } catch {
            return [];
        }
    };

    const addClearedId = (id: string) => {
        try {
            const cleared = getClearedIds();
            if (!cleared.includes(id)) {
                cleared.push(id);
                localStorage.setItem(LOCAL_STORAGE_CLEARED_KEY, JSON.stringify(cleared.slice(-50)));
            }
        } catch (e) {
            console.error("Failed to save cleared OTP ID to localStorage", e);
        }
    };

    const fetchOtp = async () => {
        try {
            const res = await fetch('/api/otp');
            if (!res.ok) return;
            const data = await res.json();
            
            if (data.otp && data.otp.code) {
                const clearedIds = getClearedIds();
                if (clearedIds.includes(data.otp.id)) {
                    setOtp(null);
                    setManualCleared(true);
                } else {
                    setOtp(data.otp);
                    setManualCleared(false);
                    checkCopyTimer(data.otp.id);
                }
            } else {
                setOtp(null);
            }
        } catch (err) {
            console.error("Failed to fetch OTP code:", err);
        } finally {
            setLoading(false);
        }
    };

    const checkCopyTimer = (otpId: string) => {
        const copyTimeStr = localStorage.getItem(`${LOCAL_STORAGE_COPIED_KEY}${otpId}`);
        if (copyTimeStr) {
            const copyTime = parseInt(copyTimeStr, 10);
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - copyTime) / 1000);
            const remaining = 120 - elapsedSeconds;

            if (remaining <= 0) {
                // 2 minutes already passed since copy
                addClearedId(otpId);
                setOtp(null);
                setSecondsLeft(null);
                setCopied(false);
            } else {
                setCopied(true);
                setSecondsLeft(remaining);
                startCountdown(otpId, remaining);
            }
        }
    };

    const startCountdown = (otpId: string, initialSeconds: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        
        let currentSeconds = initialSeconds;
        setSecondsLeft(currentSeconds);

        timerRef.current = setInterval(() => {
            currentSeconds -= 1;
            if (currentSeconds <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                addClearedId(otpId);
                setOtp(null);
                setCopied(false);
                setSecondsLeft(null);
                toast({
                    title: "OTP Cleared",
                    description: "The copied OTP code auto-cleared after 2 minutes.",
                });
            } else {
                setSecondsLeft(currentSeconds);
            }
        }, 1000);
    };

    useEffect(() => {
        fetchOtp();

        // Refresh check every 15 seconds for incoming OTPs
        const interval = setInterval(fetchOtp, 15000);
        return () => {
            clearInterval(interval);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleCopy = () => {
        if (!otp || !otp.code) return;

        navigator.clipboard.writeText(otp.code);
        setCopied(true);

        toast({
            title: "OTP Code Copied!",
            description: `"${otp.code}" copied to clipboard. Auto-clearing in 2 minutes.`,
        });

        // Save copy timestamp to localStorage
        const now = Date.now();
        localStorage.setItem(`${LOCAL_STORAGE_COPIED_KEY}${otp.id}`, now.toString());

        // Start 2-minute countdown (120 seconds)
        startCountdown(otp.id, 120);
    };

    const handleManualClear = () => {
        if (!otp) return;
        
        if (timerRef.current) clearInterval(timerRef.current);
        addClearedId(otp.id);
        localStorage.removeItem(`${LOCAL_STORAGE_COPIED_KEY}${otp.id}`);
        setOtp(null);
        setCopied(false);
        setSecondsLeft(null);
        setManualCleared(true);

        toast({
            title: "Cleared Code",
            description: "OTP code dismissed from widget.",
        });
    };

    const formatSeconds = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const remSec = sec % 60;
        return `${mins}:${remSec < 10 ? '0' : ''}${remSec}`;
    };

    const cleanSender = (senderStr: string) => {
        return senderStr.replace(/<.*?>/, '').replace(/"/g, '').trim();
    };

    if (loading) {
        return (
            <Card className="w-full border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <KeyRound className="h-5 w-5 text-primary animate-pulse" />
                        <span className="text-sm font-medium text-muted-foreground animate-pulse">Checking for recent OTP / SSO codes...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!otp) {
        return (
            <Card className="w-full border-border/40 bg-card/60 backdrop-blur-sm shadow-sm transition-all hover:border-border">
                <CardContent className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted/50 text-muted-foreground">
                            <KeyRound className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                OTP & SSO Access Hub
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">Active</Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                No active codes right now. New OTP / 2FA verification emails will automatically appear here.
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={fetchOtp} title="Check for new code">
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-card to-background shadow-md hover:shadow-lg transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-primary text-primary-foreground shadow-md shrink-0 mt-0.5 sm:mt-0">
                        <ShieldCheck className="h-6 w-6" />
                    </div>

                    <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 text-xs px-2 py-0.5 font-bold uppercase tracking-wider">
                                OTP / SSO Verification
                            </Badge>
                            <span className="text-xs font-semibold text-foreground truncate max-w-[200px]" title={otp.sender}>
                                {cleanSender(otp.sender)}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[320px]" title={otp.subject}>
                            {otp.subject}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* OTP Code Display */}
                    <div className={`px-4 py-2 rounded-lg border-2 font-mono font-extrabold text-xl sm:text-2xl tracking-widest transition-all ${
                        copied 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                            : 'bg-background border-primary/40 text-primary shadow-inner'
                    }`}>
                        {otp.code}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={handleCopy} 
                            size="sm"
                            className={`min-w-[100px] gap-1.5 font-semibold transition-all ${
                                copied 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 animate-bounce" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    Copy Code
                                </>
                            )}
                        </Button>

                        {/* Manual Clear Button */}
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                            onClick={handleManualClear}
                            title="Clear code from widget"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>

            {/* Countdown bar if copied */}
            {copied && secondsLeft !== null && (
                <div className="px-5 pb-2.5 pt-0 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-medium border-t border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                        <span>Code copied to clipboard</span>
                    </div>
                    <span>Auto-clearing window in <strong>{formatSeconds(secondsLeft)}</strong></span>
                </div>
            )}
        </Card>
    );
}
