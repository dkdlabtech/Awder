import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from './firebase-admin';

/**
 * Vérifie l'identité depuis le header Authorization et retourne l'UID.
 */
export async function getUidFromAuthHeader(req: NextRequest): Promise<string | null> {
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

/**
 * Vérifie qu'un utilisateur est admin (custom claim OU role Firestore).
 * @returns le uid de l'admin si OK, null sinon.
 */
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const uid = await getUidFromAuthHeader(req);
  if (!uid) return null;

  try {
    // 1) Vérifier custom claim
    const userRecord = await adminAuth().getUser(uid);
    if (userRecord.customClaims?.admin === true) return uid;

    // 2) Sinon, vérifier le role dans Firestore
    const snap = await adminDb().collection('users').doc(uid).get();
    if (snap.exists && snap.data()?.role === 'admin') return uid;

    return null;
  } catch {
    return null;
  }
}

/**
 * Helper qui retourne une réponse 401/403 si non admin, sinon null.
 */
export async function adminGuard(req: NextRequest): Promise<{ uid: string } | NextResponse> {
  const uid = await getUidFromAuthHeader(req);
  if (!uid) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }
  const adminUid = await requireAdmin(req);
  if (!adminUid) {
    return NextResponse.json({ error: 'Accès admin requis.' }, { status: 403 });
  }
  return { uid: adminUid };
}

/**
 * Enregistre une action admin dans le journal d'audit.
 * Toujours appelé après une action admin réussie.
 */
export async function logAdminAction(params: {
  adminId: string;
  adminName?: string;
  action: string;
  targetType: 'listing' | 'user' | 'booking' | 'dispute' | 'config';
  targetId: string;
  details?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await adminDb().collection('auditLogs').add({
      ...params,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('audit log error:', err);
    // Ne pas faire échouer l'action principale si l'audit échoue
  }
}

/**
 * Extrait l'IP du client depuis les headers Next.js / proxy.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
