'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';

interface AdminState {
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Hook qui vérifie si l'utilisateur courant est admin.
 */
export function useAdmin(_redirect = true): AdminState {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (authLoading) return;
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      try {
        const tokenResult = await user.getIdTokenResult();
        if (tokenResult.claims.admin === true) {
          if (!cancelled) {
            setIsAdmin(true);
            setLoading(false);
          }
          return;
        }

        const snap = await getDoc(doc(db, 'users', user.uid));
        const isAdminRole = snap.exists() && snap.data().role === 'admin';

        if (!cancelled) {
          setIsAdmin(isAdminRole);
          setLoading(false);
        }
      } catch (e) {
        console.error('admin check error:', e);
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, loading };
}

/**
 * Wrapper fetch authentifié pour les routes /api/boss/*
 */
export async function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const { auth } = await import('@/lib/firebase');
  const user = auth.currentUser;
  if (!user) throw new Error('Non authentifié.');
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
