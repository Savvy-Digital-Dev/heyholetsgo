# Codebase Issue Task Proposals

## 1) Typo fix task
**Task:** Rename the "On Progress" label to "In Progress" in the Tasks summary card.

- **Why:** "On Progress" is grammatically awkward in English UI copy and may reduce clarity for users.
- **Where:** `index.html` in the Tasks summary metrics row.
- **Acceptance criteria:** The label reads "In Progress" and no other behavior changes.

## 2) Bug fix task
**Task:** Fix the `carryOverFromYesterday()` runtime error by replacing `todayKey()` with `getTodayKey()`.

- **Why:** `todayKey()` is not defined anywhere, while `getTodayKey()` is the existing date-key helper. Calling `carryOverFromYesterday()` will throw a `ReferenceError`.
- **Where:** `assets/js/main.js` in `carryOverFromYesterday()`.
- **Acceptance criteria:** No `ReferenceError`; carry-over executes once per day as intended.

## 3) Comment/documentation discrepancy task
**Task:** Align the misleading comment in `computeDayTaskPercent()` with actual behavior.

- **Why:** The comment says the function checks whether a 60% target is reached, but implementation calculates daily gained XP divided by total possible XP for the day (capped at 100), independent of a fixed 60% threshold.
- **Where:** `assets/js/domain/tasks.js` above `computeDayTaskPercent()`.
- **Acceptance criteria:** Comment accurately describes current formula and does not mention an unused 60% target unless code is updated to enforce it.

## 4) Test improvement task
**Task:** Add a small automated test suite for task XP and carry-over edge cases.

- **Why:** Core behavior currently has no tests, so regressions (e.g., undefined helper usage and percentage logic mismatches) can slip into production.
- **Suggested scope:**
  1. `getTaskDailyXp()` returns 0/20%/100% correctly by status.
  2. `computeDayTaskPercent()` handles zero-base and caps at 100.
  3. `carryOverFromYesterday()` does not duplicate tasks when reopened on the same day.
  4. A regression test that would fail on `todayKey()` typo and pass with `getTodayKey()`.
- **Acceptance criteria:** Tests run in CI/local with deterministic fixtures and at least one failing test before the bug fix.
