import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * Demo-mode confirmation. Only available when PayDunya keys are not configured.
 * Mirrors the side effects of the real /api/paydunya/callback webhook so we can
 * exercise the full booking flow without a real payment provider.
 */
export async function POST(req: NextRequest) {
  try {
    const { bookingId, demoToken } = await req.json();
    if (!bookingId || !demoToken?.startsWith('demo_')) {
      return NextResponse.json({ success: false, error: 'Invalid demo request' }, { status: 400 });
    }

    // Guard: only allow demo confirmation when PayDunya is NOT properly configured
    const masterKey = process.env.PAYDUNYA_MASTER_KEY;
    if (masterKey && masterKey !== 'your_master_key') {
      return NextResponse.json(
        { success: false, error: 'Demo mode disabled — PayDunya configured.' },
        { status: 403 }
      );
    }

    const db = adminDb();
    const bookingRef = db.collection('bookings').doc(bookingId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) throw new Error('Booking not found');
      const b = snap.data()!;
      if (b.status !== 'pending_payment' || b.paymentToken) return; // idempotent

      tx.update(bookingRef, {
        status: 'paid_escrow',
        cautionStatus: 'blocked',
        paymentToken: demoToken,
        paidAt: new Date().toISOString(),
      });

      tx.create(db.collection('transactions').doc(), {
        userId: b.guestId,
        bookingId,
        guestId: b.guestId,
        hostId: b.hostId,
        amount: b.totalPrice,
        type: 'payment',
        status: 'escrow',
        method: 'demo',
        description: `[DÉMO] Paiement Sira-Djou : ${b.listingTitle}`,
        createdAt: new Date().toISOString(),
      });

      tx.set(
        db.collection('wallets').doc(b.hostId),
        {
          userId: b.hostId,
          balance: FieldValue.increment(0),
          escrow: FieldValue.increment(b.totalPrice),
          currency: 'XOF',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.create(db.collection('notifications').doc(), {
        userId: b.hostId,
        title: 'Nouveau Paiement Reçu',
        message: `[DÉMO] Paiement pour "${b.listingTitle}" sécurisé en escrow.`,
        type: 'payment_received',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('confirm-demo error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
