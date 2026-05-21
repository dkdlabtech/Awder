import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

type BookingAction = 'check_in' | 'check_out' | 'release_caution' | 'cancel';

interface ActionBody {
  bookingId: string;
  action: BookingAction;
}

async function getUidFromAuthHeader(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const token = auth.slice(7);
    const decoded = await adminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromAuthHeader(req);
    if (!uid) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    // Rate limit: max 30 booking actions per minute per user
    const rl = await checkRateLimit({ key: uid, bucket: 'booking_action', max: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 });
    }

    const { bookingId, action } = (await req.json()) as ActionBody;
    if (!bookingId || !action) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const db = adminDb();
    const bookingRef = db.collection('bookings').doc(bookingId);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) throw new Error('Réservation introuvable.');
      const b = snap.data()!;

      const isGuest = uid === b.guestId;
      const isHost = uid === b.hostId;
      if (!isGuest && !isHost) throw new Error('Accès interdit.');

      switch (action) {
        case 'check_in': {
          if (!isGuest) throw new Error('Seul le voyageur peut faire le check-in.');
          if (b.status !== 'paid_escrow') throw new Error('Réservation non payée.');
          if (b.checkInStatus !== 'pending') throw new Error('Check-in déjà fait.');
          tx.update(bookingRef, { checkInStatus: 'checked_in' });
          tx.create(db.collection('notifications').doc(), {
            userId: b.hostId,
            title: 'Arrivée du voyageur',
            message: `Le voyageur est arrivé pour "${b.listingTitle}".`,
            type: 'check_out',
            read: false,
            createdAt: new Date().toISOString(),
          });
          return { ok: true };
        }

        case 'check_out': {
          if (!isGuest) throw new Error('Seul le voyageur peut faire le check-out.');
          if (b.checkInStatus !== 'checked_in') throw new Error('Pas encore checked-in.');
          tx.update(bookingRef, { checkInStatus: 'checked_out' });
          tx.create(db.collection('notifications').doc(), {
            userId: b.hostId,
            title: 'Départ du voyageur',
            message: `Le voyageur a quitté "${b.listingTitle}". Vous pourrez libérer la caution.`,
            type: 'check_out',
            read: false,
            createdAt: new Date().toISOString(),
          });
          return { ok: true };
        }

        case 'release_caution': {
          // Host releases caution → host gets payout, guest gets caution back
          if (!isHost) throw new Error('Seul l\'hôte peut libérer la caution.');
          if (b.cautionStatus !== 'blocked') throw new Error('Caution déjà libérée ou non bloquée.');
          if (b.checkInStatus !== 'checked_out') throw new Error('Voyageur pas encore parti.');

          const caution = b.cautionAmount || 0;
          const payout = b.totalPrice - caution; // what the host keeps
          const hostWalletRef = db.collection('wallets').doc(b.hostId);

          tx.update(bookingRef, {
            cautionStatus: 'released',
            status: 'completed',
          });

          // Move money from escrow to balance for the host
          tx.set(
            hostWalletRef,
            {
              userId: b.hostId,
              balance: FieldValue.increment(payout),
              escrow: FieldValue.increment(-b.totalPrice),
              currency: 'XOF',
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          // Transaction: payout to host
          tx.create(db.collection('transactions').doc(), {
            userId: b.hostId,
            bookingId,
            guestId: b.guestId,
            hostId: b.hostId,
            amount: payout,
            type: 'escrow_release',
            status: 'completed',
            description: `Versement hôte : ${b.listingTitle}`,
            createdAt: new Date().toISOString(),
          });

          // Transaction: refund of caution to guest
          if (caution > 0) {
            tx.create(db.collection('transactions').doc(), {
              userId: b.guestId,
              bookingId,
              guestId: b.guestId,
              hostId: b.hostId,
              amount: caution,
              type: 'refund',
              status: 'completed',
              description: `Caution libérée : ${b.listingTitle}`,
              createdAt: new Date().toISOString(),
            });
          }

          // Notify both
          tx.create(db.collection('notifications').doc(), {
            userId: b.guestId,
            title: 'Caution libérée',
            message: `Votre caution de ${caution.toLocaleString()} FCFA a été libérée.`,
            type: 'system',
            read: false,
            createdAt: new Date().toISOString(),
          });
          return { ok: true };
        }

        case 'cancel': {
          if (!isGuest && !isHost) throw new Error('Accès interdit.');
          if (b.status === 'completed') throw new Error('Réservation déjà terminée.');
          if (b.status === 'paid_escrow') {
            // Refund the guest fully (escrow rollback)
            tx.set(
              db.collection('wallets').doc(b.hostId),
              {
                escrow: FieldValue.increment(-b.totalPrice),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            tx.create(db.collection('transactions').doc(), {
              userId: b.guestId,
              bookingId,
              amount: b.totalPrice,
              type: 'refund',
              status: 'completed',
              description: `Remboursement annulation : ${b.listingTitle}`,
              createdAt: new Date().toISOString(),
            });
          }
          tx.update(bookingRef, { status: 'cancelled' });
          return { ok: true };
        }

        default:
          throw new Error('Action inconnue.');
      }
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('booking action error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
