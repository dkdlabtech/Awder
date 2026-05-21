import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { adminGuard, logAdminAction, getClientIp } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

interface ModerateBody {
  listingId: string;
  decision: 'approve' | 'reject';
  reason?: string;
}

export async function POST(req: NextRequest) {
  const guard = await adminGuard(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: adminId } = guard;

  try {
    const { listingId, decision, reason } = (await req.json()) as ModerateBody;
    if (!listingId || !decision) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const db = adminDb();
    const listingRef = db.collection('listings').doc(listingId);
    const snap = await listingRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 });
    }
    const listing = snap.data()!;

    const now = new Date().toISOString();

    if (decision === 'approve') {
      await listingRef.update({
        moderationStatus: 'approved',
        isActive: true,
        reviewedBy: adminId,
        reviewedAt: now,
        rejectionReason: null,
      });

      // Notifier l'hôte
      await db.collection('notifications').add({
        userId: listing.hostId,
        title: 'Annonce approuvée',
        message: `Votre annonce "${listing.title}" est désormais visible sur Awder.`,
        type: 'listing_approved',
        read: false,
        link: `/listing/${listingId}`,
        createdAt: now,
      });
    } else {
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: 'Une raison de rejet est requise.' }, { status: 400 });
      }
      await listingRef.update({
        moderationStatus: 'rejected',
        isActive: false,
        reviewedBy: adminId,
        reviewedAt: now,
        rejectionReason: reason.trim(),
      });

      await db.collection('notifications').add({
        userId: listing.hostId,
        title: 'Annonce rejetée',
        message: `Votre annonce "${listing.title}" a été rejetée. Raison : ${reason.trim()}`,
        type: 'listing_rejected',
        read: false,
        link: `/host/listings/${listingId}`,
        createdAt: now,
      });
    }

    // Audit log
    await logAdminAction({
      adminId,
      action: decision === 'approve' ? 'listing_approved' : 'listing_rejected',
      targetType: 'listing',
      targetId: listingId,
      details: { listingTitle: listing.title, hostId: listing.hostId, reason },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('admin moderate listing error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
