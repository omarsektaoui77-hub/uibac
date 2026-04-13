# BacQuest V2 Execution Plan

## Objective
Upgrade BacFlow into BacQuest using a mirror-and-upgrade strategy: preserve familiar UI patterns while enabling AI-driven content and trustable progress synchronization.

## Architecture

```text
Client (BacQuest shell)
  -> Next.js API routes
    -> Firestore (users, questionBanks, xpLedger, xpProjections)
    -> AI services (analyze, generate)
    -> Pipeline workers (Drive ingest, PDF extract, reconciliation)
```

### Layers
- Continuity layer: Reuse navigation, page rhythm, and dark theme semantics.
- Intelligence layer: AI analyzer/question generator with strict JSON validation.
- Trust layer: XP ledger + projection + reconciliation.
- Delivery layer: Canary rollout and feature flags.

## UX Decisions
- Keep existing dashboard IA and card hierarchy.
- Rename visible mechanics without breaking interaction muscle memory:
  - Practice -> Side Quests
  - Exams -> Main Missions
  - Progress -> Mastery
- Add explicit state copy: `AI Coach is thinking...` for all asynchronous AI calls.
- Add lightweight completion effects only at success milestones to avoid noisy UI.

## Reuse vs Rebuild

### Reuse
- Firebase Auth + existing user documents.
- Existing Firestore `questionBanks` and progress update route.
- Existing anti-cheat and validation stacks.

### Rebuild or Extend
- `xpLedger` append-only collection.
- `xpProjections` materialized read model.
- `/api/progress/sync` endpoint for migrate/sync/reconcile.
- Migration observability and rollback procedures.

## Delivery Phases
1. Phase 0: Introduce schemas and indexes (`xpLedger`, `xpProjections`) behind flags.
2. Phase 1: Dual-read (projection first, fallback to legacy fields).
3. Phase 2: Dual-write (ledger event + legacy aggregate).
4. Phase 3: Reconciliation jobs + mismatch alerts.
5. Phase 4: Cutover to ledger-backed reads as default.

## Rollback Logic
- Keep legacy aggregate fields updated until phase completion.
- If drift threshold is exceeded, disable ledger reads via feature flag and continue legacy mode.
- Do not delete ledger data during rollback; it remains audit trail.

## Observability
- Metrics:
  - `xp_drift_count`
  - `xp_drift_abs_sum`
  - `migration_success_rate`
  - `ai_generation_p95_ms`
  - `question_cache_hit_rate`
- Alerts:
  - Drift > 0 for more than 2 sync cycles.
  - Migration error rate > 2% in canary cohort.

## Shared Folder Structure

```text
/packages
  /ui-shared
    /components
    /tokens
  /domain
    /types
    /progress
  /ai-core
    /prompts
    /schemas
  /migration
    /mappers
    /jobs
/apps
  /bacflow
  /bacquest
```

## Immediate Next Sprint Backlog
- Integrate `/api/progress/sync` into mission completion flow.
- Run migration on internal users and verify drift dashboard.
- Enable canary cohort (5%) with read fallback toggles.
