import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/gmail-service';
import { saveWatchStatus } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const gmail = await getGmailClient();
    
    // Fallback to gmail4-0 project if GMAIL_TOPIC_NAME is not explicitly set
    const topicName = process.env.GMAIL_TOPIC_NAME || 'projects/gmail4-0/topics/gmail-incoming';
    
    console.log(`Setting up watch on topic: ${topicName}`);
    
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: topicName,
        labelFilterAction: 'include',
      },
    });
    
    // Save status to Firestore for dashboard visibility
    await saveWatchStatus(
      res.data.historyId || "unknown",
      new Date(Number(res.data.expiration)).toISOString()
    );

    return NextResponse.json({
      success: true,
      message: "Gmail watch successfully established.",
      historyId: res.data.historyId,
      expiration: new Date(Number(res.data.expiration)).toLocaleString(),
      topic: topicName,
      note: "This watch expires in ~7 days."
    });

  } catch (error: any) {
    console.error("Failed to set up Gmail watch:", error);
    return NextResponse.json({ 
        success: false,
        error: "Error setting up Gmail watch", 
        details: error.message 
    }, { status: 500 });
  }
}
