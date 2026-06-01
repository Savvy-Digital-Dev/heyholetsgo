# HoHo Analytics Taxonomy

HoHo analytics tracks product behavior for feature decisions. It must not track sensitive free-text content, screenshots, or activity outside HoHo.

## Event Rules

- Track only important workflow events.
- Keep `properties` small and non-sensitive.
- Prefer booleans, counts, status names, effort values, and feature labels.
- Do not store task titles, learning reflections, or detailed notes.

## MVP Events

| Event | Feature Area | Meaning |
| --- | --- | --- |
| `app_open` | `core` | User opened an authenticated HoHo session. |
| `login_success` | `auth` | Supabase login/session completed. |
| `tab_view` | navigation feature | User viewed a main tab. |
| `task_created` | `tasks` | User created personal, assigned, or delegated task. |
| `task_status_changed` | `tasks` | User changed task status. |
| `task_deleted` | `tasks` | User deleted a single task. |
| `task_bulk_deleted` | `tasks` | User bulk-deleted selected active tasks. |
| `deadline_set` | `tasks` | User added, changed, or removed deadline. |
| `deadline_overdue_seen` | `tasks` | App showed an overdue task to user. |
| `learning_created` | `learning` | User logged a learning entry. |
| `fourdx_checkin` | `fourdx` | User checked in a lead measure. |
| `dashboard_viewed` | `dashboard` / `insights` | Admin/superuser viewed dashboard/insights. |
| `effort_corrected_by_admin` | `dashboard` | Admin/superuser corrected task effort. |
| `legacy_import_used` | `migration` | User/admin used local or CSV import. |
| `error_seen` | `friction` | App caught a user-facing workflow error. |
| `feature_time_spent` | active feature | Estimated active time when user changes tab, logs out, closes app, or app becomes inactive. |

## Core Metrics

- `activeUsers`: unique users with events in a period.
- `sessionCount`: authenticated sessions in a period.
- `featureCounts`: event count grouped by `feature_area`.
- `taskCreated`, `taskDone`, `taskDeleted`, `bulkDelete`: task workflow signals.
- `learningCreated`: learning adoption signal.
- `fourdxCheckin`: 4DX consistency signal.
- `overdueSeen`: deadline friction signal.
- `effortCorrections`: task effort quality signal.
- `errors`: workflow friction signal.
- `totalActiveSeconds`: estimated active HoHo usage time.
- `averageSessionSeconds`: average session span from `analytics_sessions.started_at` to `last_seen_at`, capped at 30 minutes.
- `averageActiveSecondsPerUser`: active time divided by active users in the selected period.
- `featureTimeSeconds`: active time grouped by HoHo feature.

## Time Spent Definition

Time spent is a product analytics estimate, not exact surveillance. HoHo records a segment only when the user changes tab, logs out, closes the app, or the browser tab becomes inactive. Segments under 3 seconds are ignored, and one segment is capped at 30 minutes to avoid counting an abandoned open tab.

## Retention

- Raw `app_events`: target 180 days.
- `analytics_daily_summaries`: long-term.
- `product_insights`: long-term.
