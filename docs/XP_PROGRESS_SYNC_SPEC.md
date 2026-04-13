# XP and Progress Migration Spec

## Core Principle
Use append-only ledger events as canonical XP truth, and maintain fast-read projections for UI.

## Collections

### xpLedger
```json
{
  "id": "auto",
  "userId": "uid_123",
  "amount": 20,
  "type": "earned",
  "source": "bacquest",
  "reason": "Mission completed",
  "subjectId": "mathematics",
  "trackId": "sm",
  "sessionId": "sess_001",
  "idempotencyKey": "uid_123_mission_77",
  "metadata": { "difficulty": "medium" },
  "createdAt": "2026-04-13T04:00:00.000Z"
}
```

### xpProjections
```json
{
  "userId": "uid_123",
  "totalXP": 2140,
  "level": 9,
  "rank": "Strategist",
  "migrated": true,
  "migrationVersion": 1,
  "lastLedgerEventAt": "2026-04-13T04:00:00.000Z",
  "updatedAt": "2026-04-13T04:00:00.000Z"
}
```

## Sync Modes
- `sync`: migrate legacy snapshot if needed.
- `append`: add new XP event with idempotency guard.
- `reconcile`: recompute XP from ledger and repair projection/user aggregate.

## Migration Flow
1. Read legacy `users/{uid}.globalStats`.
2. Create one baseline `migration_adjustment` ledger event.
3. Build projection document.
4. Mark `users/{uid}.syncMeta.ledgerBacked = true`.

## Idempotency
- Required key on each append.
- Before insert, check `(userId, idempotencyKey)`.
- If found, return success without duplicate XP.

## Trust Guarantees
- Every XP point is traceable to immutable event.
- Reconciliation can deterministically rebuild total XP.
- Legacy fields remain in sync for backward compatibility.

## API Contract

### POST /api/progress/sync
```json
{ "mode": "sync" }
{ "mode": "append", "amount": 20, "reason": "Side quest", "idempotencyKey": "uid_1_q_99" }
{ "mode": "reconcile" }
```

### GET /api/progress/sync
Returns latest 50 ledger events for the authenticated user.

## Rollout Gates
- Gate 1: Internal users, drift must remain 0.
- Gate 2: 5% canary, migration errors < 2%.
- Gate 3: 50% rollout, p95 sync latency < 250ms.
- Gate 4: Full rollout.
