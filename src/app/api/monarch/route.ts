import { NextResponse } from 'next/server';
import fetchNode from 'node-fetch';

const MONARCH_GRAPHQL_URL = 'https://api.monarch.com/graphql';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    // Sanitize key
    if (apiKey.startsWith('Token ')) {
        apiKey = apiKey.substring(6).trim();
    }
    const authHeader = `Token ${apiKey}`;

    const query = `
      query GetAccountsUltraLight {
        accounts {
          id
          displayName
          currentBalance
          type {
            name
          }
        }
      }
    `;

    // We use node-fetch specifically because Next.js 15 native fetch (undici) 
    // TLS fingerprints are often hit with a 525 SSL Handshake Failed from Cloudflare.
    const response = await fetchNode(MONARCH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Origin': 'https://app.monarchmoney.com',
        'Accept': 'application/json',
        'Client-Platform': 'web',
        'device-uuid': 'unknown',
        'x-cio-client-platform': 'web',
        'x-cio-site-id': '2598be4aa410159198b2',
        'x-gist-user-anonymous': 'false'
      },
      body: JSON.stringify({ query: query.trim(), variables: {}, operationName: null }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Monarch API Error:", response.status, errorText);
        return NextResponse.json({ error: `Monarch API error: ${response.status}` }, { status: response.status });
    }

    const data: any = await response.json();
    
    if (data.errors) {
        return NextResponse.json({ error: data.errors[0].message }, { status: 400 });
    }

    return NextResponse.json(data.data);
  } catch (error: any) {
    console.error("Monarch Proxy Error using Custom Fetch:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
