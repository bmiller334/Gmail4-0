import { NextRequest, NextResponse } from "next/server";
import { addStoreNote, deleteStoreNote, getStoreNotes } from "@/lib/db-service";

export async function GET() {
    try {
        const notes = await getStoreNotes();
        return NextResponse.json({ notes });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { content } = await req.json();
        if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });
        
        await addStoreNote(content);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
        
        await deleteStoreNote(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
