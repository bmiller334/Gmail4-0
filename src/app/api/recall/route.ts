import { ai } from "@/ai/genkit";
import { getRecentLogs } from "@/lib/db-service";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { query } = await req.json();
        if (!query) {
            return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
        }

        // 1. Fetch the last 100 email logs from Firestore
        const logs = await getRecentLogs(100);

        if (!logs || logs.length === 0) {
            return NextResponse.json({
                response: "Your digital archive is currently empty. As soon as emails are processed, they will appear here in your Mind Palace."
            });
        }

        // 2. Format logs for AI context
        const formattedLogs = logs.map((log: any, index: number) => {
            const dateStr = log.timestamp?._seconds 
                ? new Date(log.timestamp._seconds * 1000).toLocaleString() 
                : new Date(log.timestamp).toLocaleString();
            return `[${index + 1}] Date: ${dateStr} | From: ${log.sender} | Subject: ${log.subject} | Category: ${log.category} | Urgent: ${log.isUrgent ? 'YES' : 'NO'} | Snippet: ${log.snippet || 'None'}`;
        }).join("\n---\n");

        // 3. Define the AI System Prompt and Instruction
        const systemPrompt = `
You are the "Mind Palace", a sophisticated, highly intelligent, and elegant personal memory archivist.
The user is querying their personal digital archives (the 100 most recent processed email logs listed below).

Your mission:
- Synthesize an elegant, accurate, and direct answer using ONLY the provided email log context.
- Maintain a refined, articulate, and insightful tone. Act like a master class librarian of their digital life.
- Use clean Markdown lists, bold highlights, and spacing to structure your response beautifully.
- Cite specific dates, senders, and email subjects so they have exact context.
- If you find no emails matching their query, respond with a polite, sophisticated message indicating that you searched the entire archive of recent events but found no matching records, perhaps suggesting a different query parameter.
- Keep your explanation concise and direct (aim for 3-5 sentences unless a longer breakdown is required).

Email Logs Context:
${formattedLogs}
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
