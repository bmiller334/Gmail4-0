# AI Context: NextN Email Sorter (Personal Home Page Dashboard)

<system_profile>
  <stack>Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui, Capacitor</stack>
  <cloud>GCP: Cloud Run, Cloud Pub/Sub, Firestore, Cloud Logging</cloud>
  <ai>Genkit + Gemini 2.5 Flash (STRICT: Do NOT use Gemini 1.5 or 2.0-exp)</ai>
  <mission>Personal Home Page and inbox organizer. Automates inbox zero via LLM classification. Dashboard integrates weather, daily AI briefings, Google Sheets wealth tracking, a self-sent bookmark queue, and media controls.</mission>
  <deployment>GitHub `main` -> Cloud Build (Kaniko cache) -> Cloud Run. URL: https://nextn-email-sorter-fuuedc4idq-uc.a.run.app</deployment>
  <instructions>STRICT: Keep this README highly concise, dense, and token-optimized (<1200 tokens). Document only active system state and absolute constraints. Never add narrative changelogs or history.</instructions>
</system_profile>

## Architecture & Data Flow

1. **Ingestion**: `scripts/setup-gmail-watch.ts` registers Gmail Watch -> Pub/Sub `gmail-incoming` -> push to `/api/process-email` (processes new messages using `historyId`).
2. **Processing Pipeline**: OAuth Auth -> Fetch Snippet -> Rule Match (deterministic `email_rules`) -> Fallback to AI (Gemini 2.5 Flash, low temperature for deterministic classifications) -> Move Label (Gmail API) -> Log to Firestore (`email_logs`).
3. **Adaptive Learning**: Few-shot learning via last 5 user overrides (`email_corrections` and `email_urgency_corrections`).
4. **Dashboard UI & Widgets**: Modularized UI with global `<Navigation />` across dedicated routes:
   - **`/` (Dashboard Overview)**: Core inbox metrics, logs, Label Overview, and `daily-briefing-widget.tsx`.
   - **`/home` (Smart Home)**: Environment tracking via `weather-widget.tsx` and `thermostat-widget.tsx`.
   - **`/finance` (Markets)**: Sector and sentiment insights via `market-insights-widget.tsx`.
   - **`/assistant` (Productivity)**: Personal AI queries via `mind-palace.tsx` and bookmarking via `read-later-widget.tsx`.
   - **Atmospheric UI**: Live weather-dependent theme backgrounds (`weather-background.tsx`) run persistently in `src/app/layout.tsx`.
5. **Rate Limiting**: AI calls capped at 1300/day. Batch cleanup (`/api/cleanup`) capped at 50 emails per request.

## Critical AI Constraints (STRICT)

<constraint name="AuthWorkaround" type="Authentication">
**Rule**: Standard GCP Service Account lacks personal `@gmail.com` inbox access. Always use custom OAuth 2.0 (`src/lib/gmail-service.ts`) using `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` (dynamically loaded from Firestore `settings/google_auth` first, falling back to environment variables).
</constraint>

<constraint name="FirestoreWrites" type="Database">
**Rule**: To prevent updates to non-existent documents, `src/lib/db-service.ts` uses `.set(..., { merge: true })` on dynamic documents (like daily stats) BEFORE calling `.update(...)`.
</constraint>

<constraint name="StaticPageCaching" type="Caching">
**Rule**: Next.js App Router aggressively caches static HTML/APIs. You MUST enforce `export const dynamic = 'force-dynamic'` on the homepage (`src/app/page.tsx`), webhook `/api/process-email`, and all dynamically-polled endpoints (`/api/calendar`, `/api/rules/suggestions`, `/api/advanced-stats`, etc.).
</constraint>

<constraint name="GeminiApiRetries" type="Error Handling">
**Rule**: Network and 503 "High Demand" errors must be handled gracefully. Keep the exponential backoff retry mechanism (max 3 retries, starting at 2s) in `src/ai/email-classifier.ts`.
</constraint>

<constraint name="GenkitSingleton" type="AI">
**Rule**: `src/ai/genkit.ts` is a singleton instance. Do not re-initialize or create duplicate configs.
</constraint>

<constraint name="DocTokenOptimization" type="Documentation">
**Rule**: To save token context windows, this README must be kept strictly below 1200 tokens. Always optimize sentences for density, use tables where possible, and never append chronological changelogs or git history. Document only active state and strict technical rules.
</constraint>

## Core File Map

| Path | Context / Role |
| :--- | :--- |
| `src/app/api/process-email/route.ts` | Entrypoint for Pub/Sub push. Parses history, matches rules, handles classifications, moves labels. |
| `src/ai/email-classifier.ts` | Flows for AI classification, category summaries, and briefings using Genkit + Gemini. |
| `src/lib/gmail-service.ts` | Gmail API client adapter, OAuth authentication flow, and inbox counters. |
| `src/lib/db-service.ts` | Master service for Firestore interactions (logging, corrections, daily stats, cache, settings). |
| `src/app/layout.tsx` | Global layout holding the `<Navigation />` bar and persistent `<WeatherBackground />`. |
| `src/app/page.tsx` | Main Dashboard containing email overview, daily briefing, and logs. |
| `src/app/home/page.tsx` | Smart Home route for Thermostat and Weather widgets. |
| `src/app/finance/page.tsx` | Finance route for Market Insights widget. |
| `src/app/assistant/page.tsx` | Productivity route for Mind Palace and Read Later widgets. |
| `src/components/dashboard.tsx` | Main command center frontend UI combining widgets. |
| `src/components/daily-briefing-widget.tsx` | Morning Coffee UI card rendering custom context-aware AI greetings. |
| `src/components/market-insights-widget.tsx` | Market sentiment, indices, and sector insights. |
| `src/components/read-later-widget.tsx` | Bookmarks queue syncing with Gmail API to archive checked items. |
| `src/components/thermostat-widget.tsx` | Home temperature and climate control interface. |
| `src/components/mind-palace.tsx` | Gemini Assistant UI querying email, Drive, and Photos context. |
| `src/app/ai-history/page.tsx` | Card-based AI History logs displaying prompt details and classifications. |
| `cloudbuild.yaml` | Build pipeline config utilizing Kaniko layer caching. |

## Database Schema (Firestore)

- **`email_logs`**: Log of all classifications (`id`, `subject`, `category`, `isUrgent`, `reasoning`).
- **`email_stats`**: Daily processed statistics (Doc ID: `YYYY-MM-DD`). Contains sender and category increments.
- **`email_corrections`**: Category overrides correcting the few-shot pipeline.
- **`email_urgency_corrections`**: Urgency overrides.
- **`email_rules`**: Hardcoded routing rules (bypasses AI) mapping senders to categories.
- **`settings`**: Configuration documents (`google_auth` for OAuth credentials, `email_categories` for dynamic labels, `watch_status` for Gmail Watch, `recent_summary_cache`).
- **`ai_summaries`**: Audit log records of *all* Gemini prompts/responses (classifications, briefings, category summaries).

## Debugging Playbook

- **`invalid_grant` Error**: Refresh token expired. Access `/api/auth/google/url` in the browser to renew the token.
- **Missing Push Notifications**:
  1. **Subscription**: Check Pub/Sub subscription mapping for `gmail-incoming`.
  2. **historyId Casting**: `gmail.users.history.list` expects string. Always stringify historyId values to avoid silent API failures.
  3. **Gmail Watch Expiration**: Watch is valid for 7 days. A Cloud Scheduler job hits `/api/watch` twice a week to auto-renew.
- **React VDOM / Lucide Typos**: Verify imports from `@/components/ui/` and icons from `lucide-react`.
