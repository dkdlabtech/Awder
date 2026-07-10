import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '@/lib/rate-limit';
import { notifyUserWhatsApp } from '@/lib/whatsapp';
import { computeHostPayout } from '@/lib/commission';

export const dynamic = 'force-dynamic';

type BookingAction = 'check_in' | 'check_out' | 'release_caution' | 'cancel' | 'extend_stay' | 'open_dispute';

interface ActionBody {
  bookingId: string;
  action: BookingAction;
  duration?: number;
  disputeReason?: string;
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

    const { bookingId, action, duration, disputeReason } = (await req.json()) as ActionBody;
    if (!bookingId || !action) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const db = adminDb();
    const bookingRef = db.collection('bookings').doc(bookingId);
    const waNotifs: { uid: string; message: string }[] = [];

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

          // ✨ Décompte de la commission Awder (monétisation)
          const bd = b.priceBreakdown || {};
          const serviceFee = bd.awderServiceFee || 0;
          const servicesPrice = b.servicesPrice ?? bd.servicesPrice ?? 0;
          const listingPrice = bd.listingPrice ?? (b.totalPrice - caution - serviceFee - servicesPrice);

          const payoutInfo = await computeHostPayout({
            listingPrice,
            servicesPrice,
            hostVerificationLevel: b.hostVerificationLevel,
          });
          const netPayout = Math.max(0, payoutInfo.netPayout);
          const platformEarn = serviceFee + payoutInfo.totalCommission;

          const hostWalletRef = db.collection('wallets').doc(b.hostId);

          tx.update(bookingRef, {
            cautionStatus: 'released',
            status: 'completed',
          });

