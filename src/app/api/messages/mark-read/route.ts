import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/gmail-service';

export async function POST(req: Request) {
    try {
        const { id } = await req.json();
        
        if (!id) {
            return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
        }

        const gmail = await getGmailClient();
        
        // Mark message as read by removing the UNREAD label
        await gmail.users.messages.modify({
            userId: 'me',
            id: id,
            requestBody: {
                removeLabelIds: ['UNREAD']
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error marking message as read:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
