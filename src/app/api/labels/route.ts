import { NextResponse } from 'next/server';
import { getGmailClient, listLabels, getUserLabels } from '@/lib/gmail-service';
import { EMAIL_CATEGORIES } from '@/lib/categories';

export const dynamic = 'force-dynamic';

let labelCache: Record<string, string> = {};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    
    try {
        const gmail = await getGmailClient();
        
        // Ensure cache is populated
        if (Object.keys(labelCache).length === 0) {
            const labels = await listLabels(gmail);
            if (labels) {
                // @ts-ignore
                labels.forEach(l => {
                    if (l.name && l.id) {
                        labelCache[l.name.toLowerCase()] = l.id;
                    }
                });
            }
        }

        if (category) {
            // Return 5 recent unread emails for this category
            let labelId = labelCache[category.toLowerCase()];
            const query = labelId ? `label:${labelId} is:unread` : `label:"${category}" is:unread`;
            
            const res = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 5
            });

            const messages = [];
            if (res.data.messages && res.data.messages.length > 0) {
                for (const m of res.data.messages) {
                    if (!m.id) continue;
                    const details = await gmail.users.messages.get({
                        userId: 'me',
                        id: m.id,
                        format: 'metadata',
                        metadataHeaders: ['Subject', 'From']
                    });
                    
                    const headers = details.data.payload?.headers;
                    const subject = headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
                    const sender = headers?.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
                    
                    messages.push({ id: m.id, subject, sender });
                }
            }
            return NextResponse.json({ messages });
        } else {
            // Return unread count for all standard categories
            const unreadCounts: Record<string, number> = {};
            
            await Promise.all(EMAIL_CATEGORIES.map(async (cat) => {
                const labelId = labelCache[cat.toLowerCase()];
                if (labelId) {
                    try {
                        const labelInfo = await gmail.users.labels.get({
                            userId: 'me',
                            id: labelId
                        });
                        unreadCounts[cat] = labelInfo.data.messagesUnread || 0;
                    } catch (e) {
                        console.error(`Failed to get unread count for label ${cat}:`, e);
                        unreadCounts[cat] = 0;
                    }
                } else {
                    unreadCounts[cat] = 0;
                }
            }));
            
            return NextResponse.json({ unreadCounts });
        }
    } catch (error) {
        console.error("Error in labels API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
