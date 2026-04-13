export type LedgerEventType = 'earned' | 'spent' | 'correction' | 'migration_adjustment';

export interface XPLedgerEvent {
  id?: string;
  userId: string;
  amount: number;
  type: LedgerEventType;
  source: 'bacflow' | 'bacquest' | 'system';
  reason: string;
  subjectId?: string;
  trackId?: 'sm' | 'svt' | 'pc' | 'lettres';
  sessionId?: string;
  idempotencyKey: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface LegacyProgressSnapshot {
  userId: string;
  globalXP: number;
  level: number;
  rank: string;
  subjects: Record<string, { xp: number; level: number }>;
  capturedAt: string;
}

export interface XPProjection {
  userId: string;
  totalXP: number;
  level: number;
  rank: string;
  migrated: boolean;
  migrationVersion: number;
  lastLedgerEventAt?: string;
  updatedAt: string;
}
