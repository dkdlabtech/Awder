'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { bossAuth, bossDb } from '@/lib/firebase';

interface AdminState {
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Hook qui vérifie si l'admin du BACK-OFFICE (session isolée bossAuth) est connecté.
 * Indépendant de la session de l'app voyageur/hôte.
 */
export function useAdmin(_redirect = true): AdminState {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(bossAuth, async (u) => {
      if (!u) {
        if (!cancelled) { setIsAdmin(false); setLoading(false); }
        return;
      }
      try {
        const tokenResult = await u.getIdTokenResult();
        if (tokenResult.claims.admin === true) {
          if (!cancelled) { setIsAdmin(true); setLoading(false); }
          return;
        }
        const snap = await getDoc(doc(bossDb, 'users', u.uid));
        const isAdminRole = snap.exists() && snap.data().role === 'admin';
        if (!cancelled) { setIsAdmin(isAdminRole); setLoading(false); }
      } catch (e) {
        console.error('admin check error:', e);
        if (!cancelled) { setIsAdmin(false); setLoading(false); }
      }
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  return { isAdmin, loading };
}

/**
 * Wrapper fetch authentifié pour les routes /api/boss/* — utilise la session boss isolée.
 */
export async function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const { bossAuth } = await import('@/lib/firebase');
  const user = bossAuth.currentUser;
  if (!user) throw new Error('Session admin expirée. Reconnectez-vous au back-office.');
  const idToken = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });
}
