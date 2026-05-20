import { NextRequest, NextResponse } from "next/server";
import { getPlaidClient, saveLinkedItem } from "@/lib/plaid-service";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { publicToken, institutionId, institutionName } = await req.json();
        
        if (!publicToken || !institutionId || !institutionName) {
            return NextResponse.json({ error: "Missing required fields: publicToken, institutionId, institutionName" }, { status: 400 });
        }

        const client = await getPlaidClient();
        
        // Exchange public_token for an access_token and item_id
        const response = await client.itemPublicTokenExchange({
            public_token: publicToken
        });
        
        const { access_token, item_id } = response.data;
        
        // Save the linked item in Firestore securely
        await saveLinkedItem({
            itemId: item_id,
            accessToken: access_token,
            institutionId,
            institutionName
        });
        
        return NextResponse.json({ 
            success: true, 
            itemId: item_id,
            institutionName 
        });
    } catch (e: any) {
        console.error("Error exchanging public token:", e.response?.data || e.message || e);
        const errDetails = e.response?.data?.error_message || e.message || "Failed to exchange public token";
        return NextResponse.json({ error: errDetails }, { status: 500 });
    }
}
