import { z } from "genkit";
import { ai } from "./genkit"; 
import { EMAIL_CATEGORIES, EmailCategory } from "@/lib/categories";
import { getCorrections, getUrgencyCorrections, saveAiSummary } from "@/lib/db-service";
import { getUserLabels } from "@/lib/gmail-service";

const ClassificationSchema = z.object({
  category: z.string(),
  reasoning: z.string(),
  isUrgent: z.boolean(),
  otpCode: z.string().optional(),
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
  "isUrgent": Boolean,
  "otpCode": "String or null (Extract any Verification Code, OTP, or 2FA code. Return null if none is found.)"
}

Guidelines for specific categories:
- "Read-Later": Use this category if the email is a link, bookmark, recipe, article, video link, or reading/listening material that the user sent to themselves or is meant to be read/watched later.

${examplesText}

Email to classify:
From: ${sender}
Subject: ${subject}
Snippet: ${snippet}
    `;

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
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
                        isUrgent: cleanText.toLowerCase().includes("true"),
                        otpCode: undefined
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

            // Log prompt and response to AI history
            await saveAiSummary({
                id: `classify_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                promptType: 'Classification',
                promptUsed: prompt,
                emailsIncluded: [subject],
                summaryResult: `Category: ${finalCategory}\nUrgent: ${!!output.isUrgent}\nReasoning: ${output.reasoning || "None"}`,
                timestamp: new Date()
            }).catch(err => console.error("Failed to log classification history:", err));

            return {
              category: finalCategory,
              reasoning: output.reasoning || "No reasoning provided.",
              isUrgent: !!output.isUrgent,
              otpCode: output.otpCode || undefined,
            };

        } catch (error: any) {
            attempt++;
            console.error(`[AI] Generation Error (Attempt ${attempt}/${maxRetries}):`, error.message);
            
            if (attempt >= maxRetries) {
                return {
                    category: "Manual Sort",
                    reasoning: "AI Error: " + error.message,
                    isUrgent: false,
                    otpCode: undefined
                };
            }
            
            // Wait before retrying (exponential backoff: 2s, 4s, etc.)
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[AI] Retrying in ${delay}ms due to error...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }

    return {
        category: "Manual Sort",
        reasoning: "AI Error: Max retries exceeded.",
        isUrgent: false,
        otpCode: undefined
    };
  }
);

export const summarizeCategoryEmails = ai.defineFlow(
  {
    name: "summarizeCategoryEmails",
    inputSchema: z.object({
      category: z.string(),
      emails: z.array(z.object({
        subject: z.string(),
        sender: z.string(),
        snippet: z.string(),
      })),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const { category, emails } = input;
    
    if (emails.length === 0) {
        return "No unread emails to summarize.";
    }

    const emailText = emails.map(e => `From: ${e.sender}\nSubject: ${e.subject}\nSnippet: ${e.snippet}\n---`).join("\n");

    const prompt = `
You are a helpful assistant. Please provide a concise, high-level overview of the following unread emails in the "${category}" category.
Use bullet points or a Markdown table to summarize the emails. Keep it very concise and less wordy.
Do not summarize each email individually unless it's very important. Group them by themes or senders if possible.

Emails:
${emailText}
`;

    try {
        const { text } = await ai.generate({
          prompt: prompt,
          config: {
            temperature: 0.4, 
            maxOutputTokens: 4096, 
          }
        });

        // Log prompt and response to AI history
        await saveAiSummary({
            id: `cat_summary_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            promptType: `Category Summary: ${category}`,
            promptUsed: prompt,
            emailsIncluded: emails.map(e => e.subject),
            summaryResult: text,
            timestamp: new Date()
        }).catch(err => console.error("Failed to log category summary history:", err));

        return text;
    } catch (error: any) {
        console.error("[AI] Summarization Error:", error.message);
        throw new Error("Failed to generate summary: " + error.message);
    }
  }
);

export const summarizeRecentEmails = ai.defineFlow(
  {
    name: "summarizeRecentEmails",
    inputSchema: z.object({
      emails: z.array(z.object({
        subject: z.string(),
        sender: z.string(),
        category: z.string(),
        snippet: z.string().optional(),
      })),
    }),
    outputSchema: z.object({
      text: z.string(),
      prompt: z.string()
    }),
  },
  async (input) => {
    const { emails } = input;
    
    if (emails.length === 0) {
        return { text: "No recent emails to summarize.", prompt: "N/A" };
    }

    const emailText = emails.map(e => `Category: ${e.category}\nFrom: ${e.sender}\nSubject: ${e.subject}\nSnippet: ${e.snippet || "N/A"}\n---`).join("\n");

    const prompt = `
You are a helpful assistant. Please provide a concise, high-level briefing of the recently organized emails.
Use a Markdown table to quickly explain what emails might be important (e.g., ones categorized into "Action Needed", "Finance", "Updates", "Urgent", etc.).
The table should have columns such as "Category", "Sender", "Subject", and "Importance / Key Takeaway".
Do not go into detail on "Marketing", "Social", "Promotions", etc., but provide a quick concise bullet point list of those at the bottom if relevant.
Keep the overall summary extremely concise, visually structured, and less wordy.

Recent Emails:
${emailText}
`;

    try {
        const { text } = await ai.generate({
          prompt: prompt,
          config: {
            temperature: 0.4, 
            maxOutputTokens: 4096, 
          }
        });

        return { text, prompt };
    } catch (error: any) {
        console.error("[AI] Recent Summarization Error:", error.message);
        throw new Error("Failed to generate recent summary: " + error.message);
    }
  }
);

