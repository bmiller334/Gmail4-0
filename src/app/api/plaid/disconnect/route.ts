import { NextRequest, NextResponse } from "next/server";
import { disconnectLinkedItem } from "@/lib/plaid-service";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { itemId } = await req.json();
        
        if (!itemId) {
            return NextResponse.json({ error: "Missing required field: itemId" }, { status: 400 });
        }

        const success = await disconnectLinkedItem(itemId);
        
        if (!success) {
            return NextResponse.json({ error: "Linked item not found" }, { status: 404 });
        }
        
        return NextResponse.json({ success: true, message: "Item disconnected successfully." });
    } catch (e: any) {
        console.error("Error disconnecting Plaid item:", e.message || e);
        return NextResponse.json({ error: e.message || "Failed to disconnect Plaid item" }, { status: 500 });
    }
}
