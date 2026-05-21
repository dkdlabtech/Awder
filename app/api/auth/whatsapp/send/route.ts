import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export async function POST(req: NextRequest) {
  const { phoneNumber } = await req.json();

  if (!phoneNumber) {
    return NextResponse.json({ error: 'Numéro requis.' }, { status: 400 });
  }

  const phone = sanitizePhone(phoneNumber);
  if (!phone.match(/^\+\d{7,15}$/)) {
    return NextResponse.json(
      { error: 'Numéro invalide. Utilisez le format international (+223...).' },
      { status: 400 }
    );
  }

  // Rate limit: max 5 OTP sends per phone per hour
  const phoneRL = await checkRateLimit({ key: phone, bucket: 'wa_send_phone', max: 5, windowSec: 3600 });
  if (!phoneRL.allowed) {
    return NextResponse.json(
      { error: 'Trop de codes demandés. Réessayez dans une heure.' },
      { status: 429 }
    );
  }
  // Rate limit: max 20 OTP sends per IP per hour (defense in depth)
  const ipRL = await checkRateLimit({ key: getClientIp(req), bucket: 'wa_send_ip', max: 20, windowSec: 3600 });
  if (!ipRL.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429 }
    );
  }

  const docId = phone.replace('+', '');
  const otpRef = adminDb().collection('otpCodes').doc(docId);
  const existing = await otpRef.get();

  // Rate limit: 60 s between sends
  if (existing.exists) {
    // Admin SDK returns Firestore Timestamps; .toDate() normalises both Timestamp and Date
    const created = existing.data()!.createdAt;
    const createdMs: number = created?.toDate?.()?.getTime?.() ?? created?.getTime?.() ?? 0;
    if (Date.now() - createdMs < 60_000) {
      return NextResponse.json(
        { error: 'Veuillez attendre 60 secondes avant de renvoyer un code.' },
        { status: 429 }
      );
    }
  }

  const otp = generateOtp();
  await otpRef.set({
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60_000),
    createdAt: new Date(),
    attempts: 0,
  });

  // --- DEV MODE ---
  // When WHATSAPP_DEV_MODE=true, skip the real WhatsApp send and return the OTP
  // directly so the full auth flow can be tested before the template is approved.
  if (process.env.WHATSAPP_DEV_MODE === 'true') {
    console.log(`\n🔑 [WHATSAPP DEV MODE] Code OTP pour ${phone} : ${otp}\n`);
    return NextResponse.json({ success: true, devMode: true, devCode: otp });
  }

  // --- Meta Cloud API ---
  // You need an approved WhatsApp Business template.
  // Template category: AUTHENTICATION
  // Template body example: "Votre code Awder est : {{1}}. Valable 10 minutes."
  // Set WHATSAPP_TEMPLATE_NAME to the exact name of your approved template.
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME ?? 'awder_otp';

  if (!token || !phoneNumberId) {
    console.error('Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID env vars');
    return NextResponse.json({ error: 'Configuration WhatsApp manquante.' }, { status: 500 });
  }

  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'fr' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      }),
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json();
    console.error('Meta WhatsApp API error:', JSON.stringify(err));
    return NextResponse.json(
      { error: 'Échec de l\'envoi WhatsApp. Vérifiez la configuration Meta.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
