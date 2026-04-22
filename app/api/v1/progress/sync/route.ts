import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/app/lib/auth/firebaseAuth';
import { ProgressSyncService } from '@/app/lib/migration/progressSync';
import { XPLedgerService } from '@/app/lib/migration/xpLedger';

async function postHandler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode || 'sync';

    if (mode === 'sync') {
      const result = await ProgressSyncService.migrateUserIfNeeded(user.uid);
      return NextResponse.json({ success: true, mode, ...result });
    }

    if (mode === 'reconcile') {
      await ProgressSyncService.migrateUserIfNeeded(user.uid);
      const reconcile = await XPLedgerService.reconcileUser(user.uid);
      return NextResponse.json({ success: true, mode, ...reconcile });
    }

    if (mode === 'append') {
      const amount = Number(body?.amount || 0);
      const reason = String(body?.reason || 'Manual XP update');
      const eventId = await XPLedgerService.appendEvent({
        userId: user.uid,
        amount,
        type: amount < 0 ? 'spent' : 'earned',
        source: 'bacquest',
        reason,
        subjectId: body?.subjectId,
        trackId: body?.trackId,
        sessionId: body?.sessionId,
        idempotencyKey: String(body?.idempotencyKey || `${user.uid}_${Date.now()}_${Math.abs(amount)}`)
      });

      return NextResponse.json({ success: true, mode, eventId });
    }

    return NextResponse.json({ success: false, error: 'Unsupported mode' }, { status: 400 });
  } catch (error) {
    console.error('Progress sync failed:', error);
    return NextResponse.json({ success: false, error: 'Progress sync failed' }, { status: 500 });
  }
}

async function getHandler(_: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const ledger = await XPLedgerService.getUserLedger(user.uid, 50);
    return NextResponse.json({ success: true, items: ledger });
  } catch (error) {
    console.error('Fetch ledger failed:', error);
    return NextResponse.json({ success: false, error: 'Fetch ledger failed' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
export const GET = withAuth(getHandler);
