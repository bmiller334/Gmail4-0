# AI Context: NextN Email Sorter (Syracuse Hardware Command Center)

<system_profile>
  <stack>Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui, Capacitor</stack>
  <cloud>GCP: Cloud Run, Cloud Pub/Sub, Firestore, Cloud Logging</cloud>
  <ai>Genkit + Gemini 2.5 Flash (STRICT: Do NOT use Gemini 1.5 or 2.0-exp)</ai>
  <mission>Hardware store command center in Syracuse, KS. Automates inbox zero via LLM classification. Dashboard provides weather, commodities, news ticker, and shift notes.</mission>
  <deployment>GitHub `main` -> Cloud Build -> Cloud Run. URL: https://nextn-email-sorter-fuuedc4idq-uc.a.run.app</deployment>
</system_profile>

## Architecture & Data Flow

1. **Ingestion**: `scripts/setup-gmail-watch.ts` registers Gmail Watch -> Pub/Sub Topic `gmail-incoming` -> Push to Cloud Run `/api/process-email`.
2. **Processing Pipeline**: OAuth Auth -> Fetch Snippet -> Classify (Gemini 2.5) -> Move Label (Gmail API) -> Log to Firestore.
3. **Adaptive Learning**: Few-shot learning via last 5 user corrections (`email_corrections`). Bypassed by deterministic `email_rules`.
4. **Dashboard UI**: Real-time `/api/stats` polling. Shows inbound volume, dynamic label unread counts, shift handoffs, ag-weather, commodity prices, and scrolling news ticker.
5. **Rate Limiting**: 1300 AI calls/day max. Batch cleanup (`/api/cleanup`) capped at 50 emails per request.

## Critical AI Constraints (STRICT)

<constraint name="AuthWorkaround" type="Authentication">
**Problem**: GCP Service Accounts cannot access personal `@gmail.com` inboxes.
**Solution**: Custom OAuth 2.0 (`src/lib/gmail-service.ts`) via `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN`.
**Rule**: DO NOT use standard `GoogleAuth` service account logic.
</constraint>

<constraint name="FirestoreWrites" type="Database">
**Problem**: Updating nested map fields fails on non-existent documents.
**Solution**: `src/lib/db-service.ts` uses try-catch on `NOT_FOUND` errors, falling back to `.set()` configuration if update target is missing.
</constraint>

<constraint name="GenkitSingleton" type="AI">
**Rule**: `src/ai/genkit.ts` is a singleton. DO NOT re-instantiate or duplicate configurations.
</constraint>

<constraint name="GeminiApiRetries" type="Error Handling">
**Problem**: Gemini API 503 "High Demand" errors cause fallback to "Manual Sort".
**Solution**: Exponential backoff retry loop in `src/ai/email-classifier.ts`.
**Rule**: DO NOT remove this retry mechanism. Transient API failures MUST be retried.
</constraint>

## Core File Map

| Component | Path | Context / Role |
| :--- | :--- | :--- |
| **API Webhook** | `src/app/api/process-email/route.ts` | Pub/Sub push entrypoint |
| **AI Classifier** | `src/ai/email-classifier.ts` | Prompt struct, RAG context, Genkit call |
| **Gmail Service** | `src/lib/gmail-service.ts` | OAuth refresh logic & Gmail API adapter |
| **Database** | `src/lib/db-service.ts` | Firestore initialization and queries |
| **Dashboard** | `src/components/dashboard.tsx` | Main frontend layout & widgets |
| **Android** | `capacitor.config.ts` | APK standalone packaging config |

## Database Schema (Firestore)

- **`email_logs`**: Classified email data (`id`, `subject`, `category`, `reasoning`).
- **`email_stats`**: Aggregated daily counts (Document ID: `YYYY-MM-DD`). 
- **`email_corrections`**: Category overrides (fuels few-shot learning).
- **`email_urgency_corrections`**: Urgency overrides.
- **`email_rules`**: Hardcoded routing rules (bypasses AI).
- **`store_notes`**: Hardware store shift handoff stickies.
- **`settings`**: Master configs (e.g., `google_auth` stores UI-renewed refresh tokens).
- **`ai_summaries`**: Historical records of AI summaries, including the prompt sent and emails processed.

## Debugging Playbook

- **`invalid_grant` Error**: Refresh token expired. Use UI Re-Auth flow (`/api/auth/google/url`) to save new token to `settings/google_auth`.
- **Missing Push Events (No Emails Received)**:
  1. **Subscription**: Verify Pub/Sub Push Subscription exists for `gmail-incoming` topic.
  2. **API Types**: `gmail.users.history.list` requires `startHistoryId` as string. Cast `.toString()` to avoid silent failures.
  3. **Caching**: Webhook route MUST enforce `export const dynamic = 'force-dynamic'`.
  4. **Watch Expiration**: Dashboard UI shows alert if watch expires. "Fix Now" button hits `/api/watch` to renew.
- **React VDOM Errors**: Check for missing `lucide-react` icons or named-export typos in `/components/ui/`.

## Recent Architecture Changes

- **Stats & Insights Dashboard** (`src/components/stats-widget.tsx`): Added a comprehensive analytics widget for visualizing inbox volume trends over time (day, week, month, year) backed by a new `/api/advanced-stats` endpoint.
- **Spammer Catcher**: Integrated a feature within the Stats section to automatically identify and list top-volume senders regularly categorized as "Spam" or "Marketing," with quick actions to implement deterministic filtering rules.
- **Label Overview Widget** (`src/components/label-overview-widget.tsx`): Replaced static overview with dynamic accordion displaying real-time label unread counts and recent subject lines.
- **News Ticker**: Replaced static news widget with scrolling ticker (`src/components/news-ticker.tsx`).
- **Gmail Watch Auto-Renewal**: Added automatic renewal flow via dashboard to prevent real-time sync expiration, fixing OAuth redirect URI mismatches for production vs local.
- **AI Summary History & Deduplication**: Added a new `/ai-history` page tracking past AI summaries along with the exact prompts sent. Upgraded the `/api/summarize-recent` endpoint to cross-reference previous summaries to prevent duplicate processing of identical emails.
