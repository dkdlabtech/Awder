'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MobileLayout } from '@/components/mobile-layout';
import { useAuth } from '@/hooks/use-auth';
import LoginModal from '@/components/auth/LoginModal';
import BecomeHostFlow from '@/components/kyc/BecomeHostFlow';
import {
  User,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Gift,
  Headphones,
  PlusCircle,
  LogIn,
  Loader2,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showHostFlow, setShowHostFlow] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push('/');
    } catch {
      setLoggingOut(false);
    }
  };

  // ─── Non connecté ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <MobileLayout activeTab="profile">
        <div className="px-6 py-10 space-y-8 pb-32">
          <h2 className="text-4xl font-black text-awder-brun tracking-tighter">Profil</h2>

          {/* Card vide */}
          <div className="p-8 bg-awder-brun rounded-t-[50px] rounded-br-[50px] shadow-2xl shadow-awder-brun/20 text-center space-y-4">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto">
              <User className="w-10 h-10 text-white/60" />
            </div>
            <p className="text-white font-black text-lg">Connectez-vous</p>
            <p className="text-white/70 text-sm font-medium">
              Accédez à vos réservations, votre wallet et votre profil.
            </p>
          </div>

          {/* Bouton connexion principal */}
          <button
            onClick={() => setShowLogin(true)}
            className="w-full py-5 bg-awder-ocre text-white rounded-[32px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-awder-ocre/20 active:scale-95 transition-all"
          >
            <LogIn className="w-5 h-5" />
            Se connecter / S&apos;inscrire
          </button>

          {/* Avantages rapides */}
          <div className="grid grid-cols-1 gap-3">
            <BenefitRow icon={<CreditCard className="w-5 h-5" />} label="Gérez votre portefeuille Wallet" />
            <BenefitRow icon={<ShieldCheck className="w-5 h-5" />} label="Suivez vos réservations" />
            <BenefitRow icon={<Gift className="w-5 h-5" />} label="Parrainez vos proches (Terriyan)" />
            <BenefitRow icon={<PlusCircle className="w-5 h-5" />} label="Devenez hôte et gagnez en FCFA" />
          </div>
        </div>

        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onSuccess={() => {
              setShowLogin(false);
              router.refresh();
            }}
          />
        )}
      </MobileLayout>
    );
  }

  // ─── Connecté ────────────────────────────────────────────────────────────────
  return (
    <MobileLayout activeTab="profile">
      <div className="px-6 py-10 space-y-8 pb-32">
        <h2 className="text-4xl font-black text-awder-brun tracking-tighter">Profil</h2>

        {/* Carte identité */}
        <div
          className={`p-8 rounded-t-[50px] rounded-br-[50px] shadow-2xl relative overflow-hidden group transition-all ${
            profile?.role === 'host'
              ? 'bg-awder-ocre shadow-awder-ocre/20'
              : 'bg-awder-brun shadow-awder-brun/20'
          }`}
        >
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-[100px] opacity-20 bg-awder-gold" />
          <div className="relative flex items-center gap-6">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white text-3xl font-black">
              {profile?.displayName?.[0] || 'A'}
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black tracking-tight text-white">
                {profile?.displayName || 'Awder Voyageur'}
              </p>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full w-fit">
                {profile?.role === 'host' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-awder-gold" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      Hôte Koron
                    </span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-white/60" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
                      Voyageur Awder
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Voyageur / Devenir Hôte */}
        {profile?.role !== 'host' && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-[32px] flex gap-2">
            <div className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-awder-brun text-white shadow-xl text-center">
              Voyageur
            </div>
            <button
              onClick={() => setShowHostFlow(true)}
              className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Devenir Hôte
            </button>
          </div>
        )}

        {/* Menu profil */}
        <div className="grid grid-cols-1 gap-4">
          <ProfileLink
            icon={<User className="w-6 h-6" />}
            label="Informations Personnelles"
            onClick={() => {}}
          />
          <ProfileLink
            icon={<ShieldAlert className="w-6 h-6" />}
            label="Sécurité & Identité"
            badge={
              !profile?.idVerificationStatus || profile?.idVerificationStatus === 'none'
                ? 'À vérifier'
                : profile?.idVerificationStatus === 'pending'
                  ? 'En cours'
                  : undefined
            }
            onClick={() => {}}
          />
          <ProfileLink
            icon={<CreditCard className="w-6 h-6" />}
            label="Portefeuille Wallet"
            onClick={() => {}}
          />
          <ProfileLink
            icon={<Gift className="w-6 h-6" />}
            label="Terriyan (Parrainage)"
            highlight
            onClick={() => {}}
          />
          <ProfileLink
            icon={<Headphones className="w-6 h-6" />}
            label="Contacter Awder"
            onClick={() => {}}
          />
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-5 bg-red-50 text-red-500 rounded-[32px] font-black border border-red-100 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          Déconnexion
        </button>
      </div>

      {/* Flux Devenir Hôte */}
      {showHostFlow && user && (
        <BecomeHostFlow
          userId={user.uid}
          userName={profile?.displayName}
          onClose={() => setShowHostFlow(false)}
          onActivated={() => {
            setShowHostFlow(false);
            router.refresh();
          }}
        />
      )}
    </MobileLayout>
  );
}

function ProfileLink({
  icon,
  label,
  badge,
  highlight,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-6 bg-white rounded-[32px] border ${
        highlight ? 'border-awder-gold/30 bg-awder-gold/5' : 'border-slate-100'
      } hover:border-awder-gold group transition-all`}
    >
      <div className="flex items-center gap-5 text-slate-600 group-hover:text-awder-brun">
        <div
          className={`p-3 rounded-2xl transition-colors ${
            highlight
              ? 'bg-awder-gold text-white'
              : 'bg-slate-50 group-hover:bg-awder-gold/10 group-hover:text-awder-gold'
          }`}
        >
          {icon}
        </div>
        <span className="text-sm font-black tracking-tight">{label}</span>
      </div>
      {badge && (
        <span className="px-3 py-1 bg-red-50 text-red-500 text-[10px] font-black rounded-full uppercase tracking-widest">
          {badge}
        </span>
      )}
    </button>
  );
}

function BenefitRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-[24px] border border-slate-100">
      <div className="p-2.5 rounded-xl bg-awder-ocre/10 text-awder-ocre">{icon}</div>
      <span className="text-sm font-bold text-awder-brun">{label}</span>
    </div>
  );
}
