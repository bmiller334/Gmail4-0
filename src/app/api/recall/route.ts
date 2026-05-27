import { ai } from "@/ai/genkit";
import { getRecentLogs } from "@/lib/db-service";
import { getRecentDriveFiles, getRecentPhotos } from "@/lib/gmail-service";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { query } = await req.json();
        if (!query) {
            return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
        }

        // 1. Fetch the last 100 email logs, recent drive files, and photos
        const [logs, driveFiles, photos] = await Promise.all([
            getRecentLogs(100),
            getRecentDriveFiles(),
            getRecentPhotos()
        ]);

        if ((!logs || logs.length === 0) && (!driveFiles || driveFiles.length === 0) && (!photos || photos.length === 0)) {
            return NextResponse.json({
                response: "Your digital archive is currently empty. As soon as items are processed, they will appear here in your Assistant."
            });
        }

        // 2. Format logs for AI context
        const formattedLogs = logs && logs.length > 0 ? logs.map((log: any, index: number) => {
            const dateStr = log.timestamp?._seconds 
                ? new Date(log.timestamp._seconds * 1000).toLocaleString() 
                : new Date(log.timestamp).toLocaleString();
            return `[${index + 1}] Date: ${dateStr} | From: ${log.sender} | Subject: ${log.subject} | Category: ${log.category} | Urgent: ${log.isUrgent ? 'YES' : 'NO'} | Snippet: ${log.snippet || 'None'}`;
        }).join("\n---\n") : "No recent email logs.";

        const formattedDriveFiles = driveFiles && driveFiles.length > 0 
            ? driveFiles.map((file: any) => `- ${file.name} (Type: ${file.mimeType}, Modified: ${file.modifiedTime})`).join("\n")
            : "No recent Drive files found.";

        const formattedPhotos = photos && photos.length > 0
            ? photos.map((photo: any) => `- ${photo.filename} (Created: ${photo.mediaMetadata?.creationTime})`).join("\n")
            : "No recent Photos found.";


        // 3. Define the AI System Prompt and Instruction
        const systemPrompt = `
You are a highly capable and intelligent AI assistant powered by Gemini.
The user is asking you a question. You have access to their personal digital archives (the 100 most recent processed email logs listed below) as part of their profile context.

Your mission:
- Answer the user's question accurately and helpfully.
- If the question is about their personal information, emails, or recent events, use the provided email logs to answer it.
- If the question is a general knowledge question, coding question, or a creative request, answer it to the best of your ability as a general AI.
- Maintain a refined, articulate, and insightful tone.
- Use clean Markdown lists, bold highlights, and spacing to structure your response beautifully.
- When referencing emails, cite specific dates, senders, and email subjects so they have exact context.
- Keep your explanation concise and direct.

User Profile Context (Recent Email Logs):
${formattedLogs}

Recent Google Drive Files (Docs, Sheets, etc.):
${formattedDriveFiles}

Recent Google Photos:
${formattedPhotos}
`;

        // 4. Generate response using Genkit singleton + Gemini 2.5 Flash
        const { text } = await ai.generate({
            system: systemPrompt,
            prompt: `User Question: "${query}"\n\nSearch and answer:`,
            config: {
                temperature: 0.4, // Lower temperature for more accurate sifting
                maxOutputTokens: 1024
            }
        });

        return NextResponse.json({ response: text.trim() });
    } catch (error: any) {
        console.error("Mind Palace search failed:", error);
        return NextResponse.json({
            response: "I encountered an unexpected issue while retrieving your memories. Please allow me to try again shortly.",
            error: error.message
        }, { status: 500 });
    }
}
