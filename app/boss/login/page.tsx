'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Shield, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function BossLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Connexion Firebase
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // 2. Vérifier le rôle admin (custom claim OU role Firestore)
      const tokenResult = await cred.user.getIdTokenResult(true); // force refresh
      const hasClaim = tokenResult.claims.admin === true;

      let isAdmin = hasClaim;
      if (!isAdmin) {
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        isAdmin = snap.exists() && snap.data().role === 'admin';
      }

      if (!isAdmin) {
        // Non admin : déconnecter et rejeter
        await auth.signOut();
        setError('Accès refusé. Ce compte n\'a pas les privilèges administrateur.');
        setLoading(false);
        return;
      }

      // 3. Rediriger vers le dashboard
      router.replace('/boss/dashboard');
    } catch (err: any) {
      let msg = 'Identifiants invalides.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Email ou mot de passe incorrect.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Trop de tentatives. Réessayez dans quelques minutes.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-stone-900 flex items-center justify-center p-4">
      {/* Effet de fond subtil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 mb-4 shadow-lg shadow-orange-500/20">
            <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Awder <span className="text-orange-400">Boss</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Portail d'administration de la plateforme
          </p>
        </div>

        {/* Carte formulaire */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block uppercase tracking-wider">
                Email administrateur
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@awder.com"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-medium py-2.5 rounded-lg transition shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Accéder au backoffice
                </>
              )}
            </button>
          </form>

          {/* Note sécurité */}
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">
              <Lock className="w-3 h-3 inline mr-1" />
              Accès strictement réservé aux administrateurs Awder
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          © {new Date().getFullYear()} Awder · Confiance & Sécurité Sira-Djou
        </p>
      </div>
    </div>
  );
}
