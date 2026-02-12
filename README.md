# Project Context: AI-Powered Inbox Zero Manager (Syracuse Hardware Command Center)

**For Future AI Agents & Developers:**
This document serves as the primary context source for the current state of the project. It outlines architectural decisions, specific workarounds implemented to bypass Google Cloud limitations for personal accounts, and the current feature set.

## 1. Project Overview
This is a **Next.js** application deployed on **Google Cloud Run** designed to be a central command center for a hardware store owner in Syracuse, KS.
*   **Goal**: Maintain "Inbox Zero" by moving emails to static categories (Labels) and provide critical operational data (Weather, Commodity Prices, Staff Notes).
*   **Primary AI**: **Gemini 2.5 Flash** (via Genkit).
*   **Trigger**: Real-time event listening via Google Cloud Pub/Sub (Push Notifications), not polling.

## 2. Architecture & Data Flow

1.  **Ingestion (Push)**:
    *   A script (`scripts/setup-gmail-watch.ts`) creates a "Watch" on the user's Gmail `INBOX`.
    *   Gmail publishes a notification to a Pub/Sub Topic (`gmail-incoming`).
    *   Pub/Sub pushes a POST request to the Cloud Run endpoint: `/api/process-email`.

2.  **Processing (Cloud Run)**:
    *   **Auth**: The app authenticates as the user using a **Refresh Token** (see Section 3).
    *   **Fetch**: Retreives the latest unread email details.
    *   **Classify**: Sends the Subject, Sender, and Snippet to **Gemini 2.5 Flash**.
    *   **Action**: Moves the email to a label (e.g., "Marketing", "Work") using the Gmail API.
    *   **Log**: Writes processing metadata and **AI Reasoning** to **Firestore** (`email_logs`, `email_stats`, `email_corrections`, `email_urgency_corrections`, `email_rules` collections).
    *   **Quota Enforcement**: Stops processing if daily AI calls exceed 1300 to prevent API overages.

3.  **Visualization (Command Center Dashboard)**:
    *   Frontend polls `/api/stats` to render real-time volume and category distribution.
    *   **Smart Header**: Dynamically greets the user based on time of day and **next calendar event** (e.g., "Meeting with Supplier at 2pm").
    *   **Store Widgets**:
        *   **Ag-Focused Weather**: Real-time weather for Syracuse, KS with agricultural advice.
        *   **Commodity Ticker**: Tracks Lumber, Copper, and Steel prices.
        *   **Community Events**: Lists local events.
        *   **Shift Handoff Notes**: A persistent sticky-note board for staff communication (`store_notes` collection).
    *   **System Logs**: A dedicated page (`/logs`) streams system logs and tracks **Daily API Quota usage**.
    *   **Error Ticker**: A global ticker showing recent errors or **Quota Warnings** (Yellow at 1000, Red at 1300).

4.  **Learning & Correction System**:
    *   Users can manually correct email categorizations or urgency flags.
    *   **Corrections** are stored in Firestore (`email_corrections` and `email_urgency_corrections`).
    *   The classification logic (`src/ai/email-classifier.ts`) fetches the last 5 corrections to use as **few-shot examples** in the prompt, improving accuracy over time.
    *   Users can define **Sender Rules** (`src/app/api/rules/route.ts`) to hard-code categories for specific senders, bypassing AI for known patterns.
    *   The system can analyze log history to suggest new rules based on consistent patterns (`src/app/api/rules/suggestions/route.ts`).

## 3. Critical Implementation Details (Do Not Regression)

### A. Authentication Strategy (Personal vs. Workspace)
**Constraint**: Service Accounts cannot access personal `@gmail.com` inboxes (only Google Workspace with Domain-Wide Delegation).
**Solution**: We implemented a custom auth flow in `src/lib/gmail-service.ts`.
*   The app uses **OAuth 2.0 Client ID & Secret** + a long-lived **Refresh Token**.
*   **Environment Variables**: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`.
*   **Scopes**: `gmail.modify` AND `calendar.events` (for dashboard integration).
*   *Do not attempt to switch this back to standard `GoogleAuth` service account logic unless migrating to a Workspace domain.*
*   **Fallback**: The code contains a fallback to `GoogleAuth` (Service Account) if OAuth creds are missing, but this will likely fail for personal Gmail.

### B. Genkit Configuration
**File**: `src/ai/genkit.ts`
*   We use a **singleton** Genkit instance to avoid configuration conflicts.
*   **Model**: Currently set to `googleai/gemini-2.5-flash`.
*   **Note**: If `2.5` becomes deprecated or unavailable, Do NOT revert to `gemini-1.5-flash` or `gemini-2.0-flash-exp', these are both deprecated.

### C. Pub/Sub Subscription
*   The subscription is a **Push Subscription**.
*   **Endpoint URL**: MUST match the deployed Cloud Run service URL + `/api/process-email`.
*   **Issue History**: We faced issues where the subscription pointed to an old service (`gmail4-service`) while we were deploying to a new one (`nextn-email-sorter`). **Always verify the subscription endpoint matches the active deployment.**

## 4. Known Issues & Workarounds

### Local Development vs. Cloud Auth
*   **Problem**: The `.env` file contained `GOOGLE_APPLICATION_CREDENTIALS` pointing to a placeholder file. This caused local scripts (like `check-subs.ts`) to fail.
*   **Fix**: Scripts now explicitly `delete process.env.GOOGLE_APPLICATION_CREDENTIALS` at runtime. We also added `src/lib/env-fix.ts` imported at the top of `db-service.ts` to strip this variable before `firebase-admin` initializes.

