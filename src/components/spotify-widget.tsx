"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Play, Settings2, Disc, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PRESETS = [
    { name: "Lofi Focus", id: "0vvXsWCC3xrXsKd4IQUMt3" },
    { name: "Synthwave", id: "37i9dQZF1DXdLTE754J1pf" },
    { name: "Deep Study", id: "37i9dQZF1DX8Uebhn9wzrS" },
    { name: "Classic Rock", id: "37i9dQZF1DX4sWSpwq3LiO" }
];

export function SpotifyWidget() {
    const [spotifyPlaylistId, setSpotifyPlaylistId] = useState("0vvXsWCC3xrXsKd4IQUMt3");
    const [youtubeVideoId, setYoutubeVideoId] = useState("jfKfPfyJRdk"); // Lofi Girl
    
    const [inputUrl, setInputUrl] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("spotify");

    const handleSave = () => {
        if (!inputUrl) return;

        if (activeTab === "spotify") {
            // Match formats: spotify.com/playlist/ID, embed/playlist/ID, etc.
            const match = inputUrl.match(/playlist\/([a-zA-Z0-9]+)/);
            if (match && match[1]) {
                setSpotifyPlaylistId(match[1]);
            } else if (inputUrl.length > 15) {
                // Assume it might just be the ID or raw embed URL
                const idOnly = inputUrl.split("/").pop()?.split("?")[0];
                if (idOnly) setSpotifyPlaylistId(idOnly);
            }
        } else {
            // YouTube URL extraction
            const match = inputUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
            if (match && match[1]) {
                setYoutubeVideoId(match[1]);
            }
        }
        setIsEditing(false);
        setInputUrl("");
    };

    return (
        <Card className="hover:scale-[1.01] transition-all duration-200 shadow-md hover:shadow-lg border-red-500/20 bg-gradient-to-br from-red-500/5 via-background to-transparent overflow-hidden relative group h-full flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 bg-gradient-to-r from-red-500/10 to-transparent">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Music className="h-4 w-4 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> Media Player
                </CardTitle>
                <div className="flex items-center gap-2">
                    {/* Glowing vinyl disc micro-animation */}
                    <Disc className="h-4 w-4 text-red-500/40 animate-spin" style={{ animationDuration: '6s' }} />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-50 hover:opacity-100"
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        <Settings2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            
            <CardContent className="p-0 flex-1 flex flex-col justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col justify-between">
                    <div className="px-4 py-1 flex justify-between items-center border-b">
                        <TabsList className="bg-muted/50 border h-7 p-0.5 rounded-lg">
                            <TabsTrigger value="spotify" className="text-[10px] px-2.5 py-0.5 rounded-md">Spotify</TabsTrigger>
                            <TabsTrigger value="youtube" className="text-[10px] px-2.5 py-0.5 rounded-md">YouTube</TabsTrigger>
                        </TabsList>
                        
                        {/* Interactive equalizer audio spectrum animation */}
                        <div className="flex items-end gap-[2px] h-3.5 px-2">
                            <div className="w-[2px] bg-red-500/80 rounded-full animate-[pulse_0.8s_infinite]" style={{ animationDelay: '0.1s', height: '100%' }}></div>
                            <div className="w-[2px] bg-red-500/80 rounded-full animate-[pulse_0.6s_infinite]" style={{ animationDelay: '0.3s', height: '60%' }}></div>
                            <div className="w-[2px] bg-red-500/80 rounded-full animate-[pulse_0.9s_infinite]" style={{ animationDelay: '0.5s', height: '80%' }}></div>
                            <div className="w-[2px] bg-red-500/80 rounded-full animate-[pulse_0.7s_infinite]" style={{ animationDelay: '0.2s', height: '40%' }}></div>
                        </div>
                    </div>

                    <div className="flex-1">
                        {isEditing ? (
                            <div className="p-4 space-y-3 bg-muted/30 flex-1 flex flex-col justify-center h-full">
                                <p className="text-xs text-muted-foreground">
                                    {activeTab === "spotify" 
                                        ? "Paste a Spotify Playlist link below:" 
                                        : "Paste a YouTube Video URL below:"}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        placeholder={activeTab === "spotify" 
                                            ? "https://open.spotify.com/playlist/..." 
                                            : "https://youtube.com/watch?v=..."} 
                                        value={inputUrl}
                                        onChange={(e) => setInputUrl(e.target.value)}
                                        className="h-8 text-xs bg-background/50 border-muted"
                                    />
                                    <Button size="sm" onClick={handleSave} className="h-8 bg-red-600 hover:bg-red-500">
                                        <Play className="h-3 w-3 mr-1" /> Load
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col justify-between">
                                <TabsContent value="spotify" className="mt-0 outline-none flex-1 flex flex-col justify-between">
                                    <div className="aspect-video w-full relative">
                                        <iframe
                                            src={`https://open.spotify.com/embed/playlist/${spotifyPlaylistId}?utm_source=generator&theme=0`}
                                            width="100%"
                                            height="100%"
                                            frameBorder="0"
                                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                            loading="lazy"
                                            className="absolute inset-0 w-full h-full border-none"
                                        ></iframe>
                                    </div>
                                    <div className="p-2 border-t flex flex-wrap gap-1 bg-muted/10 justify-center">
                                        {PRESETS.map(preset => (
                                            <Button 
                                                key={preset.id}
                                                size="sm"
                                                variant={spotifyPlaylistId === preset.id ? "secondary" : "ghost"}
                                                className="text-[9px] h-6 px-2 font-medium"
                                                onClick={() => setSpotifyPlaylistId(preset.id)}
                                            >
                                                {preset.name}
                                            </Button>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="youtube" className="mt-0 outline-none flex-1">
                                    <div className="aspect-video w-full relative">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&controls=1&rel=0`}
                                            title="YouTube music player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="absolute inset-0 w-full h-full"
                                        ></iframe>
                                    </div>
                                </TabsContent>
                            </div>
                        )}
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}
