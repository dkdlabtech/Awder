'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Hook pour récupérer les bookings d'un voyageur (guest).
 */
export function useGuestBookings(uid: string | null) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setBookings([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'bookings'),
      where('guestId', '==', uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        console.error('bookings error:', e);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  return { bookings, loading };
}

/**
 * Hook pour récupérer les bookings reçus par un hôte.
 */
export function useHostBookings(uid: string | null) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setBookings([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'bookings'),
      where('hostId', '==', uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        console.error('host bookings error:', e);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  return { bookings, loading };
}
