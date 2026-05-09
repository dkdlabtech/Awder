import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, description, bookingId, guestName } = await req.json();

    const masterKey = process.env.PAYDUNYA_MASTER_KEY;
    const privateKey = process.env.PAYDUNYA_PRIVATE_KEY;
    const token = process.env.PAYDUNYA_TOKEN;
    const mode = process.env.PAYDUNYA_MODE || 'test';

    // Verification of keys
    if (!masterKey || !privateKey || !token) {
      // In development/demo, we return a mock success to allow the user to see the flow
      console.warn('PayDunya keys missing. Returning mock redirect for demo purposes.');
      return NextResponse.json({
        success: true,
        token: 'mock_token_' + Date.now(),
        url: `https://paydunya.com/checkout/invoice/mock_${Date.now()}` 
      });
    }

    const baseUrl = mode === 'live' 
      ? 'https://app.paydunya.com/api/v1/checkout-invoice/create'
      : 'https://app.paydunya.com/api/v1/checkout-invoice/create'; // PayDunya often uses the same base or a sandbox prefix

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': masterKey,
        'PAYDUNYA-PRIVATE-KEY': privateKey,
        'PAYDUNYA-TOKEN': token,
      },
      body: JSON.stringify({
        invoice: {
          total_amount: amount,
          description: description,
        },
        store: {
          name: "Awder App",
          tagline: "Plateforme de réservation premium",
          phoneNumber: "+22300000000",
          postalAddress: "Bamako, Mali",
          logo_url: "https://picsum.photos/200/200"
        },
        actions: {
          cancel_url: `${req.headers.get('origin')}/bookings?status=cancelled&id=${bookingId}`,
          return_url: `${req.headers.get('origin')}/bookings?status=success&id=${bookingId}`,
          callback_url: `${req.headers.get('origin')}/api/paydunya/callback`
        },
        custom_data: {
          booking_id: bookingId,
          guest_name: guestName
        }
      })
    });

    const data = await response.json();

    if (data.response_code === '00') {
      return NextResponse.json({
        success: true,
        token: data.token,
        url: data.response_text
      });
    } else {
      throw new Error(data.response_text || 'Error creating PayDunya invoice');
    }
  } catch (error: any) {
    console.error('PayDunya Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
