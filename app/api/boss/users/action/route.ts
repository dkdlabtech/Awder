import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { adminGuard, logAdminAction, getClientIp } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type UserAction =
  | 'verify_kyc'
  | 'reject_kyc'
  | 'ban'
  | 'unban'
  | 'grant_verified'
  | 'revoke_verified';

interface Body {
  userId: string;
  action: UserAction;
  reason?: string;
}

export async function POST(req: NextRequest) {
  const guard = await adminGuard(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: adminId } = guard;

  try {
    const { userId, action, reason } = (await req.json()) as Body;
    if (!userId || !action) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const db = adminDb();
    const userRef = db.collection('users').doc(userId);
    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }
    const user = snap.data()!;
    const now = new Date().toISOString();
    const ip = getClientIp(req);

    let auditAction: any = action;
    let updates: Record<string, any> = { updatedAt: now };
    let notification: { title: string; message: string; type: string } | null = null;

    switch (action) {
      case 'verify_kyc':
        updates = {
          ...updates,
          idVerificationStatus: 'verified',
          isVerified: true,
          verificationLevel: user.verificationLevel === 'none' ? 'kyc' : user.verificationLevel,
        };
        notification = {
          title: 'Identité vérifiée',
          message: 'Votre pièce d\'identité a été validée par Awder.',
          type: 'system',
        };
        break;

      case 'reject_kyc':
        updates = { ...updates, idVerificationStatus: 'rejected' };
        notification = {
          title: 'Vérification d\'identité rejetée',
          message: 'Votre pièce d\'identité n\'a pas pu être validée. Veuillez en soumettre une nouvelle.',
          type: 'system',
        };
        break;

      case 'ban':
        if (user.role === 'admin') {
          return NextResponse.json({ error: 'Impossible de bannir un admin.' }, { status: 400 });
        }
        if (!reason || !reason.trim()) {
          return NextResponse.json({ error: 'Raison requise.' }, { status: 400 });
        }
        updates = {
          ...updates,
          isBanned: true,
          banReason: reason.trim(),
          bannedAt: now,
          bannedBy: adminId,
        };
        auditAction = 'user_banned';
        notification = {
          title: 'Compte suspendu',
          message: `Votre compte Awder a été suspendu. Raison : ${reason.trim()}`,
          type: 'system',
        };
        break;

      case 'unban':
        updates = { ...updates, isBanned: false, banReason: null, bannedAt: null, bannedBy: null };
        auditAction = 'user_unbanned';
        notification = {
          title: 'Compte réactivé',
          message: 'Votre compte Awder est de nouveau actif.',
          type: 'system',
        };
        break;

      case 'grant_verified':
        updates = {
          ...updates,
          verificationLevel: 'visited',
          isVerified: true,
          visitedBy: adminId,
          visitedAt: now,
        };
        auditAction = 'badge_granted';
        notification = {
          title: 'Awder Vérifié 🎉',
          message: 'Votre profil est désormais "Awder Vérifié". Vos annonces bénéficient d\'une commission réduite à 4%.',
          type: 'system',
        };
        break;

      case 'revoke_verified':
        updates = { ...updates, verificationLevel: 'kyc' };
        auditAction = 'badge_revoked';
        break;

      default:
        return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
    }

    await userRef.update(updates);

    if (notification) {
      await db.collection('notifications').add({
        userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        createdAt: now,
      });
    }

    await logAdminAction({
      adminId,
      action: auditAction,
      targetType: 'user',
      targetId: userId,
      details: { reason },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('admin user action error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
