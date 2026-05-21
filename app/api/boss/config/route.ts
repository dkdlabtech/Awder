import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { adminGuard, logAdminAction, getClientIp } from '@/lib/admin-auth';
import { invalidateConfigCache } from '@/lib/commission';

export const dynamic = 'force-dynamic';

interface ConfigBody {
  hostCommissionRate: number;
  guestServiceFeeRate: number;
  servicesCommissionRate: number;
  verifiedHostDiscount: number;
  zeroCommissionPromo: boolean;
  zeroCommissionUntil?: string | null;
  minBookingAmount: number;
  maxBookingAmount: number;
}

function isValidRate(n: number): boolean {
  return typeof n === 'number' && !isNaN(n) && n >= 0 && n <= 0.5;
}

export async function POST(req: NextRequest) {
  const guard = await adminGuard(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: adminId } = guard;

  try {
    const body = (await req.json()) as ConfigBody;

    // Validation
    if (
      !isValidRate(body.hostCommissionRate) ||
      !isValidRate(body.guestServiceFeeRate) ||
      !isValidRate(body.servicesCommissionRate) ||
      !isValidRate(body.verifiedHostDiscount)
    ) {
      return NextResponse.json(
        { error: 'Les taux doivent être entre 0% et 50%.' },
        { status: 400 }
      );
    }
    if (body.minBookingAmount < 0 || body.maxBookingAmount < body.minBookingAmount) {
      return NextResponse.json({ error: 'Limites de montant invalides.' }, { status: 400 });
    }

    const update = {
      hostCommissionRate: body.hostCommissionRate,
      guestServiceFeeRate: body.guestServiceFeeRate,
      servicesCommissionRate: body.servicesCommissionRate,
      verifiedHostDiscount: body.verifiedHostDiscount,
      zeroCommissionPromo: !!body.zeroCommissionPromo,
      zeroCommissionUntil: body.zeroCommissionUntil ?? null,
      minBookingAmount: Math.round(body.minBookingAmount),
      maxBookingAmount: Math.round(body.maxBookingAmount),
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };

    await adminDb().collection('platform').doc('config').set(update, { merge: true });
    invalidateConfigCache();

    await logAdminAction({
      adminId,
      action: 'config_updated',
      targetType: 'config',
      targetId: 'platform/config',
      details: update,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('admin config error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
