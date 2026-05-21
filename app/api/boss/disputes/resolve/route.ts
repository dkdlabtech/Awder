import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { adminGuard, logAdminAction, getClientIp } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type Resolution =
  | 'refund_guest'
  | 'partial_refund'
  | 'release_to_host'
  | 'claim_caution'
  | 'no_action';

interface Body {
  disputeId: string;
  resolution: Resolution;
  resolutionAmount?: number;
  adminNotes?: string;
}

export async function POST(req: NextRequest) {
  const guard = await adminGuard(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: adminId } = guard;

  try {
    const { disputeId, resolution, resolutionAmount, adminNotes } = (await req.json()) as Body;
    if (!disputeId || !resolution) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const db = adminDb();
    const disputeRef = db.collection('disputes').doc(disputeId);

    await db.runTransaction(async (tx) => {
      const dSnap = await tx.get(disputeRef);
      if (!dSnap.exists) throw new Error('Litige introuvable.');
      const dispute = dSnap.data()!;
      if (dispute.status === 'resolved') throw new Error('Litige déjà résolu.');

      const bookingRef = db.collection('bookings').doc(dispute.bookingId);
      const bSnap = await tx.get(bookingRef);
      if (!bSnap.exists) throw new Error('Réservation introuvable.');
      const booking = bSnap.data()!;

      const now = new Date().toISOString();

      // 1. Marquer le litige résolu
      tx.update(disputeRef, {
        status: 'resolved',
        resolution,
        resolutionAmount: resolutionAmount ?? 0,
        adminNotes: adminNotes ?? '',
        assignedAdmin: adminId,
        resolvedAt: now,
        updatedAt: now,
      });

      const hostWalletRef = db.collection('wallets').doc(booking.hostId);
      const totalEscrow = booking.totalPrice;

      // 2. Appliquer la résolution
      switch (resolution) {
        case 'refund_guest': {
          // Rembourser tout le voyageur, vider l'escrow chez l'hôte
          tx.set(
            hostWalletRef,
            {
              userId: booking.hostId,
              balance: FieldValue.increment(0),
              escrow: FieldValue.increment(-totalEscrow),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          tx.create(db.collection('transactions').doc(), {
            userId: booking.guestId,
            bookingId: dispute.bookingId,
            guestId: booking.guestId,
            hostId: booking.hostId,
            amount: totalEscrow,
            type: 'refund',
            status: 'completed',
            description: `Remboursement total (litige) : ${booking.listingTitle}`,
            createdAt: now,
          });
          tx.update(bookingRef, { status: 'cancelled', cautionStatus: 'released' });
          break;
        }

        case 'partial_refund': {
          const refundAmount = Math.min(resolutionAmount ?? 0, totalEscrow);
          const remaining = totalEscrow - refundAmount;
          tx.set(
            hostWalletRef,
            {
              userId: booking.hostId,
              balance: FieldValue.increment(remaining),
              escrow: FieldValue.increment(-totalEscrow),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          tx.create(db.collection('transactions').doc(), {
            userId: booking.guestId,
            bookingId: dispute.bookingId,
            amount: refundAmount,
            type: 'refund',
            status: 'completed',
            description: `Remboursement partiel (litige) : ${booking.listingTitle}`,
            createdAt: now,
          });
          if (remaining > 0) {
            tx.create(db.collection('transactions').doc(), {
              userId: booking.hostId,
              bookingId: dispute.bookingId,
              amount: remaining,
              type: 'escrow_release',
              status: 'completed',
              description: `Versement partiel (litige) : ${booking.listingTitle}`,
              createdAt: now,
            });
          }
          tx.update(bookingRef, { status: 'completed', cautionStatus: 'released' });
          break;
        }

        case 'release_to_host': {
          tx.set(
            hostWalletRef,
            {
              userId: booking.hostId,
              balance: FieldValue.increment(totalEscrow),
              escrow: FieldValue.increment(-totalEscrow),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          tx.create(db.collection('transactions').doc(), {
            userId: booking.hostId,
            bookingId: dispute.bookingId,
            amount: totalEscrow,
            type: 'escrow_release',
            status: 'completed',
            description: `Libération (litige résolu en faveur de l'hôte) : ${booking.listingTitle}`,
            createdAt: now,
          });
          tx.update(bookingRef, { status: 'completed', cautionStatus: 'released' });
          break;
        }

        case 'claim_caution': {
          // L'hôte garde tout (caution incluse) — sanction voyageur
          tx.set(
            hostWalletRef,
            {
              userId: booking.hostId,
              balance: FieldValue.increment(totalEscrow),
              escrow: FieldValue.increment(-totalEscrow),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          tx.create(db.collection('transactions').doc(), {
            userId: booking.hostId,
            bookingId: dispute.bookingId,
            amount: totalEscrow,
            type: 'escrow_release',
            status: 'completed',
            description: `Caution saisie (litige dégâts) : ${booking.listingTitle}`,
            createdAt: now,
          });
          tx.update(bookingRef, { status: 'completed', cautionStatus: 'claimed' });
          break;
        }

        case 'no_action':
          // Pas de mouvement de fonds, juste closer le litige
          break;
      }

      // Notifier les deux parties
      tx.create(db.collection('notifications').doc(), {
        userId: booking.guestId,
        title: 'Litige résolu',
        message: `Votre litige sur "${booking.listingTitle}" a été traité par Awder.`,
        type: 'system',
        read: false,
        createdAt: now,
      });
      tx.create(db.collection('notifications').doc(), {
        userId: booking.hostId,
        title: 'Litige résolu',
        message: `Le litige sur "${booking.listingTitle}" a été traité par Awder.`,
        type: 'system',
        read: false,
        createdAt: now,
      });
    });

    await logAdminAction({
      adminId,
      action: 'dispute_resolved',
      targetType: 'dispute',
      targetId: disputeId,
      details: { resolution, resolutionAmount, adminNotes },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('admin resolve dispute error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
