import { z } from "genkit";
import { ai } from "./genkit";

export const analyzeMarketSentiment = ai.defineFlow(
  {
    name: "analyzeMarketSentiment",
    inputSchema: z.object({
      headlines: z.array(z.string()),
    }),
    outputSchema: z.object({
        summary: z.string(),
        sentiment: z.enum(["Bullish", "Bearish", "Neutral"]),
    }),
  },
  async (input) => {
    const { headlines } = input;
    
    if (headlines.length === 0) {
        return { summary: "No market data available right now.", sentiment: "Neutral" as const };
    }

    const prompt = `
You are a financial analyst. Based on the following recent business and financial headlines, provide a very concise, 2-3 sentence summary of the general market mood and key drivers.
Also determine the overall sentiment (Bullish, Bearish, or Neutral).

Headlines:
${headlines.map(h => "- " + h).join("\n")}

Respond with a JSON object containing 'summary' (string) and 'sentiment' ("Bullish", "Bearish", or "Neutral"). Do NOT wrap the JSON in Markdown blocks (like \`\`\`json). Just the raw JSON.
`;

    try {
        const { text } = await ai.generate({
          prompt: prompt,
          config: {
            temperature: 0.3, 
          }
        });

        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanText);
        return {
            summary: parsed.summary,
            sentiment: parsed.sentiment
        };
    } catch (error: any) {
        console.error("[AI] Market Sentiment Error:", error.message);
        return { summary: "Market sentiment analysis temporarily unavailable.", sentiment: "Neutral" as const };
    }
  }
);
