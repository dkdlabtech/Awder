'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth, authErrorToFrench } from '@/hooks/use-auth';
import {
  X,
  User,
  Mail,
  ShieldCheck,
  MessageSquare,
  Phone,
} from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  /** Message contextuel affiché en haut (optionnel). */
  contextMessage?: string;
}

/**
 * Modal de connexion réutilisable.
 * Supporte email/password et WhatsApp OTP.
 * Peut être déclenché depuis n'importe quelle page.
 */
export default function LoginModal({
  onClose,
  onSuccess,
  contextMessage,
}: LoginModalProps) {
  const {
    signInWithEmail,
    signUpWithEmail,
    sendWhatsAppOtp,
    verifyWhatsAppOtp,
  } = useAuth();

  const [tab, setTab] = useState<'email' | 'whatsapp'>('whatsapp');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Votre prénom est requis.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, displayName.trim());
      } else {
        await signInWithEmail(email, password);
      }
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(authErrorToFrench(e.code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    setDevCodeHint('');
    try {
      const { devCode } = await sendWhatsAppOtp(phone);
      setStep('otp');
      if (devCode) {
        setOtp(devCode);
        setDevCodeHint(`Mode dev : code = ${devCode}`);
      }
    } catch (e: any) {
      setError(e.message ?? "Erreur d'envoi du code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await verifyWhatsAppOtp(phone, otp);
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Code invalide.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-awder-brun/95 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative max-h-[95vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-8 p-3 bg-awder-sable/40 text-awder-grisbrun rounded-2xl hover:bg-awder-sable transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-awder-ocre/10 rounded-full flex items-center justify-center mx-auto text-awder-ocre">
              <User className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-semibold text-awder-brun tracking-tighter leading-none">
                Bienvenue chez Awder
              </h3>
              <p className="text-sm font-bold text-awder-grisbrun tracking-tight italic">
                {contextMessage ?? 'Connectez-vous pour continuer.'}
              </p>
            </div>
          </div>

          {/* Tab Email / WhatsApp */}
          <div className="flex bg-awder-sable/40 rounded-2xl p-1">
            <button
              onClick={() => {
                setTab('email');
                setStep('form');
                setError('');
              }}
              className={`flex-1 py-3 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                tab === 'email'
                  ? 'bg-white text-awder-brun shadow-sm'
                  : 'text-awder-grisbrun'
              }`}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
            <button
              onClick={() => {
                setTab('whatsapp');
                setStep('form');
                setError('');
              }}
              className={`flex-1 py-3 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                tab === 'whatsapp'
                  ? 'bg-white text-awder-brun shadow-sm'
                  : 'text-awder-grisbrun'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-xs font-bold text-center">
              {error}
            </div>
          )}

          {/* Email */}
          {tab === 'email' && (
            <div className="space-y-4">
              <div className="flex bg-awder-sable/40 rounded-2xl p-1">
                <button
                  onClick={() => {
                    setMode('signin');
                    setError('');
                  }}
                  className={`flex-1 py-2 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all ${
                    mode === 'signin'
                      ? 'bg-white text-awder-brun shadow-sm'
                      : 'text-awder-grisbrun'
                  }`}
                >
                  Connexion
                </button>
                <button
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  className={`flex-1 py-2 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-awder-brun shadow-sm'
                      : 'text-awder-grisbrun'
                  }`}
                >
                  Inscription
                </button>
              </div>

              {mode === 'signup' && (
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre" />
                  <input
                    type="text"
                    placeholder="Votre prénom"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun"
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre" />
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun"
                />
              </div>

              <div className="relative group">
                <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre" />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                  className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun"
                />
              </div>

              <button
                onClick={handleEmailAuth}
                disabled={loading || !email || !password}
                className="w-full py-6 bg-awder-ocre text-white rounded-2xl font-semibold text-sm uppercase tracking-[0.2em] shadow-xl shadow-awder-ocre/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : mode === 'signin' ? (
                  'Se Connecter'
                ) : (
                  'Créer mon compte'
                )}
              </button>
            </div>
          )}

          {/* WhatsApp */}
          {tab === 'whatsapp' && (
            <div className="space-y-4">
              {step === 'form' ? (
                <>
                  <p className="text-[10px] font-semibold text-awder-gold uppercase tracking-[0.4em] text-center">
                    Votre numéro WhatsApp
                  </p>
                  <div className="relative group">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre" />
                    <input
                      type="tel"
                      placeholder="+223 70 00 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun"
                    />
                  </div>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading || !phone}
                    className="w-full py-6 bg-awder-ocre text-white rounded-2xl font-semibold text-sm uppercase tracking-[0.2em] shadow-xl shadow-awder-ocre/20 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      'Recevoir le code'
                    )}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-semibold text-awder-gold uppercase tracking-[0.4em] text-center">
                    Code reçu par WhatsApp
                  </p>
                  {devCodeHint && (
                    <p className="text-xs text-center text-blue-500 font-bold">
                      {devCodeHint}
                    </p>
                  )}
                  <div className="relative group">
                    <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre" />
                    <input
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                      className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun text-center text-2xl tracking-widest"
                    />
                  </div>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || !otp}
                    className="w-full py-6 bg-awder-ocre text-white rounded-2xl font-semibold text-sm uppercase tracking-[0.2em] shadow-xl shadow-awder-ocre/20 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      'Vérifier'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setStep('form');
                      setOtp('');
                    }}
                    className="w-full text-xs font-bold text-awder-grisbrun"
                  >
                    ← Changer de numéro
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
