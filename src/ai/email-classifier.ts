import { z } from "genkit";
import { ai } from "./genkit"; 
import { EMAIL_CATEGORIES, EmailCategory } from "@/lib/categories";
import { getCorrections, getUrgencyCorrections } from "@/lib/db-service";

const ClassificationSchema = z.object({
  category: z.string(),
  reasoning: z.string(),
  isUrgent: z.boolean(),
});

function normalize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchCategory(raw: string): EmailCategory {
    const cleanRaw = normalize(raw);
    
    // 1. Exact Match (Case Insensitive)
    const exact = EMAIL_CATEGORIES.find(c => c.toLowerCase() === raw.toLowerCase());
    if (exact) return exact;

    // 2. Normalized Match
    const normalized = EMAIL_CATEGORIES.find(c => normalize(c) === cleanRaw);
    if (normalized) return normalized;

    // 3. Substring Match (e.g. "Newsletters" -> "Newsletter")
    const substring = EMAIL_CATEGORIES.find(c => cleanRaw.includes(normalize(c)) || normalize(c).includes(cleanRaw));
    if (substring) return substring;

    // 4. Specific Mappings
    if (cleanRaw.includes("news")) return "Newsletter";
    if (cleanRaw.includes("promo")) return "Promotions";
    if (cleanRaw.includes("social")) return "Social";
    if (cleanRaw.includes("update")) return "Updates";
    if (cleanRaw.includes("finance")) return "Finance";
    if (cleanRaw.includes("bill")) return "Finance";
    if (cleanRaw.includes("invoice")) return "Finance";
    if (cleanRaw.includes("receipt")) return "Finance";
    if (cleanRaw.includes("alert")) return "Security Alerts";
    if (cleanRaw.includes("security")) return "Security Alerts";
    if (cleanRaw.includes("action")) return "[Action Required]";
    if (cleanRaw.includes("urgent")) return "[Action Required]";
    if (cleanRaw.includes("work")) return "Work";
    if (cleanRaw.includes("business")) return "Work";

    return "Manual Sort";
}

export const classifyEmail = ai.defineFlow(
  {
    name: "classifyEmail",
    inputSchema: z.object({
      subject: z.string(),
      sender: z.string(),
      snippet: z.string(),
    }),
    outputSchema: ClassificationSchema,
  },
  async (input) => {
    const { subject, sender, snippet } = input;
    
    // Log input to system logs so we can match it with output
    console.log(`[AI] Processing: "${subject}" from "${sender}"`);

    const [categoryCorrections, urgencyCorrections] = await Promise.all([
        getCorrections(5), 
        getUrgencyCorrections(5)
    ]);
    
    let examplesText = "";
    if (categoryCorrections.length > 0) {
        examplesText += `
Examples:
${categoryCorrections.map(c => `"${c.subject}" by ${c.sender} -> ${c.correctCategory}`).join('\n')}
        `;
    }

    if (urgencyCorrections.length > 0) {
        examplesText += `
Urgency Examples:
${urgencyCorrections.map(c => `"${c.subject}" by ${c.sender} -> ${c.shouldBeUrgent ? "URGENT" : "NORMAL"}`).join('\n')}
        `;
    }

    const categoriesList = EMAIL_CATEGORIES.join(", ");
    const prompt = `
You are an email classifier. 
Classify the email below into EXACTLY ONE of these categories: [${categoriesList}].

Respond with a valid JSON object ONLY. Do not wrap in markdown blocks.
Required JSON Format:
{
  "category": "String (Must match one of the listed categories exactly)",
  "reasoning": "String (Brief explanation)",
  "isUrgent": Boolean
}

${examplesText}

Email to classify:
From: ${sender}
Subject: ${subject}
Snippet: ${snippet}
    `;

    try {
        const { text } = await ai.generate({
          prompt: prompt,
          config: {
            temperature: 0.1, // Low temp for deterministic output
            maxOutputTokens: 200,
          }
        });

        // Debug: Log raw text to see what the model actually said
        // This will show up in the Logs page now that we fixed logging
        console.log(`[AI] Raw Model Output: ${text.substring(0, 100)}...`);

        // Clean the output
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let output;
        try {
            output = JSON.parse(cleanText);
        } catch (e) {
            console.warn(`[AI] JSON Parse Failed. Raw text: "${cleanText}"`);
            
            // Aggressive fallback: Extract anything that looks like a category
            const foundCategory = EMAIL_CATEGORIES.find(c => cleanText.toLowerCase().includes(c.toLowerCase()));
            if (foundCategory) {
                console.log(`[AI] Recovered category "${foundCategory}" from broken JSON.`);
                output = {
                    category: foundCategory,
                    reasoning: "Extracted from malformed AI response.",
                    isUrgent: cleanText.toLowerCase().includes("true")
                };
            } else {
                 throw new Error("Could not parse JSON or find category in text.");
            }
        }

        const rawCat = output.category ? output.category.trim() : "";
        const finalCategory = matchCategory(rawCat);

        if (finalCategory === "Manual Sort" && rawCat.toLowerCase() !== "manual sort") {
             console.warn(`[AI] Mismatch! Model said "${rawCat}", mapped to "Manual Sort". Check matchCategory logic.`);
        }

        return {
          category: finalCategory,
          reasoning: output.reasoning || "No reasoning provided.",
          isUrgent: !!output.isUrgent,
        };

    } catch (error: any) {
        console.error("[AI] Generation Error:", error.message);
        return {
            category: "Manual Sort",
            reasoning: "AI Error: " + error.message,
            isUrgent: false
        };
    }
  }
);
