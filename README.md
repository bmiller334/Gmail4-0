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
4. **Dashboard UI & Widgets**: Dynamic dashboard (`src/components/dashboard.tsx`) with:
   - **Daily Briefing**: `daily-briefing-widget.tsx` (Morning Coffee greeting using Genkit + Gemini 2.5 Flash).
   - **Wealth Tracker**: `finance-tracker-widget.tsx` (Google Sheets + Recharts personal wealth tracker).
   - **Read Later Queue**: `read-later-widget.tsx` (AI-sorted bookmark list with Gmail archive check-off).
   - **Media Player**: `spotify-widget.tsx` (Spotify Web Embed & YouTube player with preset buttons).
   - **Label Overview & Analytics**: accordion showing unread labels & subject expansion, and `stats-widget.tsx` (trends).
   - **Atmospheric UI**: Live weather-dependent theme backgrounds via `weather-background.tsx` and RSS ticker.
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
| `src/components/dashboard.tsx` | Main command center frontend UI combining widgets. |
| `src/components/daily-briefing-widget.tsx` | Morning Coffee UI card rendering custom context-aware AI greetings. |
| `src/components/finance-tracker-widget.tsx` | Recharts wealth visualizer pulling dynamically from Google Sheets. |
| `src/components/read-later-widget.tsx` | Bookmarks queue syncing with Gmail API to archive checked items. |
| `src/components/spotify-widget.tsx` | Aesthetic media dashboard player supporting presets and URL embedding. |
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
  3. **Gmail Watch Expiration**: Watch is valid for 7 days. Use "Fix Now" on the dashboard UI to call `/api/watch` to renew.
- **React VDOM / Lucide Typos**: Verify imports from `@/components/ui/` and icons from `lucide-react`.
