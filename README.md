# AI Agent Context: NextN Email Sorter (Syracuse Hardware Command Center)

<system_profile>
  <stack>Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui, Capacitor (Android packaging)</stack>
  <cloud>Google Cloud Run, Cloud Pub/Sub, Firestore, Google Cloud Logging</cloud>
  <ai>Genkit with Gemini 2.5 Flash (Rule: DO NOT USE deprecated Gemini 1.5 or 2.0-exp)</ai>
  <mission>Hardware store command center in Syracuse, KS. Automates inbox zero via LLM email routing, while providing local ag-weather, commodities, and shift notes.</mission>
  <deployment>Standard: Push `main` to GitHub -> Cloud Build -> Cloud Run. URL: https://nextn-email-sorter-fuuedc4idq-uc.a.run.app</deployment>
</system_profile>

## Architecture & Data Flow

1. **Ingestion (Push)**: `scripts/setup-gmail-watch.ts` registers a Gmail Watch -> Pub/Sub Topic (`gmail-incoming`) pushes POST to Cloud Run `/api/process-email`.
2. **Processing Pipeline**: Authenticate via long-lived OAuth -> Fetch Email Snippet -> Classify via Gemini 2.5 -> Move Label (Gmail API) -> Log Context to Firestore.
3. **Adaptive Learning**: Uses last 5 manual corrections (`email_corrections`) as few-shot examples for the classifier prompt. Applies explicit `email_rules` for known senders.
4. **Dashboard View**: Real-time polling `/api/stats`. Shows inbound volume, categories, shift handoffs, ag-weather, commodity prices, and direct hyperlinked inbox unread count.
5. **Rate Limiting**: Hard-capped at 1300 AI calls/day (`email_stats.totalProcessed`). Batch cleanup (`/api/cleanup`) restricted to 20 per execution at 15 RPM.

## Critical AI Constraints (DO NOT MODIFY)

<constraint name="AuthWorkaround" type="Authentication">
**Problem**: GCP Service Accounts cannot access personal `@gmail.com` inboxes.
**Solution**: Custom OAuth 2.0 implementation (`src/lib/gmail-service.ts`) using `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` (env vars or Firestore fallback). Scopes: `gmail.modify`, `calendar.events`.
**Rule**: DO NOT revert to standard `GoogleAuth` service account logic.
</constraint>

<constraint name="FirestoreWrites" type="Database">
**Problem**: Updating nested map fields fails on non-existent documents.
**Solution**: `src/lib/db-service.ts` uses try-catch on `NOT_FOUND` errors, falling back to `.set()` configuration if an update target is missing.
</constraint>

<constraint name="GenkitSingleton" type="AI">
**File**: `src/ai/genkit.ts`. Singleton pattern employed explicitly. Do not re-instantiate or duplicate configurations.
</constraint>

## Core File Map

| Component | Path | Context / Role |
| :--- | :--- | :--- |
| **API Webhook** | `src/app/api/process-email/route.ts` | Entrypoint for Pub/Sub push |
| **AI Classifier** | `src/ai/email-classifier.ts` | Prompt struct, RAG (few-shot), Genkit call |
| **Gmail Service** | `src/lib/gmail-service.ts` | OAuth refresh logic and Gmail API adapter |
| **Data Adapter** | `src/lib/db-service.ts` | Firestore read/writes and initialization |
| **Dashboard UI** | `src/components/dashboard.tsx` | Main frontend command center layout |
| **Android Wrapper** | `capacitor.config.ts` | Configurations for standalone APK target |

## Database Schema Reference (Firestore)

- **`email_logs`**: Flat doc per classified email (`id`, `subject`, `category`, `reasoning`).
- **`email_stats`**: Aggregated daily counts. Documented by date (`YYYY-MM-DD`). 
- **`email_corrections`**: User category overrides (powers few-shot learning).
- **`email_urgency_corrections`**: User urgency overrides.
- **`email_rules`**: Sender-specific hardcoded routing constraints.
- **`store_notes`**: Stickies for hardware store shift handoffs.
- **`settings`**: Master configs, notably `google_auth` (stores UI-renewed refresh tokens).

## Debugging

- **Error: `invalid_grant`**: Refresh token expired. User must either use the UI Re-Auth flow (`/api/auth/google/url` exposed on `/logs`) to save new token to `settings/google_auth`, or regenerate manually via Google OAuth Playground.
- **Missing Push Events**: Verify Pub/Sub subscription endpoint exactly matches the live deployed `/api/process-email` URL.
- **React VDOM errors (`expected a string... undefined`)**: Likely caused by missing explicitly declared `lucide-react` icons or named-export mismatches in `/components/ui/`.
