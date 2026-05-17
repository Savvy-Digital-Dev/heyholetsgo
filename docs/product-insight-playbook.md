# HoHo Product Insight Playbook

This playbook helps future agents and engineers convert HoHo analytics into product decisions.

## Decision Principles

- Optimize for better daily execution, learning consistency, and 4DX alignment.
- Treat analytics as product signal, not employee surveillance.
- Prefer workflow improvements over punitive interpretation.
- Use aggregate/team trends before judging individual behavior.

## Insight Patterns

### Overdue Tasks Rising

Evidence:
- `deadline_overdue_seen` is high.
- Task completion is lower than task creation.

Possible actions:
- Add overdue filter or priority queue.
- Add reminder UX.
- Improve task planning flow.

### Frequent Effort Corrections

Evidence:
- `effort_corrected_by_admin` is high.

Possible actions:
- Add effort examples near task input.
- Add admin review queue.
- Add suggested effort based on similar historical tasks.

### Learning Adoption Low

Evidence:
- `task_created` is healthy.
- `learning_created` is low.

Possible actions:
- Add post-task learning prompt.
- Add weekly learning nudge.
- Simplify learning entry form.

### 4DX Check-in Low

Evidence:
- `fourdx_checkin` is low relative to active users.

Possible actions:
- Simplify 4DX check-in.
- Add quick check-in from Tasks tab.
- Add weekly 4DX summary prompt.

### Bulk Delete High

Evidence:
- `task_bulk_deleted` is high.

Possible actions:
- Improve duplicate prevention.
- Add archive/cleanup mode.
- Improve migration cleanup guidance.

## Agent Workflow

1. Read `docs/analytics-taxonomy.md`.
2. Query `analytics_daily_summaries` for long-term trends.
3. Query recent `app_events` only for supporting evidence.
4. Check `product_insights` for existing open insights.
5. Propose one product change at a time with clear success metrics.
