import { NextResponse } from 'next/server';

const MONARCH_GRAPHQL_URL = 'https://api.monarchmoney.com/graphql';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    // Sanitize key: ensure it doesn't duplicate "Token" if the user pasted the whole string
    if (apiKey.startsWith('Token ')) {
        apiKey = apiKey.substring(6);
    }
    const authHeader = `Token ${apiKey.trim()}`;

    // Basic query to fetch accounts and net worth summary
    const query = `
      query GetFinancialSummary {
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

    const response = await fetch(MONARCH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Origin': 'https://app.monarchmoney.com',
        'Referer': 'https://app.monarchmoney.com/',
        'Accept': '*/*'
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Monarch API Error:", response.status, errorText);
        return NextResponse.json({ error: `Monarch API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    
    if (data.errors) {
        return NextResponse.json({ error: data.errors[0].message }, { status: 400 });
    }

    return NextResponse.json(data.data);
  } catch (error: any) {
    console.error("Monarch Proxy Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
