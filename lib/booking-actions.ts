import { auth } from './firebase';

export type BookingAction = 'check_in' | 'check_out' | 'release_caution' | 'cancel' | 'extend_stay' | 'open_dispute';

interface BookingActionOptions {
  duration?: number;
  disputeReason?: string;
}

export async function callBookingAction(
  bookingId: string,
  action: BookingAction,
  durationOrOptions?: number | BookingActionOptions
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Non authentifié.');
  const idToken = await user.getIdToken();

  // Rétro-compatibilité : 3e argument peut être un nombre (duration) ou un objet
  const opts: BookingActionOptions =
    typeof durationOrOptions === 'number'
      ? { duration: durationOrOptions }
      : durationOrOptions ?? {};

  const res = await fetch('/api/bookings/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      bookingId,
      action,
      ...(opts.duration ? { duration: opts.duration } : {}),
      ...(opts.disputeReason ? { disputeReason: opts.disputeReason } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
    throw new Error(err.error ?? 'Erreur lors de l\'action.');
  }
}
