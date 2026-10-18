---
name: financial-dashboard-change-qa
description: "Use when reviewing or preparing a financial dashboard frontend or API change for validation, especially changes to metrics, dates, categories, money formatting, charts, or Docker service wiring."
---

# Financial Dashboard Change QA

## Objective

Produce an evidence-based change review and focused verification plan for this repository's financial dashboard. Catch mismatches between backend capabilities, frontend wiring, and financial display behavior before a change is considered ready.

## Inputs

- The requested behavior or acceptance criteria.
- The current branch diff and changed files.
- Relevant frontend/backend routes, types, utilities, tests, and run configuration.

## Workflow

1. Read the root `AGENTS.md`, `.agents/rules/financial-dashboard.md`, and current `memory-bank` context before reviewing code.
2. Inspect `git status` and the scoped diff. Do not include unrelated changes or make product changes while performing QA.
3. Trace the behavior from its real caller to the implementation. The current UI fetches `/api/metrics` in `frontend/src/App.tsx`; the existence of another route in `backend/app/routes.py` does not prove that the UI uses it.
4. For API-backed changes, compare the route/query and Pydantic response in `backend/app/routes.py` with `frontend/src/lib/financial-types.ts`, the actual frontend consumer, and nearby route tests. Treat dates as API date strings (`YYYY-MM-DD`) and amounts as numbers; the API does not declare currency metadata.
5. For calculations or display changes, inspect `frontend/src/lib/financial-utils.ts`. Reuse `formatCurrency` and `formatPercent` unless the requirement calls for a deliberate formatting change. The current currency formatter displays USD; do not describe USD as an API guarantee.
6. Check the affected UI's loading, error, empty, and accessibility states. For date-derived labels, compare displayed text with the data source: mock dates in `backend/app/routes.py` depend on `date.today()`, while the current dashboard header has a fixed 2024 label.
7. Choose only relevant checks:
   - Frontend behavior or types: from `frontend/`, run `npm test`, `npm run lint`, and `npm run build` as appropriate.
   - Backend route or model changes: from the repository root, run `docker compose run --build --rm backend python -m pytest -q`.
   - Compose or proxy changes: run `docker compose config --quiet` and verify the affected service request path.
8. Report findings with the concrete file evidence, commands/results, and any unverified browser or environment checks. Do not claim field performance or accessibility conformance from source inspection alone.

## Expected Output

- A concise map of changed files to the requested behavior.
- Contract or calculation evidence with repository-relative paths.
- Focused checks run and their results.
- Open mismatches, limitations, or test gaps, clearly labeled.

## Acceptance Criteria

- Every important behavior claim traces to a source path or test.
- Backend capability is not confused with frontend integration.
- Money, date, and category values match the existing data contract and formatters.
- Relevant loading/error/empty/accessibility states are considered.
- Validation follows the repository's scripts and container setup; unavailable checks are reported rather than implied to pass.
- No unrelated product behavior, API, or roadmap claims are introduced.