          // Escrow → balance de l'hôte (montant NET après commission)
          tx.set(
            hostWalletRef,
            {
              userId: b.hostId,
              balance: FieldValue.increment(netPayout),
              escrow: FieldValue.increment(-b.totalPrice),
              currency: 'XOF',
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          // ✨ Commission Awder → portefeuille plateforme
          if (platformEarn > 0) {
            tx.set(
              db.collection('wallets').doc('platform'),
              {
                userId: 'platform',
                balance: FieldValue.increment(platformEarn),
                currency: 'XOF',
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            tx.create(db.collection('transactions').doc(), {
              userId: 'platform',
              bookingId,
              guestId: b.guestId,
              hostId: b.hostId,
              amount: platformEarn,
              type: 'commission',
              status: 'completed',
              description: `Commission Awder (${(payoutInfo.appliedRate * 100).toFixed(0)}% + frais) : ${b.listingTitle}`,
              createdAt: new Date().toISOString(),
            });
          }

          // Transaction: versement NET à l'hôte
          tx.create(db.collection('transactions').doc(), {
            userId: b.hostId,
            bookingId,
            guestId: b.guestId,
            hostId: b.hostId,
            amount: netPayout,
            type: 'escrow_release',
            status: 'completed',
            description: `Versement hôte (net commission) : ${b.listingTitle}`,
            createdAt: new Date().toISOString(),
          });

          // Transaction: refund of caution to guest
          if (caution > 0) {
            const guestWalletRef = db.collection('wallets').doc(b.guestId);
            tx.set(
              guestWalletRef,
              {
                userId: b.guestId,
                balance: FieldValue.increment(caution),
                currency: 'XOF',
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

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

          // Notifications app
          tx.create(db.collection('notifications').doc(), {
            userId: b.guestId,
            title: 'Caution libérée',
            message: `Votre caution de ${caution.toLocaleString()} FCFA a été libérée.`,
            type: 'system',
            read: false,
            createdAt: new Date().toISOString(),
          });
          tx.create(db.collection('notifications').doc(), {
            userId: b.hostId,
            title: 'Versement effectué',
            message: `${netPayout.toLocaleString()} FCFA crédités sur votre portefeuille pour "${b.listingTitle}".`,
            type: 'payout_completed',
            read: false,
            createdAt: new Date().toISOString(),
          });

          waNotifs.push({ uid: b.guestId, message: `Awder : votre caution de ${caution.toLocaleString()} FCFA a été libérée.` });
          waNotifs.push({ uid: b.hostId, message: `Awder : ${netPayout.toLocaleString()} FCFA crédités sur votre portefeuille (séjour "${b.listingTitle}").` });
          return { ok: true };
        }

        case 'extend_stay': {
          if (!isGuest) throw new Error('Seul le voyageur peut prolonger le séjour.');
          if (b.status !== 'paid_escrow') throw new Error('Réservation non active.');
          if (!duration || duration <= 0) throw new Error('Durée de prolongation invalide.');

          const listingSnap = await tx.get(db.collection('listings').doc(b.listingId));
          if (!listingSnap.exists) throw new Error('Logement associé introuvable.');
          const listing = listingSnap.data()!;
          
          const additionalPrice = listing.price * duration;
          const hostWalletRef = db.collection('wallets').doc(b.hostId);

          let newEndDate = b.endDate;
          let newNights = b.nights || 0;
          let newHours = b.hours || 0;

          if (listing.pricingType === 'hourly') {
            newHours += duration;
            const currentEnd = new Date(b.endDate);
            currentEnd.setHours(currentEnd.getHours() + duration);
            newEndDate = currentEnd.toISOString();
          } else {
            newNights += duration;
            const currentEnd = new Date(b.endDate);
            currentEnd.setDate(currentEnd.getDate() + duration);
            newEndDate = currentEnd.toISOString();
          }

          tx.update(bookingRef, {
            totalPrice: FieldValue.increment(additionalPrice),
            nights: newNights,
            hours: newHours,
            endDate: newEndDate,
          });

          tx.create(db.collection('transactions').doc(), {
            userId: b.guestId,
            bookingId,
            guestId: b.guestId,
            hostId: b.hostId,
            amount: additionalPrice,
            type: 'payment',
            status: 'escrow',
            description: `Prolongation (+${duration} ${listing.pricingType === 'hourly' ? 'heures' : 'nuits'}) : ${b.listingTitle}`,
            createdAt: new Date().toISOString(),
          });

          tx.set(
            hostWalletRef,
            {
              escrow: FieldValue.increment(additionalPrice),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          tx.create(db.collection('notifications').doc(), {
            userId: b.hostId,
            title: 'Séjour prolongé',
            message: `Le voyageur a prolongé son séjour pour "${b.listingTitle}" de ${duration} ${listing.pricingType === 'hourly' ? 'heures' : 'nuits'}.`,
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
            // ✨ Calcul du remboursement selon la politique d'annulation
            // L'hôte qui annule rembourse toujours 100% (faute de l'hôte).
            const policy = b.cancellationPolicy || 'moderate';
            const caution = b.cautionAmount || 0;
            // La caution est toujours rendue intégralement
            const stayCost = b.totalPrice - caution;
            let stayRefundRatio = 1; // par défaut intégral

            if (isGuest) {
              const start = new Date(b.startDate).getTime();
              const hoursToCheckin = (start - Date.now()) / 3_600_000;
              if (policy === 'flexible') {
                stayRefundRatio = hoursToCheckin >= 24 ? 1 : 0.5;
              } else if (policy === 'moderate') {
                stayRefundRatio = hoursToCheckin >= 48 ? 1 : 0.5;
              } else if (policy === 'strict') {
                stayRefundRatio = hoursToCheckin >= 168 ? 1 : 0; // 7 jours
              }
            }

            const refundAmount = Math.round(caution + stayCost * stayRefundRatio);
            const hostKeeps = b.totalPrice - refundAmount;

            // Rollback de l'escrow chez l'hôte
            tx.set(
              db.collection('wallets').doc(b.hostId),
              {
                escrow: FieldValue.increment(-b.totalPrice),
                // L'hôte garde la part non remboursée (pénalité d'annulation)
                balance: FieldValue.increment(hostKeeps > 0 ? hostKeeps : 0),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            // Remboursement au voyageur
            if (refundAmount > 0) {
              tx.set(
                db.collection('wallets').doc(b.guestId),
                { balance: FieldValue.increment(refundAmount), updatedAt: FieldValue.serverTimestamp() },
                { merge: true }
              );
              tx.create(db.collection('transactions').doc(), {
                userId: b.guestId,
                bookingId,
                amount: refundAmount,
                type: 'refund',
                status: 'completed',
                description: `Remboursement annulation (${policy}) : ${b.listingTitle}`,
                createdAt: new Date().toISOString(),
              });
            }
            if (hostKeeps > 0) {
              tx.create(db.collection('transactions').doc(), {
                userId: b.hostId,
                bookingId,
                amount: hostKeeps,
                type: 'escrow_release',
                status: 'completed',
                description: `Pénalité d'annulation conservée : ${b.listingTitle}`,
                createdAt: new Date().toISOString(),
              });
            }
          }
          tx.update(bookingRef, { status: 'cancelled' });
          return { ok: true };
        }

        case 'open_dispute': {
          // Voyageur OU hôte peut signaler un problème → bloque la libération de la caution
          if (!isGuest && !isHost) throw new Error('Accès interdit.');
          if (b.status === 'cancelled') throw new Error('Réservation annulée.');
          if (b.hasDispute) throw new Error('Un litige est déjà ouvert pour cette réservation.');
          if (!disputeReason || disputeReason.trim().length < 5) {
            throw new Error('Veuillez décrire le problème (5 caractères min).');
          }

          const disputeRef = db.collection('disputes').doc();
          tx.set(disputeRef, {
            bookingId,
            listingId: b.listingId,
            listingTitle: b.listingTitle,
            openedBy: uid,
            openedByRole: isGuest ? 'guest' : 'host',
            guestId: b.guestId,
            hostId: b.hostId,
            reason: disputeReason.trim(),
            amount: b.totalPrice,
            cautionAmount: b.cautionAmount || 0,
            status: 'open',
            createdAt: new Date().toISOString(),
          });

          // Marque la réservation en litige → escrow gelé
          tx.update(bookingRef, {
            status: 'disputed',
            hasDispute: true,
            disputeId: disputeRef.id,
          });

          // Notifie l'autre partie
          const otherParty = isGuest ? b.hostId : b.guestId;
          tx.create(db.collection('notifications').doc(), {
            userId: otherParty,
            title: 'Litige ouvert',
            message: `Un litige a été signalé pour "${b.listingTitle}". L'équipe Awder va intervenir.`,
            type: 'dispute_opened',
            read: false,
            createdAt: new Date().toISOString(),
          });

          waNotifs.push({ uid: otherParty, message: `Awder : un litige a été ouvert pour "${b.listingTitle}". Nos équipes vous contactent sous 48h.` });
          return { ok: true, disputeId: disputeRef.id };
        }

        default:
          throw new Error('Action inconnue.');
      }
    });

    // ✨ Notifications WhatsApp (best-effort, hors transaction)
    if (waNotifs.length) {
      await Promise.allSettled(waNotifs.map((n) => notifyUserWhatsApp(n.uid, n.message)));
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('booking action error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
