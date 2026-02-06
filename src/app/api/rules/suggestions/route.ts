import { NextResponse } from 'next/server';
import { findSenderPatterns } from '@/lib/db-service';

export async function GET() {
    try {
        // Find senders with at least 3 occurrences and 100% consistency
        const suggestions = await findSenderPatterns(3, 1.0);
        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error("Error fetching pattern suggestions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