### Build Errors (UI Components)
*   **Problem**: Encountered `Element type is invalid: expected a string... but got: undefined` during build.
*   **Cause**: Likely due to named vs. default export mismatches in UI components or missing icons in `lucide-react`.
*   **Fix**: Switched to absolute imports (e.g., `@/components/ui/button`) and ensured all used icons exist in the installed version of `lucide-react`.

### Gmail Rate Limits & Quota
*   **Feature**: "Clean Inbox" button.
*   **Constraint**: Processing hundreds of emails at once triggers rate limits.
*   **Solution**: `src/app/api/cleanup/route.ts` is capped at **20 emails** per run and uses **sequential processing** with a **2-second delay** between emails to stay under the 15 RPM limit.
*   **Daily Quota**: The system actively tracks API calls (`email_stats.totalProcessed`). If usage exceeds **1300/day**, both automatic and manual processing are disabled to prevent overages.

### Firestore FieldValue Issues
*   **Problem**: Updating nested fields (like `categories.Marketing`) in Firestore sometimes failed if the document didn't exist or fields weren't initialized.
*   **Solution**: `src/lib/db-service.ts` uses a try-catch block with error code checking. If an update fails with `NOT_FOUND` (Error code 5), it performs a `set` operation to initialize the document.

## 5. Troubleshooting: Invalid Grant / Expired Token

If logs show `Error: invalid_grant` (Token has been expired or revoked), the **Refresh Token** has likely expired or the user changed their password.

**Resolution Steps:**
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2.  Navigate to **APIs & Services > Credentials** and find your **OAuth 2.0 Client ID**.
3.  Go to the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
4.  Click the **Settings (Gear Icon)**.
    *   Check **"Use your own OAuth credentials"**.
    *   Enter your `Client ID` and `Client Secret`.
5.  In "Select & authorize APIs", input the following scopes:
    *   `https://www.googleapis.com/auth/gmail.modify`
    *   `https://www.googleapis.com/auth/calendar.events`
    *   `https://www.googleapis.com/auth/calendar.readonly`
6.  Click **Authorize APIs**.
7.  Exchange the authorization code for tokens.
8.  Copy the new **Refresh Token**.
9.  **Update Cloud Run**:
    ```bash
    gcloud run services update nextn-email-sorter --update-env-vars GMAIL_REFRESH_TOKEN="YOUR_NEW_TOKEN"
    ```
10. **Update Local `.env`** (for development).

## 6. Setup & Deployment Reference

### Environment Variables
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_GENAI_API_KEY=your-gemini-api-key
GMAIL_CLIENT_ID=your-oauth-client-id
GMAIL_CLIENT_SECRET=your-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_TOPIC_NAME=projects/{project}/topics/gmail-incoming
```

### Deployment Commands
**1. Switch Project:**
```bash
gcloud config set project gmail4-0
```

**2. Build Container:**
```bash
gcloud builds submit --tag gcr.io/gmail4-0/nextn-email-sorter .
```

**3. Deploy Service:**
```bash
gcloud run deploy nextn-email-sorter \
  --image gcr.io/gmail4-0/nextn-email-sorter \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_GENAI_API_KEY=...,GMAIL_CLIENT_ID=..., (etc)
```

**4. Update Subscription (If URL changes):**
```bash
gcloud pubsub subscriptions update gmail-subscription \
    --push-endpoint=https://YOUR-NEW-SERVICE-URL/api/process-email
```

**5. Renew Watch (Weekly):**
```bash
npx tsx scripts/setup-gmail-watch.ts
```

## 7. Firestore Schema Reference

### Collections:
*   **`email_logs`**: Stores individual processing logs.
    *   Fields: `id` (Message ID), `sender`, `subject`, `category`, `timestamp`, `isUrgent`, `snippet`, `reasoning`.
*   **`email_stats`**: Stores aggregated statistics, sharded by date (ID: `YYYY-MM-DD`).
    *   Fields: `totalProcessed`, `categories` (Map), `senders` (Map), `lastUpdated`.
*   **`email_corrections`**: Stores user corrections for categories.
    *   Fields: `id`, `sender`, `subject`, `snippet`, `wrongCategory`, `correctCategory`, `timestamp`.
*   **`email_urgency_corrections`**: Stores user corrections for urgency flags.
    *   Fields: `id`, `sender`, `subject`, `snippet`, `wasUrgent`, `shouldBeUrgent`, `timestamp`.
*   **`email_rules`**: Stores user-defined sender rules.
    *   Fields: `id`, `sender` (email or pattern), `category`, `createdAt`.
*   **`store_notes`**: Stores shift handoff notes.
    *   Fields: `id`, `content`, `createdAt`, `author`.
*   **`settings`**: Stores app configuration (currently used for dynamic categories if enabled).
    *   Doc: `email_categories` -> Fields: `categories` (Array).

## 8. Configuration & Utility Scripts

### Categories
Default categories (defined in `src/lib/categories.ts`):
- `[Action Required]`, `Finance`, `Manual Sort`, `Marketing`, `Newslettter`, `Promotions`, `Security Alerts`, `Social`, `Updates`, `Work`.
- The system supports fetching dynamic categories from Firestore (`settings` collection) if configured.

### Scripts (`scripts/`)
*   `setup-gmail-watch.ts`: Sets up the push notification watch on the Gmail Inbox.
*   `check-subs.ts`: Lists current Google Cloud Pub/Sub subscriptions and their status.
*   `list-labels.ts`: Lists all labels in the authenticated Gmail account (useful for debugging label IDs).
*   `debug-auth.ts`: Tests authentication and prints the user's email address.
*   `diagnose-connection.ts`: Diagnostics for connectivity.
*   `test-logging.ts`: Tests writing to Google Cloud Logging.
