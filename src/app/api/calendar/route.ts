import { NextResponse } from "next/server";
import { getNextCalendarEvent } from "@/lib/gmail-service";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const event = await getNextCalendarEvent();
        return NextResponse.json({ event });
    } catch (error) {
        return NextResponse.json({ event: null }, { status: 500 });
    }
}
