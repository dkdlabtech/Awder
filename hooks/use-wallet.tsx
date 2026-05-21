'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Hook pour le wallet d'un utilisateur (solde + escrow temps réel).
 */
export function useWallet(uid: string | null) {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setWallet(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'wallets', uid),
      (snap) => {
        setWallet(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (e) => {
        console.error('wallet error:', e);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  return { wallet, loading };
}

/**
 * Hook pour les transactions de l'utilisateur courant.
 */
export function useTransactions(uid: string | null, max = 10) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        console.error('transactions error:', e);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid, max]);

  return { transactions, loading };
}
