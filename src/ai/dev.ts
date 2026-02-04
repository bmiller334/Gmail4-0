import { startFlowsServer } from "@genkit-ai/flow";
import { classifyEmail } from "./email-classifier";

// Register flows here
export const flows = [classifyEmail];

startFlowsServer();
