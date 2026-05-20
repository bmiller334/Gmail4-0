"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, BrainCircuit, Loader2, CornerDownLeft, X, BookOpen } from "lucide-react";

const SUGGESTIONS = [
    "Have I received any invoices or receipts recently?",
    "Did I get any urgent emails in the last few days?",
    "Summarize my pending action items and requests.",
    "Show me a list of recent updates from newsletters."
];

export function MindPalace() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);

    const handleSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        setResponse(null);
        try {
            const res = await fetch("/api/recall", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchQuery })
            });
            if (res.ok) {
                const data = await res.json();
                setResponse(data.response);
            } else {
                setResponse("The gates to the Mind Palace are temporarily locked. Please check back in a moment.");
            }
        } catch (e) {
            setResponse("An unexpected shadow has crossed my recall memory. Let me retry shortly.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="relative overflow-hidden border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 group">
            {/* Background glowing particles */}
            <div className="absolute -right-16 -bottom-16 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/15 transition-all duration-300" />
            <div className="absolute left-1/3 -top-20 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl" />
            
            <CardContent className="p-6 relative z-10 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                        <h3 className="text-sm font-extrabold tracking-wider text-violet-600 dark:text-violet-400 uppercase flex items-center gap-1.5">
                            <BrainCircuit className="h-4 w-4 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] animate-pulse" /> Mind Palace
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Recall facts, summarize events, and search your personal inbox archives semantically.
                        </p>
                    </div>
                </div>

                {/* Main Search Input Form */}
                <div className="relative flex items-center gap-2">
                    <div className="relative flex-1 group/input">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-violet-500 transition-colors" />
                        <Input 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSearch(query);
                            }}
                            placeholder="Query your history: 'Any billing receipts?' or 'What did my boss email about?'..." 
                            className="pl-9 pr-10 h-10 text-xs bg-background/50 border-violet-500/20 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 backdrop-blur-sm"
                            disabled={loading}
                        />
                        {query && (
                            <button 
                                onClick={() => setQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    
                    <Button 
                        onClick={() => handleSearch(query)}
                        disabled={loading || !query.trim()}
                        size="sm"
                        className="h-10 bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 flex items-center gap-1.5 shadow-md shadow-violet-500/10 hover:shadow-violet-500/25 transition-all"
                    >
                        {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <>
                                <span>Recall</span>
                                <CornerDownLeft className="h-3 w-3 opacity-60" />
                            </>
                        )}
                    </Button>
                </div>

                {/* Suggestions Pills */}
                {!response && !loading && (
                    <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Suggested Inquiries:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => {
                                        setQuery(suggestion);
                                        handleSearch(suggestion);
                                    }}
                                    className="text-[10px] text-muted-foreground bg-muted/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 border border-muted-foreground/10 hover:border-violet-500/20 px-2.5 py-1 rounded-full transition-all duration-200 text-left font-medium max-w-full truncate"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading state */}
                {loading && (
                    <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-6 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
                        <div className="relative flex items-center justify-center">
                            {/* Neural waves animation */}
                            <div className="absolute w-12 h-12 rounded-full border border-violet-500/20 animate-ping" />
                            <div className="absolute w-8 h-8 rounded-full border border-violet-500/30 animate-pulse" />
                            <BrainCircuit className="h-6 w-6 text-violet-500 animate-bounce" />
                        </div>
                        <p className="text-xs text-muted-foreground text-center animate-pulse">
                            Consulting the archives. Scanning digital records...
                        </p>
                    </div>
                )}

                {/* AI Response Text Box */}
                {response && !loading && (
                    <div className="relative bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-transparent border border-violet-500/15 rounded-xl p-4.5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between border-b border-violet-500/10 pb-2">
                            <span className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5" /> Retrieved Memory
                            </span>
                            <button
                                onClick={() => setResponse(null)}
                                className="text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        
                        {/* High-fidelity formatted markdown text container */}
                        <div className="text-sm text-foreground leading-relaxed font-medium space-y-2 prose prose-invert max-w-none">
                            {response.split("\n").map((line, i) => {
                                // Simple markdown bold parsing
                                const boldParsed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                
                                // Render lists properly
                                if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
                                    return (
                                        <li 
                                            key={i} 
                                            className="text-xs list-disc list-inside pl-1 py-0.5 text-muted-foreground dark:text-foreground"
                                            dangerouslySetInnerHTML={{ __html: boldParsed.replace(/^[-*]\s*/, '') }}
                                        />
                                    );
                                }
                                return (
                                    <p 
                                        key={i} 
                                        className="text-xs" 
                                        dangerouslySetInnerHTML={{ __html: boldParsed }} 
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
