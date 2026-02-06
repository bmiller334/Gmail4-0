import { NextResponse } from 'next/server';
import { addCorrection } from '@/lib/db-service';
import { EMAIL_CATEGORIES } from '@/lib/categories';

export async function POST(req: Request) {
  try {
    const { id, sender, subject, snippet, wrongCategory, correctCategory } = await req.json();

    if (!id || !sender || !subject || !wrongCategory || !correctCategory) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!EMAIL_CATEGORIES.includes(correctCategory)) {
         return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    await addCorrection({
      id,
      sender,
      subject,
      snippet: snippet || '',
      wrongCategory,
      correctCategory,
      timestamp: new Date()
    });

    return NextResponse.json({ message: 'Correction logged successfully' });
  } catch (error) {
    console.error('Error logging correction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
