"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';

export function CommunityEvents() {
    // Hardcoded mock data for now - in production this would scrape a calendar
    const events = [
        { title: "Homecoming Game vs. Lakin", date: "Friday, 7:00 PM", type: "Sports" },
        { title: "Chamber Coffee @ Fairgrounds", date: "Thursday, 10:00 AM", type: "Business" },
        { title: "Farmer's Market", date: "Saturday, 8:00 AM", type: "Community" },
    ];

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Syracuse Community</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {events.map((evt, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded text-primary">
                                <Newspaper className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-sm font-medium">{evt.title}</div>
                                <div className="text-xs text-muted-foreground">{evt.date}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
