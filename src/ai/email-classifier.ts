import { z } from "genkit";
import { ai } from "./genkit"; // Import the shared instance
import { EMAIL_CATEGORIES } from "@/lib/categories";
import { getCorrections, getUrgencyCorrections } from "@/lib/db-service";

const EmailClassificationSchema = z.object({
  category: z.enum(EMAIL_CATEGORIES),
  reasoning: z.string().describe("Brief reason."), // Shortened description
  isUrgent: z.boolean().describe("Urgent?"), // Shortened description
});

export const classifyEmail = ai.defineFlow(
  {
    name: "classifyEmail",
    inputSchema: z.object({
      subject: z.string(),
      sender: z.string(),
      snippet: z.string(),
      // REMOVED body to save tokens - snippet is usually enough for classification
    }),
    outputSchema: EmailClassificationSchema,
  },
  async (input) => {
    const { subject, sender, snippet } = input;

    // Reduced number of corrections to 5 to save context window tokens
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

    // Highly optimized prompt
    const prompt = `
Classify email into: ${EMAIL_CATEGORIES.join(", ")}.

${examplesText}

Email:
From: ${sender}
Subj: ${subject}
Snip: ${snippet}
    `;

    // Using the default model configured in ./genkit.ts
    // Added config to lower maxOutputTokens (we only need JSON)
    const { output } = await ai.generate({
      prompt: prompt,
      output: { schema: EmailClassificationSchema },
      config: {
        maxOutputTokens: 150, // Force concise output
        temperature: 0.3, // Lower temperature for more deterministic/concise results
      }
    });

    if (!output) {
      throw new Error("Failed to classify email.");
    }

    return output;
  }
);
