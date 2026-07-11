import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

interface KYCBody {
  docType: 'cni' | 'passport' | 'driver_license';
  idCardUrl: string;
  selfieUrl: string;
}

async function verifyUid(req: NextRequest): Promise<{ uid: string | null; reason?: string }> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return { uid: null, reason: 'token_absent' };
  try {
    const token = auth.slice(7);
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch (e: any) {
    // Remonte la cause réelle pour diagnostiquer la config Vercel (Admin SDK)
    return { uid: null, reason: e?.errorInfo?.code || e?.code || e?.message || 'verify_failed' };
  }
}

export async function POST(req: NextRequest) {
  const { uid, reason } = await verifyUid(req);
  if (!uid) {
    console.error('host kyc auth failed:', reason);
    return NextResponse.json(
      { error: 'Non authentifié.', reason },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as KYCBody;

    if (!body.idCardUrl || !body.selfieUrl) {
      return NextResponse.json(
        { error: 'Documents manquants.' },
        { status: 400 }
      );
    }
    if (!['cni', 'passport', 'driver_license'].includes(body.docType)) {
      return NextResponse.json(
        { error: 'Type de document invalide.' },
        { status: 400 }
      );
    }

    // Validation URLs Cloudinary
    if (
      !body.idCardUrl.startsWith('https://res.cloudinary.com/') ||
      !body.selfieUrl.startsWith('https://res.cloudinary.com/')
    ) {
      return NextResponse.json({ error: 'URLs invalides.' }, { status: 400 });
    }

    const db = adminDb();
    const now = new Date().toISOString();

    await db
      .collection('users')
      .doc(uid)
      .set(
        {
          idCardUrl: body.idCardUrl,
          selfieUrl: body.selfieUrl,
          idDocType: body.docType,
          idVerificationStatus: 'pending',
          kycSubmittedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

    // Notification interne (visible dans le Boss)
    await db.collection('notifications').add({
      userId: uid,
      title: 'Documents reçus',
      message:
        "Vos documents d'identité ont été reçus. Notre équipe vérifiera votre profil sous 24h ouvrées.",
      type: 'system',
      read: false,
      createdAt: now,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('host kyc error:', e);
    return NextResponse.json(
      { error: e.message ?? 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
