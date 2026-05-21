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
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';

/**
 * Hook pour récupérer les annonces approuvées et actives en temps réel.
 */
export function useListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'listings'),
      where('moderationStatus', '==', 'approved'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        setLoading(false);
        handleFirestoreError(e, OperationType.LIST, 'listings');
      },
    );
    return () => unsubscribe();
  }, []);

  return { listings, loading };
}

/**
 * Hook pour récupérer les annonces d'un hôte donné (tous statuts).
 */
export function useHostListings(hostId: string | null) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hostId) {
      setListings([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'listings'),
      where('hostId', '==', hostId),
      orderBy('createdAt', 'desc'),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        setLoading(false);
        console.error('host listings error:', e);
      },
    );
    return () => unsubscribe();
  }, [hostId]);

  return { listings, loading };
}
