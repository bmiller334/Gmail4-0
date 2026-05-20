import { NextRequest, NextResponse } from "next/server";
import { getPlaidClient, getPlaidConfig } from "@/lib/plaid-service";
import { Products, CountryCode } from "plaid";

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const client = await getPlaidClient();
        const config = await getPlaidConfig();
        
        // Build Plaid Link token request parameters
        const request = {
            user: {
                client_user_id: "syracuse-command-center-user",
            },
            client_name: "Syracusan Command Center",
            // For development/production, Plaid requires specifying products. 
            // 'transactions' is the standard product for fetching balances and transaction histories.
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
            language: "en",
        };

        const response = await client.linkTokenCreate(request);
        return NextResponse.json({ link_token: response.data.link_token });
    } catch (e: any) {
        console.error("Error creating Plaid Link Token:", e.response?.data || e.message || e);
        const errDetails = e.response?.data?.error_message || e.message || "Failed to create Link Token";
        return NextResponse.json({ error: errDetails }, { status: 500 });
    }
}
