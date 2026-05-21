import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { phoneNumber, code } = await req.json();

  if (!phoneNumber || !code) {
    return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 });
  }

  const phone = phoneNumber.replace(/[^\d+]/g, '');
  const docId = phone.replace('+', '');
  const otpRef = adminDb().collection('otpCodes').doc(docId);
  const snap = await otpRef.get();

  if (!snap.exists) {
    return NextResponse.json({ error: 'Code expiré ou invalide.' }, { status: 400 });
  }

  const data = snap.data()!;

  // Max 3 attempts
  if (data.attempts >= 3) {
    await otpRef.delete();
    return NextResponse.json(
      { error: 'Trop de tentatives. Renvoyez un nouveau code.' },
      { status: 429 }
    );
  }

  // Check expiry
  const expiresAt: Date =
    data.expiresAt instanceof Date ? data.expiresAt : data.expiresAt?.toDate?.();
  if (!expiresAt || Date.now() > expiresAt.getTime()) {
    await otpRef.delete();
    return NextResponse.json({ error: 'Code expiré. Renvoyez un nouveau code.' }, { status: 400 });
  }

  // Wrong code
  if (data.code !== code) {
    await otpRef.update({ attempts: FieldValue.increment(1) });
    const remaining = 2 - data.attempts;
    return NextResponse.json(
      { error: `Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.` },
      { status: 400 }
    );
  }

  // ✓ OTP valid
  await otpRef.delete();

  // UID format: wa_<phone without +>
  const uid = `wa_${docId}`;
  const customToken = await adminAuth().createCustomToken(uid, { phoneNumber: phone });

  return NextResponse.json({ customToken });
}
