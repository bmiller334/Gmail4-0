import * as dotenv from "dotenv";
dotenv.config();

// Ensure PROJECT_ID is set if missing
if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    process.env.GOOGLE_CLOUD_PROJECT_ID = "gmail4-0";
}

import { POST } from "../src/app/api/process-email/route";
import { NextRequest } from "next/server";

async function run() {
  const payload = {
    message: {
      data: Buffer.from(JSON.stringify({
        emailAddress: "test@example.com",
        historyId: 1000000
      })).toString('base64'),
    }
  };

  const req = new NextRequest("http://localhost/api/process-email", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  console.log("Calling POST...");
  const res = await POST(req);
  console.log("Status:", res.status);
  console.log("Body:", await res.json());
}

run().catch(console.error);
