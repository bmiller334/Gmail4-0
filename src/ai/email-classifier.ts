import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { EMAIL_CATEGORIES } from "@/lib/categories";

const ai = genkit({
  plugins: [googleAI()],
  model: "googleai/gemini-2.5-flash", // Using the string identifier
});

const EmailClassificationSchema = z.object({
  category: z.enum(EMAIL_CATEGORIES),
  reasoning: z.string().describe("A brief explanation of why this category was chosen."),
  isUrgent: z.boolean().describe("Whether the email requires immediate attention."),
});

export const classifyEmail = ai.defineFlow(
  {
    name: "classifyEmail",
    inputSchema: z.object({
      subject: z.string(),
      sender: z.string(),
      snippet: z.string(),
      body: z.string().optional(),
    }),
    outputSchema: EmailClassificationSchema,
  },
  async (input) => {
    const { subject, sender, snippet, body } = input;

    const prompt = `
      Analyze the following email and classify it into one of these categories: ${EMAIL_CATEGORIES.join(", ")}.

      Email Details:
      - Sender: ${sender}
      - Subject: ${subject}
      - Snippet: ${snippet}
      ${body ? `- Body: ${body}` : ""}

      Provide the classification, a brief reasoning, and whether it is urgent.
    `;

    const { output } = await ai.generate({
      prompt: prompt,
      output: { schema: EmailClassificationSchema },
    });

    if (!output) {
      throw new Error("Failed to classify email.");
    }

    return output;
  }
);
