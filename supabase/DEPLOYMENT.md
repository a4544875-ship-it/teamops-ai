# TeamOps AI cloud upgrade — planned, not yet active

## Current state
- GitHub Pages hosts a public frontend.
- Projects, customer records, notes, tasks, schedules and people currently use local browser storage.
- Never commit real company data, ICS exports, backups or credentials.

## Proposed Supabase Free project
- Create **separate** free project `teamops-ai`; do not reuse `deal-radar`.
- Confirm organization and $0 project quote before creating.
- Configure only Carlos's authenticated account and restrictive redirect URLs.
- Apply `schema.sql` with Row Level Security enabled.
- Expose **publishable** key to browser, not secret/service-role keys.
- Add cloud sync with visible status, conflict handling, restore and backup.
- Migrate existing local data only after explicit user confirmation.

## Google Calendar
Google Calendar authorization inside ChatGPT is **not** website authorization.
Web app must obtain its own read-only Google OAuth permission using a
backend-assisted authorization flow. Store refresh tokens encrypted on server,
not in GitHub or frontend local storage. The backend periodically fetches accessible
calendars of Carlos, Ted, Duan, Beck and Danny, handling per-calendar permissions,
revoked access, deleted events, pagination, timezones and recurrence.
Never send invites, modify co-worker events or expose private event data in public code.

## Access model
Single manager account. An authenticated user can only access their owner_id
workspace. If the app becomes multi-user, replace the single JSON workspace with
normalized tables and scoped role policies.
