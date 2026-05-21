import { auth } from './firebase';

export type BookingAction = 'check_in' | 'check_out' | 'release_caution' | 'cancel';

export async function callBookingAction(bookingId: string, action: BookingAction): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Non authentifié.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/bookings/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ bookingId, action }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
    throw new Error(err.error ?? 'Erreur lors de l\'action.');
  }
}
