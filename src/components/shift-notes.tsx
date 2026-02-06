"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, StickyNote } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type Note = {
    id: string;
    content: string;
    createdAt: any;
    author: string;
};

export function ShiftNotes() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        const res = await fetch('/api/notes');
        const data = await res.json();
        if (data.notes) setNotes(data.notes);
    };

    const addNote = async () => {
        if (!newNote.trim()) return;
        
        await fetch('/api/notes', {
            method: 'POST',
            body: JSON.stringify({ content: newNote })
        });
        
        setNewNote("");
        fetchNotes();
        toast({ title: "Note Added" });
    };

    const deleteNote = async (id: string) => {
        await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
        setNotes(notes.filter(n => n.id !== id));
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <StickyNote className="h-4 w-4" /> Shift Handoff Notes
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[300px]">
                {notes.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-8">
                        No active notes.
                    </div>
                )}
                {notes.map(note => (
                    <div key={note.id} className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md border border-yellow-100 dark:border-yellow-900 relative group">
                        <p className="text-sm text-yellow-900 dark:text-yellow-100 whitespace-pre-wrap">{note.content}</p>
                        <div className="mt-2 text-[10px] text-yellow-700/60 dark:text-yellow-400/60 flex justify-between">
                             <span>{new Date(note.createdAt._seconds * 1000).toLocaleString()}</span>
                        </div>
                        <button 
                            onClick={() => deleteNote(note.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-yellow-800/50 hover:text-red-500 transition-opacity"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </CardContent>
            <CardFooter className="pt-2 border-t">
                <div className="flex w-full gap-2">
                    <Textarea 
                        placeholder="Type a note..." 
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[2.5rem] h-[2.5rem] py-1 text-sm resize-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                addNote();
                            }
                        }}
                    />
                    <Button size="icon" onClick={addNote}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
