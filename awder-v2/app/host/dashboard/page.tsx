'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MobileLayout } from '@/components/mobile-layout';
import { useAuth } from '@/hooks/use-auth';
import { useHostListings } from '@/hooks/use-listings';
import { useHostBookings } from '@/hooks/use-bookings';
import { useWallet, useTransactions } from '@/hooks/use-wallet';
import KYCForm from '@/components/kyc/KYCForm';
import { AddListingOverlay } from '@/components/host/AddListingOverlay';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, limit, onSnapshot,
  addDoc, doc,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import {
  Activity, Wallet, Home as HomeIcon, Calendar, Settings,
  User, ShieldCheck, ArrowUpRight, ArrowRight, Bell,
  Plus, Headphones, Star, BarChart3, CheckCircle2,
  Clock, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SubTab = 'overview' | 'finance' | 'listings' | 'calendar' | 'settings';

export default function HostDashboardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [showAddListing, setShowAddListing] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const { listings } = useHostListings(user?.uid ?? null);
  const { bookings } = useHostBookings(user?.uid ?? null);
  const { wallet } = useWallet(user?.uid ?? null);
  const { transactions } = useTransactions(user?.uid ?? null, 10);

  // Rediriger si non connecté ou non hôte
  useEffect(() => {
    if (!user) { router.replace('/profile'); return; }
  }, [user, router]);

  // Notifications temps réel
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleAddListing = () => {
    if (!profile?.idVerificationStatus || profile.idVerificationStatus === 'none' || profile.idVerificationStatus === 'rejected') {
      setShowKYC(true);
    } else {
      setShowAddListing(true);
    }
  };

  if (!user) return null;

  return (
    <MobileLayout activeTab="home" hideBecomeHost>
      <div className="px-6 py-10 space-y-8 pb-32">

        {/* Header */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-awder-gold uppercase tracking-[0.3em]">
              Hôte Koron
            </p>
            <h2 className="text-4xl font-black text-awder-brun tracking-tighter leading-none">
              {subTab === 'overview' && 'Mes Gains Awder'}
              {subTab === 'finance' && 'Finance'}
              {subTab === 'listings' && 'Mes Annonces'}
              {subTab === 'calendar' && 'Calendrier Koron'}
              {subTab === 'settings' && 'Paramétrage'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm relative"
            >
              <Bell className="w-5 h-5 text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-awder-ocre text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => router.push('/')}
              className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col items-center gap-1"
            >
              <User className="w-5 h-5 text-slate-300" />
              <span className="text-[8px] font-black uppercase tracking-widest">VOYAGEUR</span>
            </button>
          </div>
        </div>

        {/* Sous-onglets */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
          {([
            { key: 'overview', icon: <Activity className="w-4 h-4" />, label: 'Aperçu' },
            { key: 'finance', icon: <Wallet className="w-4 h-4" />, label: 'Finance' },
            { key: 'listings', icon: <HomeIcon className="w-4 h-4" />, label: 'Annonces' },
            { key: 'calendar', icon: <Calendar className="w-4 h-4" />, label: 'Calendrier' },
            { key: 'settings', icon: <Settings className="w-4 h-4" />, label: 'Paramètres' },
          ] as { key: SubTab; icon: React.ReactNode; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[20px] font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${
                subTab === t.key
                  ? 'bg-awder-brun text-white shadow-xl shadow-awder-brun/20'
                  : 'bg-white border border-slate-100 text-slate-400'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Aperçu ── */}
        {subTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-awder-brun rounded-[32px] text-white space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Solde Wallet</p>
                <p className="text-2xl font-black">{formatPrice(wallet?.balance || 0)} F</p>
              </div>
              <div className="p-6 bg-awder-ocre/10 rounded-[32px] space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-awder-ocre/60">En Séquestre</p>
                <p className="text-2xl font-black text-awder-ocre">{formatPrice(wallet?.escrow || 0)} F</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-[32px] space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Annonces actives</p>
                <p className="text-2xl font-black text-awder-brun">{listings.filter(l => l.isActive).length}</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-[32px] space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Réservations</p>
                <p className="text-2xl font-black text-awder-brun">{bookings.length}</p>
              </div>
            </div>

            {/* Bouton ajouter annonce */}
            <button
              onClick={handleAddListing}
              className="w-full py-5 bg-awder-ocre text-white rounded-[32px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-awder-ocre/20 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              Ajouter une annonce
            </button>

            {/* KYC status si non vérifié */}
            {(!profile?.idVerificationStatus || profile.idVerificationStatus === 'none') && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-[24px] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-amber-900 text-sm">Vérification d'identité requise</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Vérifiez votre identité pour publier vos annonces. 2 photos, 2 minutes.
                  </p>
                  <button
                    onClick={() => setShowKYC(true)}
                    className="mt-2 text-xs font-black text-amber-700 underline"
                  >
                    Vérifier maintenant →
                  </button>
                </div>
              </div>
            )}

            {profile?.idVerificationStatus === 'pending' && (
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-[24px] flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-blue-900 text-sm">Vérification en cours</p>
                  <p className="text-xs text-blue-700 mt-1">Notre équipe vérifie votre identité sous 24h.</p>
                </div>
              </div>
            )}

            {/* Réservations récentes */}
            {bookings.length > 0 && (
              <div className="space-y-3">
                <p className="font-black text-awder-brun text-sm uppercase tracking-widest">Réservations récentes</p>
                {bookings.slice(0, 3).map((b) => (
                  <div key={b.id} className="p-4 bg-white border border-slate-100 rounded-[24px] flex items-center justify-between">
                    <div>
                      <p className="font-black text-awder-brun text-sm">{b.listingTitle}</p>
                      <p className="text-xs text-slate-400">{b.startDate} → {b.endDate}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                      b.status === 'paid_escrow' ? 'bg-emerald-50 text-emerald-700' :
                      b.status === 'completed' ? 'bg-slate-100 text-slate-500' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {b.status === 'paid_escrow' ? 'Confirmée' : b.status === 'completed' ? 'Terminée' : b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Finance ── */}
        {subTab === 'finance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-8 bg-awder-brun rounded-[40px] text-white space-y-4 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-awder-gold/10 rounded-full -mr-24 -mt-24 blur-3xl" />
              <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Solde Disponible</p>
              <p className="text-4xl font-black">{formatPrice(wallet?.balance || 0)} F</p>
              <button className="w-full py-3 bg-awder-gold text-awder-brun rounded-2xl font-black text-xs uppercase tracking-widest">
                Retirer les fonds
              </button>
            </div>

            <div className="space-y-3">
              <p className="font-black text-awder-brun text-sm uppercase tracking-widest px-2">Transactions</p>
              {transactions.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm font-bold">
                  Aucune transaction pour l'instant
                </div>
              ) : transactions.map((tx: any) => (
                <div key={tx.id} className="p-5 bg-white border border-slate-100 rounded-[24px] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${
                      tx.type === 'payment' ? 'bg-green-50 text-green-600' :
                      tx.type === 'escrow_release' ? 'bg-awder-gold/10 text-awder-gold' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      {tx.type === 'payment' ? <ArrowUpRight className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-black text-awder-brun text-xs">{tx.description}</p>
                      <p className="text-[10px] text-slate-300 font-bold uppercase">
                        {tx.createdAt ? format(new Date(typeof tx.createdAt === 'string' ? tx.createdAt : tx.createdAt.toDate()), 'dd MMM yyyy') : ''}
                      </p>
                    </div>
                  </div>
                  <p className="font-black text-sm text-awder-brun">{formatPrice(tx.amount)} F</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Annonces ── */}
        {subTab === 'listings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <button
              onClick={handleAddListing}
              className="w-full py-4 bg-awder-ocre/10 border-2 border-dashed border-awder-ocre/30 rounded-[24px] font-black text-awder-ocre text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouvelle annonce
            </button>
            {listings.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm font-bold">
                Aucune annonce pour l'instant
              </div>
            ) : listings.map((l) => (
              <div key={l.id} className="p-5 bg-white border border-slate-100 rounded-[24px] flex items-start justify-between">
                <div>
                  <p className="font-black text-awder-brun text-sm">{l.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{l.location?.city} · {formatPrice(l.price)} F/{l.pricingType === 'hourly' ? 'h' : 'nuit'}</p>
                  <span className={`mt-2 inline-block text-[10px] font-black px-2 py-0.5 rounded-full ${
                    l.moderationStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                    l.moderationStatus === 'pending_review' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {l.moderationStatus === 'approved' ? 'Publiée' :
                     l.moderationStatus === 'pending_review' ? 'En attente' : 'Rejetée'}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Calendrier ── */}
        {subTab === 'calendar' && (
          <div className="py-10 text-center space-y-3">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-slate-400 font-bold text-sm">Calendrier — bientôt disponible</p>
          </div>
        )}

        {/* ── Paramètres ── */}
        {subTab === 'settings' && (
          <div className="space-y-4">
            <button
              onClick={() => router.push('/profile')}
              className="w-full p-5 bg-white border border-slate-100 rounded-[24px] text-left font-black text-awder-brun text-sm"
            >
              Mon profil & Identité →
            </button>
            <button
              onClick={() => router.push('/boss')}
              className="w-full p-5 bg-white border border-slate-100 rounded-[24px] text-left font-black text-awder-brun text-sm"
            >
              Backoffice Admin →
            </button>
          </div>
        )}
      </div>

      {/* KYC Modal */}
      {showKYC && user && (
        <div className="fixed inset-0 z-[200] bg-awder-brun/95 flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-t-[40px] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-awder-brun text-lg">Vérification d'identité</h3>
              <button onClick={() => setShowKYC(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400 text-lg">×</button>
            </div>
            <KYCForm
              userId={user.uid}
              currentStatus={profile?.idVerificationStatus ?? 'none'}
              triggeredByPublication
              onComplete={() => { setShowKYC(false); setShowAddListing(true); }}
              onCancel={() => setShowKYC(false)}
            />
          </div>
        </div>
      )}

      {/* AddListing Overlay */}
      {showAddListing && (
        <AddListingOverlay
          onClose={() => setShowAddListing(false)}
          onSuccess={() => setShowAddListing(false)}
        />
      )}
    </MobileLayout>
  );
}
