import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

async function getUid(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(auth.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUid(req);
    if (!uid) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

    const rl = await checkRateLimit({ key: uid, bucket: 'review', max: 20, windowSec: 3600 });
    if (!rl.allowed) return NextResponse.json({ error: 'Trop d\'avis. Réessayez plus tard.' }, { status: 429 });

    const { bookingId, rating, cleanliness, communication, comment } = await req.json();
    const r = Number(rating);
    if (!bookingId || !r || r < 1 || r > 5) {
      return NextResponse.json({ error: 'Note invalide.' }, { status: 400 });
    }

    const db = adminDb();
    const bookingRef = db.collection('bookings').doc(bookingId);

    const result = await db.runTransaction(async (tx) => {
      const bSnap = await tx.get(bookingRef);
      if (!bSnap.exists) throw new Error('Réservation introuvable.');
      const b = bSnap.data()!;
      if (b.guestId !== uid) throw new Error('Seul le voyageur peut noter ce séjour.');
      if (b.reviewed) throw new Error('Vous avez déjà noté ce séjour.');

      const listingRef = db.collection('listings').doc(b.listingId);
      const lSnap = await tx.get(listingRef);
      const prevCount = lSnap.data()?.reviewCount ?? 0;
      const prevRating = lSnap.data()?.rating ?? 0;
      const newCount = prevCount + 1;
      const newAvg = Math.round(((prevRating * prevCount + r) / newCount) * 10) / 10;

      // 1. Crée l'avis
      tx.create(db.collection('reviews').doc(), {
        bookingId,
        listingId: b.listingId,
        fromUserId: uid,
        toUserId: b.hostId,
        rating: r,
        cleanliness: Number(cleanliness) || r,
        communication: Number(communication) || r,
        comment: (comment || '').toString().slice(0, 1000),
        createdAt: new Date().toISOString(),
      });

      // 2. Met à jour la note agrégée de l'annonce
      if (lSnap.exists) {
        tx.update(listingRef, { rating: newAvg, reviewCount: newCount });
      }

      // 3. Marque la réservation comme notée
      tx.update(bookingRef, { reviewed: true });

      // 4. Notifie l'hôte
      tx.create(db.collection('notifications').doc(), {
        userId: b.hostId,
        title: 'Nouvel avis Diya',
        message: `Vous avez reçu une note de ${r}/5 pour "${b.listingTitle}".`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString(),
      });

      return { newAvg, newCount };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    console.error('review submit error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
