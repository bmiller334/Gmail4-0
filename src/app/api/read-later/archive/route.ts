import { NextResponse } from "next/server";
import { getGmailClient, listLabels } from "@/lib/gmail-service";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ error: "Missing email ID" }, { status: 400 });
        }

        const gmail = await getGmailClient();
        
        // 1. Find the "Read-Later" or "Read Later" label ID(s)
        const labels = await listLabels(gmail);
        const readLaterLabels = labels?.filter((l: any) => 
            l.name?.toLowerCase() === "read-later" || 
            l.name?.toLowerCase() === "read later"
        ) || [];
        
        const labelIdsToRemove = readLaterLabels.map((l: any) => l.id).filter(Boolean);

        if (labelIdsToRemove.length > 0) {
            console.log(`Archiving Read-Later message: ${id} by removing label IDs: ${labelIdsToRemove.join(', ')}`);
            
            // Remove the Read-Later label(s) in Gmail
            await gmail.users.messages.modify({
                userId: 'me',
                id: id,
                requestBody: {
                    removeLabelIds: labelIdsToRemove,
                },
            });
        }

        // 2. Archive or delete in Firestore logs so it disappears from the unread list
        const { getFirestore } = require('firebase-admin/firestore');
        const db = getFirestore();
        await db.collection('email_logs').doc(id).delete();

        console.log(`Successfully archived/deleted read-later log: ${id}`);
        return NextResponse.json({ message: "Bookmark checked off and archived." });
    } catch (err: any) {
        console.error("Failed to archive read-later item:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
