"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Music, Play, Radio, BookOpen, ExternalLink, Headphones, Disc, Settings2, Sparkles, Plus, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// High-fidelity default YouTube Music/YouTube presets
const YT_PRESETS = [
    { name: "Lofi Focus", id: "jfKfPfyJRdk" },
    { name: "Synthwave", id: "4xDzrJKXOOY" },
    { name: "Deep Study", id: "5qap5aO4i9A" },
    { name: "Classical Focus", id: "mIYzp5rcgHM" }
];

// Premium SiriusXM favorite station presets
const SIRIUS_PRESETS = [
    { name: "Hits 1", genre: "Pop & Hits", frequency: "Ch. 2", query: "Hits%201", color: "from-blue-500 to-indigo-600" },
    { name: "Classic Vinyl", genre: "Classic Rock", frequency: "Ch. 26", query: "Classic%20Vinyl", color: "from-amber-500 to-orange-600" },
    { name: "SiriusXM Chill", genre: "Downtempo & Ambient", frequency: "Ch. 53", query: "Chill", color: "from-teal-500 to-cyan-600" },
    { name: "Symphony Hall", genre: "Classical", frequency: "Ch. 76", query: "Symphony%20Hall", color: "from-purple-500 to-pink-600" }
];

export function MediaWidget() {
    const [activeTab, setActiveTab] = useState("ytmusic");
    const [ytVideoId, setYtVideoId] = useState("jfKfPfyJRdk");
    const [inputUrl, setInputUrl] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // Audible Active Tracker State (with local storage persistence)
    const [audiobookTitle, setAudiobookTitle] = useState("Project Hail Mary");
    const [audiobookAuthor, setAudiobookAuthor] = useState("Andy Weir");
    const [audiobookProgress, setAudiobookProgress] = useState(62);
    const [audiobookRemaining, setAudiobookRemaining] = useState("4h 15m");
    const [isEditingAudible, setIsEditingAudible] = useState(false);

    // Save and load Audible progress from localStorage on mount
    useEffect(() => {
        const storedTitle = localStorage.getItem("audible_title");
        const storedAuthor = localStorage.getItem("audible_author");
        const storedProgress = localStorage.getItem("audible_progress");
        const storedRemaining = localStorage.getItem("audible_remaining");

        if (storedTitle) setAudiobookTitle(storedTitle);
        if (storedAuthor) setAudiobookAuthor(storedAuthor);
        if (storedProgress) setAudiobookProgress(Number(storedProgress));
        if (storedRemaining) setAudiobookRemaining(storedRemaining);
    }, []);

    const saveAudibleState = (title: string, author: string, progress: number, remaining: string) => {
        localStorage.setItem("audible_title", title);
        localStorage.setItem("audible_author", author);
        localStorage.setItem("audible_progress", String(progress));
        localStorage.setItem("audible_remaining", remaining);
        setIsEditingAudible(false);
    };

    const handleSaveYt = () => {
        if (!inputUrl) return;
        // YouTube URL/ID extraction supporting watch?v=, embeds, short urls, or direct playlist ids
        const match = inputUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        if (match && match[1]) {
            setYtVideoId(match[1]);
        } else if (inputUrl.length < 15) {
            setYtVideoId(inputUrl); // treat short strings as direct IDs
        }
        setIsEditing(false);
        setInputUrl("");
    };

    return (
        <Card className="hover:scale-[1.01] transition-all duration-200 shadow-md hover:shadow-lg border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-background to-transparent overflow-hidden relative group h-full flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 bg-gradient-to-r from-rose-500/10 to-transparent">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <Headphones className="h-4 w-4 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> Personal Media Station
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Disc className="h-4 w-4 text-rose-500/40 animate-spin" style={{ animationDuration: '8s' }} />
                    {activeTab === "ytmusic" && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-50 hover:opacity-100"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            
            <CardContent className="p-0 flex-1 flex flex-col justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col justify-between">
                    <div className="px-4 py-1 flex justify-between items-center border-b">
                        <TabsList className="bg-muted/50 border h-7 p-0.5 rounded-lg">
                            <TabsTrigger value="ytmusic" className="text-[10px] px-2 py-0.5 rounded-md">YouTube Music</TabsTrigger>
                            <TabsTrigger value="sirius" className="text-[10px] px-2 py-0.5 rounded-md">SiriusXM</TabsTrigger>
                            <TabsTrigger value="audible" className="text-[10px] px-2 py-0.5 rounded-md">Audible</TabsTrigger>
                        </TabsList>
                        
                        {/* Audio Waveform Micro-Animation */}
                        <div className="flex items-end gap-[2px] h-3.5 px-2">
                            <div className="w-[2px] bg-rose-500/80 rounded-full animate-[pulse_0.8s_infinite]" style={{ animationDelay: '0.1s', height: '100%' }}></div>
                            <div className="w-[2px] bg-rose-500/80 rounded-full animate-[pulse_0.6s_infinite]" style={{ animationDelay: '0.3s', height: '60%' }}></div>
                            <div className="w-[2px] bg-rose-500/80 rounded-full animate-[pulse_0.9s_infinite]" style={{ animationDelay: '0.5s', height: '80%' }}></div>
                            <div className="w-[2px] bg-rose-500/80 rounded-full animate-[pulse_0.7s_infinite]" style={{ animationDelay: '0.2s', height: '40%' }}></div>
                        </div>
                    </div>

                    <div className="flex-1">
                        {/* Tab 1: YouTube Music Embed */}
                        <TabsContent value="ytmusic" className="mt-0 outline-none flex-1 flex flex-col justify-between">
                            {isEditing ? (
                                <div className="p-4 space-y-3 bg-muted/30 flex-1 flex flex-col justify-center h-72">
                                    <p className="text-xs text-muted-foreground">
                                        Paste a YouTube / YouTube Music URL or Video ID below:
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            placeholder="https://music.youtube.com/watch?v=..."
                                            value={inputUrl}
                                            onChange={(e) => setInputUrl(e.target.value)}
                                            className="h-8 text-xs bg-background/50 border-muted"
                                        />
                                        <Button size="sm" onClick={handleSaveYt} className="h-8 bg-rose-600 hover:bg-rose-500 text-white">
                                            <Play className="h-3 w-3 mr-1" /> Load
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full flex flex-col justify-between">
                                    <div className="aspect-video w-full relative bg-black">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=0&controls=1&rel=0&modestbranding=1`}
                                            title="YouTube Music player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="absolute inset-0 w-full h-full"
                                        ></iframe>
                                    </div>
                                    <div className="p-2 border-t flex flex-wrap gap-1 bg-muted/10 justify-center">
                                        {YT_PRESETS.map(preset => (
                                            <Button 
                                                key={preset.id}
                                                size="sm"
                                                variant={ytVideoId === preset.id ? "secondary" : "ghost"}
                                                className="text-[9px] h-6 px-2 font-medium"
                                                onClick={() => setYtVideoId(preset.id)}
                                            >
                                                {preset.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Tab 2: SiriusXM Preset Tuner */}
                        <TabsContent value="sirius" className="mt-0 outline-none p-4 flex flex-col justify-between h-full space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <div>
                                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Radio className="h-3.5 w-3.5 text-rose-500" /> Digital Radio Tuner
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground">Select favorite channels to stream online</p>
                                </div>
                                <a 
                                    href="https://player.siriusxm.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 hover:underline"
                                >
                                    Launch Player <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {SIRIUS_PRESETS.map((preset) => (
                                    <a 
                                        key={preset.name}
                                        href={`https://player.siriusxm.com/query/${preset.query}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group/btn flex items-center gap-3 p-2.5 rounded-xl border border-muted-foreground/10 bg-gradient-to-r from-muted/30 to-background hover:border-rose-500/30 hover:scale-[1.02] transition-all duration-200"
                                    >
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.color} flex flex-col items-center justify-center text-white shadow-md shadow-black/10 group-hover/btn:scale-105 transition-transform`}>
                                            <span className="text-[8px] font-black uppercase opacity-85 leading-none">SXM</span>
                                            <span className="text-[9px] font-black tracking-tighter leading-none">{preset.name.match(/\d+/) || preset.name.charAt(0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-foreground truncate">{preset.name}</span>
                                                <span className="text-[8px] font-black text-rose-500 opacity-60 group-hover/btn:opacity-100 transition-opacity pr-1">{preset.frequency}</span>
                                            </div>
                                            <p className="text-[9px] text-muted-foreground truncate">{preset.genre}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>

                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5 text-[9px] text-muted-foreground flex gap-2 items-center">
                                <Sparkles className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 animate-pulse" />
                                <span>Clicking any station launches the <strong>SiriusXM Web Player</strong> directly tuned to your channel in a new tab for listening.</span>
                            </div>
                        </TabsContent>

                        {/* Tab 3: Audible Audiobook Active Tracker */}
                        <TabsContent value="audible" className="mt-0 outline-none p-4 flex flex-col justify-between h-full space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                                <div>
                                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5 text-rose-500" /> Current Audiobook Tracker
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground">Keep track of your active audiobooks</p>
                                </div>
                                
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-[9px] px-2 font-bold"
                                    onClick={() => setIsEditingAudible(!isEditingAudible)}
                                >
                                    {isEditingAudible ? "Cancel" : "Edit Details"}
                                </Button>
                            </div>

                            {isEditingAudible ? (
                                <div className="space-y-2 bg-muted/20 p-2.5 rounded-xl border">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-muted-foreground">Book Title</label>
                                            <Input 
                                                value={audiobookTitle}
                                                onChange={(e) => setAudiobookTitle(e.target.value)}
                                                className="h-7 text-[10px] bg-background"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-muted-foreground">Author</label>
                                            <Input 
                                                value={audiobookAuthor}
                                                onChange={(e) => setAudiobookAuthor(e.target.value)}
                                                className="h-7 text-[10px] bg-background"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 items-end">
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[9px] font-bold text-muted-foreground">Time Remaining</label>
                                            <Input 
                                                value={audiobookRemaining}
                                                onChange={(e) => setAudiobookRemaining(e.target.value)}
                                                placeholder="e.g. 4h 15m"
                                                className="h-7 text-[10px] bg-background"
                                            />
                                        </div>
                                        <Button 
                                            size="sm" 
                                            onClick={() => saveAudibleState(audiobookTitle, audiobookAuthor, audiobookProgress, audiobookRemaining)} 
                                            className="h-7 text-[9px] bg-rose-600 hover:bg-rose-500 text-white font-bold w-full"
                                        >
                                            <Check className="h-3 w-3 mr-1" /> Done
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-4 p-2 rounded-xl bg-gradient-to-r from-muted/30 to-background border">
                                    {/* Glassmorphic simulated book cover */}
                                    <div className="w-16 h-20 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-lg flex flex-col items-center justify-center p-1 text-center shadow-lg relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] z-0" />
                                        <BookOpen className="h-5 w-5 text-white/95 z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                                        <span className="text-[7px] font-black text-white/90 z-10 uppercase mt-1 tracking-wider leading-none">AUDIBLE</span>
                                        <span className="text-[6px] font-bold text-white/70 z-10 uppercase truncate w-full absolute bottom-1">{audiobookAuthor}</span>
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col justify-between py-0.5">
                                        <div className="space-y-0.5">
                                            <span className="text-[8px] font-extrabold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full tracking-wider">Listening</span>
                                            <h5 className="text-[11px] font-extrabold text-foreground leading-tight line-clamp-1">{audiobookTitle}</h5>
                                            <p className="text-[9px] text-muted-foreground truncate">by {audiobookAuthor}</p>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                                                <span>Progress: {audiobookProgress}%</span>
                                                <span className="font-medium text-rose-500">{audiobookRemaining} left</span>
                                            </div>
                                            <Slider 
                                                value={[audiobookProgress]} 
                                                onValueChange={(val) => {
                                                    setAudiobookProgress(val[0]);
                                                    localStorage.setItem("audible_progress", String(val[0]));
                                                }}
                                                max={100} 
                                                step={1} 
                                                className="py-1 cursor-pointer [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:bg-rose-500 [&_[role=slider]]:border-rose-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-[8px] text-muted-foreground">Syncs instantly with your local session</span>
                                <a 
                                    href="https://www.audible.com/library" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[9px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 hover:underline"
                                >
                                    Audible Library <ExternalLink className="h-2 w-2" />
                                </a>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}
