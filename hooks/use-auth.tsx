'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithCustomToken,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  loading: boolean;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendWhatsAppOtp: (phoneNumber: string) => Promise<{ devCode?: string }>;
  verifyWhatsAppOtp: (phoneNumber: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  resetPassword: async () => {},
  sendWhatsAppOtp: async () => ({}),
  verifyWhatsAppOtp: async () => {},
  logout: async () => {},
});

export function authErrorToFrench(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Cet email est déjà utilisé.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/invalid-credential': 'Email ou mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cet email.',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
    'auth/invalid-email': 'Adresse email invalide.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
    'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
    'auth/user-disabled': 'Ce compte a été désactivé.',
  };
  return map[code] ?? 'Une erreur est survenue. Réessayez.';
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeProfile = onSnapshot(docRef, async (snap) => {
            if (snap.exists()) {
              setProfile(snap.data());
              setLoading(false);
            } else {
              // WhatsApp users have uid prefixed with "wa_"
              const isWhatsApp = firebaseUser.uid.startsWith('wa_');
              const phoneFromUid = isWhatsApp ? '+' + firebaseUser.uid.slice(3) : null;

              const newProfile = {
                displayName: firebaseUser.displayName ?? phoneFromUid ?? 'Utilisateur Awder',
                role: 'guest',
                isVerified: false,
                idVerificationStatus: 'unverified',
                createdAt: serverTimestamp(),
                ...(isWhatsApp
                  ? { phoneNumber: phoneFromUid }
                  : { email: firebaseUser.email }),
              };

              await setDoc(docRef, newProfile);
              await setDoc(doc(db, 'wallets', firebaseUser.uid), {
                userId: firebaseUser.uid,
                balance: 0,
                escrow: 0,
                currency: 'XOF',
                updatedAt: serverTimestamp(),
              });
            }
          }, (err) => {
            console.error('Profile listen error:', err);
            setLoading(false);
          });
        } catch (error) {
          console.error('Profile sync error:', error);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const sendWhatsAppOtp = async (phoneNumber: string): Promise<{ devCode?: string }> => {
    const res = await fetch('/api/auth/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Erreur d\'envoi.');
    return { devCode: data.devCode };
  };

  const verifyWhatsAppOtp = async (phoneNumber: string, code: string) => {
    const res = await fetch('/api/auth/whatsapp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Code invalide.');
    await signInWithCustomToken(auth, data.customToken);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signUpWithEmail, signInWithEmail, resetPassword, sendWhatsAppOtp, verifyWhatsAppOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
