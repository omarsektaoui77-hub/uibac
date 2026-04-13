import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { XPLedgerService } from '@/app/lib/migration/xpLedger';
import { LegacyProgressSnapshot } from '@/app/lib/migration/types';

export class ProgressSyncService {
  static async migrateUserIfNeeded(userId: string): Promise<{ migrated: boolean; reason: string }> {
    const projectionRef = doc(db, 'xpProjections', userId);
    const projectionSnap = await getDoc(projectionRef);

    if (projectionSnap.exists() && projectionSnap.data().migrated) {
      return { migrated: false, reason: 'already_migrated' };
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { migrated: false, reason: 'user_not_found' };
    }

    const user = userSnap.data();
    const snapshot: LegacyProgressSnapshot = {
      userId,
      globalXP: Number(user?.globalStats?.xp || 0),
      level: Number(user?.globalStats?.level || 1),
      rank: String(user?.globalStats?.rank || 'Beginner'),
      subjects: user?.subjects || {},
      capturedAt: new Date().toISOString()
    };

    await XPLedgerService.bootstrapFromLegacy(snapshot);
    return { migrated: true, reason: 'migrated_now' };
  }
}
