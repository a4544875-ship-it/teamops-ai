# TeamOps AI 2.0 — scope update (2026-11-14)

## Core scope (approved)
- Private manager-only workspace; soft cute SaaS UI.
- Projects/cases: project, support, ad hoc, routine; common statuses; quick create; right-side details panel.
- Members: editable people and skills, case ownership and related manager follow-ups.
- Manager follow-ups: tasks belong to the manager and may reference members, with no notifications to staff.
- Personal dashboard: balanced case, task, member and rule-based reminder overview.
- Supabase with safe migration, RLS, local backup, 30-day trash; no destructive data reset.
- Rule-based reminders only; no paid AI.

## Calendar scope change
- Remove routine calendar navigation, dashboard widget, member event feeds and schedule-based availability recommendation from 2.0 UI.
- Do not auto-sync Google Calendar.
- **Future separate feature, not in current implementation:** at month-end, manager explicitly triggers Google Calendar retrieval for a chosen month and exports a team summary report.
- Report columns, aggregation, timezone, event inclusion and export file format are **TBD with user**; do not invent them now.
- Existing historical calendar events, OAuth configuration and source-related records must not be deleted during the UI refocus. The integration code can remain in the repo unused until the report feature is specified.
- GitHub Pages production branch `main` remains unchanged during development.

## Acceptance gates
1. Default dashboard and menu show cases, members, follow-ups and reminders, not calendar.
2. Member details report case ownership and manager follow-ups.
3. No Google Calendar request is made on ordinary application opening.
4. Previously imported calendar data remains intact for migration planning.
5. Month-end sync/export not considered complete until requirements are discussed and separately implemented.
