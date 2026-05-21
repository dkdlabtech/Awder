import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface CheckoutBody {
  amount: number;
  description: string;
  bookingId: string;
  guestName: string;
  paymentMethod: 'wave' | 'orange_money' | 'moov' | 'paydunya';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutBody;
    const { amount, description, bookingId, guestName } = body;

    if (!bookingId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Données invalides.' }, { status: 400 });
    }

    // Rate limit: max 10 checkout attempts per IP per minute
    const rl = await checkRateLimit({ key: getClientIp(req), bucket: 'checkout', max: 10, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: 'Trop de requêtes.' }, { status: 429 });
    }

    // Verify booking exists and belongs to a real user
    const db = adminDb();
    const bookingSnap = await db.collection('bookings').doc(bookingId).get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ success: false, error: 'Réservation introuvable.' }, { status: 404 });
    }
    const booking = bookingSnap.data()!;
    if (booking.totalPrice !== amount) {
      return NextResponse.json({ success: false, error: 'Montant incohérent.' }, { status: 400 });
    }

    const masterKey = process.env.PAYDUNYA_MASTER_KEY;
    const privateKey = process.env.PAYDUNYA_PRIVATE_KEY;
    const token = process.env.PAYDUNYA_TOKEN;
    const mode = process.env.PAYDUNYA_MODE ?? 'test';

    // ── Demo mode (no PayDunya keys configured) ──────────────────────────────
    if (!masterKey || !privateKey || !token || masterKey === 'your_master_key') {
      const demoToken = `demo_${Date.now()}_${bookingId.slice(0, 6)}`;
      return NextResponse.json({
        success: true,
        demo: true,
        token: demoToken,
        url: `${req.headers.get('origin')}/bookings?status=success&id=${bookingId}&demo=1`,
      });
    }

    // ── Real PayDunya call ────────────────────────────────────────────────────
    const baseUrl =
      mode === 'live'
        ? 'https://app.paydunya.com/api/v1/checkout-invoice/create'
        : 'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': masterKey,
        'PAYDUNYA-PRIVATE-KEY': privateKey,
        'PAYDUNYA-TOKEN': token,
      },
      body: JSON.stringify({
        invoice: { total_amount: amount, description },
        store: {
          name: 'Awder',
          tagline: 'Plateforme de réservation premium',
          phoneNumber: '+22300000000',
          postalAddress: 'Bamako, Mali',
        },
        actions: {
          cancel_url: `${req.headers.get('origin')}/bookings?status=cancelled&id=${bookingId}`,
          return_url: `${req.headers.get('origin')}/bookings?status=success&id=${bookingId}`,
          callback_url: `${req.headers.get('origin')}/api/paydunya/callback`,
        },
        custom_data: {
          booking_id: bookingId,
          guest_name: guestName,
        },
      }),
    });

    const data = await response.json();
    if (data.response_code !== '00') {
      throw new Error(data.response_text || 'PayDunya invoice creation failed');
    }

    return NextResponse.json({ success: true, token: data.token, url: data.response_text });
  } catch (error: any) {
    console.error('PayDunya checkout error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
