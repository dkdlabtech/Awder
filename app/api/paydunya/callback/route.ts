import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp,
  increment,
  setDoc
} from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    // PayDunya sends data as Form Data in IPN (Instant Payment Notification)
    // Keys: data[token], data[hash], etc.
    const token = data.get('data[token]')?.toString();
    const status = data.get('data[status]')?.toString();
    const customData = data.get('data[custom_data]')?.toString(); // We should have passed bookingId here
    
    // For this implementation, we assume we use a simpler approach or the user provides keys
    // In production, you would fetch the invoice details using the token to verify:
    // GET https://paydunya.com/api/v1/checkout-invoice/confirm/{token}

    if (status === 'completed') {
      // Find the booking. We need to know which booking this is.
      // Ideally we passed bookingId in custom_data during checkout.
      let bookingId = '';
      try {
        const parsedCustomData = customData ? JSON.parse(customData) : {};
        bookingId = parsedCustomData.booking_id;
      } catch (e) {
        console.error('Error parsing custom data', e);
      }

      if (bookingId) {
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        
        if (bookingSnap.exists()) {
          const bookingData = bookingSnap.data();
          
          if (bookingData.status === 'pending_payment') {
            // 1. Update Booking
            await updateDoc(bookingRef, {
              status: 'paid_escrow',
              cautionStatus: 'blocked',
              paymentToken: token,
              paidAt: new Date().toISOString()
            });

            // 2. Create Transaction
            await addDoc(collection(db, 'transactions'), {
              bookingId,
              guestId: bookingData.guestId,
              hostId: bookingData.hostId,
              amount: bookingData.totalPrice,
              type: 'payment',
              status: 'escrow',
              method: 'paydunya',
              description: `Paiement Escrow : ${bookingData.listingTitle}`,
              createdAt: new Date().toISOString()
            });

            // 3. Update Wallet Escrow
            const walletRef = doc(db, 'wallets', bookingData.hostId);
            await setDoc(walletRef, {
              escrow: increment(bookingData.totalPrice),
              updatedAt: serverTimestamp()
            }, { merge: true });

            // 4. Notification for Host
            await addDoc(collection(db, 'notifications'), {
                userId: bookingData.hostId,
                title: 'Nouveau Paiement Reçu',
                message: `Le paiement pour "${bookingData.listingTitle}" a été sécurisé en escrow.`,
                type: 'payment_received',
                read: false,
                createdAt: new Date().toISOString()
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PayDunya Callback Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
