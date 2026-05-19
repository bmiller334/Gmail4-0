"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Play, Settings2 } from "lucide-react";

export function YoutubeWidget() {
    const [videoId, setVideoId] = useState("jfKfPfyJRdk"); // Default to Lofi Girl
    const [inputUrl, setInputUrl] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        // Extract video ID from URL
        // Match formats: ?v=ID, youtu.be/ID, embed/ID
        const match = inputUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        if (match && match[1]) {
            setVideoId(match[1]);
        }
        setIsEditing(false);
    };

    return (
        <Card className="hover:scale-[1.01] transition-transform duration-200 shadow-md hover:shadow-lg border-primary/20 overflow-hidden relative group h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-red-500/10 to-transparent">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Music className="h-4 w-4" /> YouTube Music
                </CardTitle>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-50 hover:opacity-100"
                    onClick={() => setIsEditing(!isEditing)}
                >
                    <Settings2 className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {isEditing ? (
                    <div className="p-4 space-y-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Paste a YouTube URL to play it here.</p>
                        <div className="flex items-center gap-2">
                            <Input 
                                placeholder="https://youtube.com/watch?v=..." 
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                className="h-8 text-sm"
                            />
                            <Button size="sm" onClick={handleSave} className="h-8">
                                <Play className="h-4 w-4 mr-1" /> Set
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="aspect-video w-full relative">
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                        ></iframe>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
