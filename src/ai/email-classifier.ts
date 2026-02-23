import { z } from "genkit";
import { ai } from "./genkit"; 
import { EMAIL_CATEGORIES, EmailCategory } from "@/lib/categories";
import { getCorrections, getUrgencyCorrections } from "@/lib/db-service";
import { getUserLabels } from "@/lib/gmail-service";

const ClassificationSchema = z.object({
  category: z.string(),
  reasoning: z.string(),
  isUrgent: z.boolean(),
});

function normalize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchCategory(raw: string, validCategories: string[]): string {
    const cleanRaw = normalize(raw);
    
    // 1. Exact Match (Case Insensitive)
    const exact = validCategories.find(c => c.toLowerCase() === raw.toLowerCase());
    if (exact) return exact;

    // 2. Normalized Match
    const normalized = validCategories.find(c => normalize(c) === cleanRaw);
    if (normalized) return normalized;

    // 3. Substring Match (e.g. "Newsletters" -> "Newsletter")
    const substring = validCategories.find(c => cleanRaw.includes(normalize(c)) || normalize(c).includes(cleanRaw));
    if (substring) return substring;
    
    // If no match found, fallback to Manual Sort
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

    const [categoryCorrections, urgencyCorrections, userLabels] = await Promise.all([
        getCorrections(5), 
        getUrgencyCorrections(5),
        getUserLabels()
    ]);

    // Use user labels if available, otherwise fallback to static list (though user requested to avoid default)
    // We add "Manual Sort" to ensure there's always a safe fallback
    const availableCategories = userLabels.length > 0 ? userLabels : Array.from(EMAIL_CATEGORIES);
    
    if (!availableCategories.some(c => c.toLowerCase() === "manual sort")) {
        availableCategories.push("Manual Sort");
    }

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

    const categoriesList = availableCategories.join(", ");
    const prompt = `
You are an email classifier. 
Classify the email below into EXACTLY ONE of these categories: [${categoriesList}].

Respond with a valid JSON object ONLY. Do not wrap in markdown blocks.
Required JSON Format:
{
  "category": "String (Must match one of the listed categories exactly)",
  "reasoning": "String (Very brief explanation, max 10 words)",
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
            maxOutputTokens: 2048, 
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
            const foundCategory = availableCategories.find(c => cleanText.toLowerCase().includes(c.toLowerCase()));
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
        const finalCategory = matchCategory(rawCat, availableCategories);

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
