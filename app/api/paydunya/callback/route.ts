import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * PayDunya IPN (Instant Payment Notification).
 * Doc: https://paydunya.com/developers/api/checkout-ipn
 *
 * Body: form-data
 *   - data[token]      → invoice token
 *   - data[status]     → "completed" | "cancelled" | ...
 *   - data[hash]       → HMAC SHA-512 of master_key
 *   - data[custom_data][booking_id]
 *   - data[invoice][total_amount]
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const status = form.get('data[status]')?.toString();
    const token = form.get('data[token]')?.toString();
    const hash = form.get('data[hash]')?.toString();
    const bookingId = form.get('data[custom_data][booking_id]')?.toString();
    const totalAmount = Number(form.get('data[invoice][total_amount]')?.toString() ?? 0);

    // ── Verify signature ──────────────────────────────────────────────────────
    const masterKey = process.env.PAYDUNYA_MASTER_KEY;
    if (masterKey && hash) {
      const expected = crypto.createHash('sha512').update(masterKey).digest('hex');
      if (hash !== expected) {
        console.error('PayDunya IPN: invalid hash');
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
      }
    }

    if (status !== 'completed' || !bookingId) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const db = adminDb();
    const bookingRef = db.collection('bookings').doc(bookingId);

    // ── Idempotency (atomic) ──────────────────────────────────────────────────
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) throw new Error('Booking not found');
      const b = snap.data()!;

      if (b.status !== 'pending_payment' || b.paymentToken) {
        // Already processed
        return;
      }

      // Verify amount matches
      if (totalAmount > 0 && totalAmount !== b.totalPrice) {
        console.error(`Amount mismatch: paid=${totalAmount}, expected=${b.totalPrice}`);
        throw new Error('Amount mismatch');
      }

      // 1. Update booking
      tx.update(bookingRef, {
        status: 'paid_escrow',
        cautionStatus: 'blocked',
        paymentToken: token,
        paidAt: new Date().toISOString(),
      });

      // 2. Create transaction (guest side)
      tx.create(db.collection('transactions').doc(), {
        userId: b.guestId,
        bookingId,
        guestId: b.guestId,
        hostId: b.hostId,
        amount: b.totalPrice,
        type: 'payment',
        status: 'escrow',
        method: 'paydunya',
        description: `Paiement Sira-Djou : ${b.listingTitle}`,
        createdAt: new Date().toISOString(),
      });

      // 3. Increment host wallet escrow
      const hostWalletRef = db.collection('wallets').doc(b.hostId);
      tx.set(
        hostWalletRef,
        {
          userId: b.hostId,
          balance: FieldValue.increment(0),
          escrow: FieldValue.increment(b.totalPrice),
          currency: 'XOF',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 4. Notify host
      tx.create(db.collection('notifications').doc(), {
        userId: b.hostId,
        title: 'Nouveau Paiement Reçu',
        message: `Le paiement pour "${b.listingTitle}" est sécurisé en escrow.`,
        type: 'payment_received',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PayDunya Callback Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
