import { collection, doc, getDocs, limit, orderBy, query, runTransaction, setDoc, where } from 'firebase/firestore';
import { XPSystem } from '@/app/lib/gamification/xpSystem';
import { db } from '@/app/lib/firebase';
import { LegacyProgressSnapshot, XPLedgerEvent, XPProjection } from '@/app/lib/migration/types';

const LEDGER_COLLECTION = 'xpLedger';
const PROJECTION_COLLECTION = 'xpProjections';
const MIGRATION_VERSION = 1;

function signedAmount(event: XPLedgerEvent): number {
  return event.type === 'spent' ? -Math.abs(event.amount) : Math.abs(event.amount);
}

export class XPLedgerService {
  static async appendEvent(event: Omit<XPLedgerEvent, 'id' | 'createdAt'>): Promise<string> {
    const docRef = doc(collection(db, LEDGER_COLLECTION));
    const payload: XPLedgerEvent = {
      ...event,
      id: docRef.id,
      createdAt: new Date().toISOString()
    };

    await runTransaction(db, async (tx) => {
      const idempotencyQuery = query(
        collection(db, LEDGER_COLLECTION),
        where('userId', '==', event.userId),
        where('idempotencyKey', '==', event.idempotencyKey),
        limit(1)
      );

      const existing = await tx.get(idempotencyQuery);
      if (!existing.empty) {
        return;
      }

      tx.set(docRef, payload);

      const projectionRef = doc(db, PROJECTION_COLLECTION, event.userId);
      const projectionDoc = await tx.get(projectionRef);
      const currentXP = projectionDoc.exists() ? (projectionDoc.data().totalXP as number || 0) : 0;
      const nextXP = Math.max(0, currentXP + signedAmount(payload));
      const xpResult = XPSystem.calculateXPResult(nextXP);

      const updatedProjection: XPProjection = {
        userId: event.userId,
        totalXP: nextXP,
        level: xpResult.currentLevel,
        rank: XPSystem.getRankForLevel(xpResult.currentLevel).name,
        migrated: projectionDoc.exists() ? Boolean(projectionDoc.data().migrated) : false,
        migrationVersion: projectionDoc.exists() ? Number(projectionDoc.data().migrationVersion || MIGRATION_VERSION) : MIGRATION_VERSION,
        lastLedgerEventAt: payload.createdAt,
        updatedAt: new Date().toISOString()
      };

      tx.set(projectionRef, updatedProjection, { merge: true });
      tx.set(doc(db, 'users', event.userId), {
        globalStats: {
          xp: nextXP,
          level: updatedProjection.level,
          rank: updatedProjection.rank
        },
        syncMeta: {
          ledgerBacked: true,
          lastSyncedAt: updatedProjection.updatedAt,
          migrationVersion: updatedProjection.migrationVersion
        }
      }, { merge: true });
    });

    return docRef.id;
  }

  static async bootstrapFromLegacy(snapshot: LegacyProgressSnapshot): Promise<void> {
    const idempotencyKey = `migration_v${MIGRATION_VERSION}_${snapshot.userId}`;
    await this.appendEvent({
      userId: snapshot.userId,
      amount: Math.max(0, snapshot.globalXP),
      type: 'migration_adjustment',
      source: 'system',
      reason: 'Initial BacFlow to BacQuest baseline',
      idempotencyKey,
      metadata: {
        capturedAt: snapshot.capturedAt,
        level: snapshot.level,
        rank: snapshot.rank
      }
    });

    await setDoc(doc(db, PROJECTION_COLLECTION, snapshot.userId), {
      migrated: true,
      migrationVersion: MIGRATION_VERSION,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  static async getUserLedger(userId: string, maxItems = 100): Promise<XPLedgerEvent[]> {
    const q = query(
      collection(db, LEDGER_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as XPLedgerEvent);
  }

  static async reconcileUser(userId: string): Promise<{ totalXP: number; drift: number }> {
    const events = await this.getUserLedger(userId, 2000);
    const computedXP = Math.max(0, events.reduce((sum, item) => sum + signedAmount(item), 0));
    const projectionRef = doc(db, PROJECTION_COLLECTION, userId);

    let drift = 0;
    await runTransaction(db, async (tx) => {
      const projectionDoc = await tx.get(projectionRef);
      const projectedXP = projectionDoc.exists() ? Number(projectionDoc.data().totalXP || 0) : 0;
      drift = computedXP - projectedXP;
      const xpResult = XPSystem.calculateXPResult(computedXP);

      tx.set(projectionRef, {
        userId,
        totalXP: computedXP,
        level: xpResult.currentLevel,
        rank: XPSystem.getRankForLevel(xpResult.currentLevel).name,
        migrated: projectionDoc.exists() ? Boolean(projectionDoc.data().migrated) : true,
        migrationVersion: projectionDoc.exists() ? Number(projectionDoc.data().migrationVersion || MIGRATION_VERSION) : MIGRATION_VERSION,
        lastLedgerEventAt: events[0]?.createdAt,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      tx.set(doc(db, 'users', userId), {
        globalStats: {
          xp: computedXP,
          level: xpResult.currentLevel,
          rank: XPSystem.getRankForLevel(xpResult.currentLevel).name
        },
        syncMeta: {
          ledgerBacked: true,
          lastReconciledAt: new Date().toISOString(),
          drift
        }
      }, { merge: true });
    });

    return { totalXP: computedXP, drift };
  }
}
