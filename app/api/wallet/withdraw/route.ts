import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '@/lib/rate-limit';
import { notifyUserWhatsApp } from '@/lib/whatsapp';

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

    const rl = await checkRateLimit({ key: uid, bucket: 'withdraw', max: 5, windowSec: 3600 });
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de demandes. Réessayez plus tard.' }, { status: 429 });

    const { amount, phone, operator } = await req.json();
    const amt = Number(amount);
    if (!amt || amt <= 0) return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 });
    if (!phone || !/^\+?\d{7,15}$/.test(String(phone).replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Numéro Mobile Money invalide.' }, { status: 400 });
    }

    const db = adminDb();
    const walletRef = db.collection('wallets').doc(uid);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(walletRef);
      const balance = snap.data()?.balance ?? 0;
      if (amt > balance) throw new Error('Solde insuffisant.');

      // Débite le solde
      tx.set(
        walletRef,
        { balance: FieldValue.increment(-amt), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      // Trace la transaction de retrait (statut pending → traité manuellement/opérateur)
      tx.create(db.collection('transactions').doc(), {
        userId: uid,
        amount: amt,
        type: 'withdrawal',
        status: 'pending',
        method: operator || 'mobile_money',
        description: `Retrait ${operator || 'Mobile Money'} vers ${phone}`,
        createdAt: new Date().toISOString(),
      });

      tx.create(db.collection('notifications').doc(), {
        userId: uid,
        title: 'Retrait en cours',
        message: `Votre retrait de ${amt.toLocaleString()} FCFA vers ${phone} est en traitement (sous 24h).`,
        type: 'payout_completed',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    await notifyUserWhatsApp(uid, `Awder : votre retrait de ${amt.toLocaleString()} FCFA vers ${phone} est en cours. Réception sous 24h.`);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('withdraw error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
