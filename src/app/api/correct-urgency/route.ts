import { NextResponse } from 'next/server';
import { addUrgencyCorrection } from '@/lib/db-service';

export async function POST(req: Request) {
  try {
    const { id, sender, subject, snippet, wasUrgent, shouldBeUrgent } = await req.json();

    if (!id || !sender || !subject || wasUrgent === undefined || shouldBeUrgent === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await addUrgencyCorrection({
      id,
      sender,
      subject,
      snippet: snippet || '',
      wasUrgent,
      shouldBeUrgent,
      timestamp: new Date()
    });

    return NextResponse.json({ message: 'Urgency correction logged successfully' });
  } catch (error) {
    console.error('Error logging urgency correction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
