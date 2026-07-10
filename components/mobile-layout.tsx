'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, MessageSquare, User, ArrowLeftRight, MapPinned } from 'lucide-react';

interface MobileLayoutProps {
  children: React.ReactNode;
  /** Remplace l'auto-détection depuis l'URL si nécessaire. */
  activeTab?: 'home' | 'bookings' | 'profile' | 'messages' | 'deals';
  /** Callback optionnel pour rétro-compatibilité avec page.tsx monolithe. */
  onTabChange?: (tab: any) => void;
  /** Callback optionnel rétro-compatibilité. */
  onBecomeHost?: () => void;
  /** Cacher la bannière "Devenez hôte". */
  hideBecomeHost?: boolean;
  /** Mode courant (double casquette) — affiche le toggle si fourni. */
  userMode?: 'voyageur' | 'hote';
  /** Bascule Voyage ⇄ Hôte (affichée seulement si l'utilisateur est hôte). */
  onToggleMode?: () => void;
}

export const MobileLayout = ({
  children,
  activeTab: activeTabProp,
  onTabChange,
  onBecomeHost,
  hideBecomeHost = false,
  userMode,
  onToggleMode,
}: MobileLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();

  // Auto-détection depuis l'URL — rétro-compatible avec monolithe
  const activeTab = activeTabProp ?? (
    pathname === '/' || pathname === '' ? 'home' :
    pathname?.startsWith('/bookings') ? 'bookings' :
    pathname?.startsWith('/messages') ? 'messages' :
    pathname?.startsWith('/profile') ? 'profile' :
    'home'
  );

  const navigate = (tab: string) => {
    if (onTabChange) {
      // Mode monolithe : déléguer à page.tsx
      onTabChange(tab);
      return;
    }
    // Mode multi-pages : router.push
    const routes: Record<string, string> = {
      home: '/',
      bookings: '/bookings',
      deals: '/deals',
      messages: '/messages',
      profile: '/profile',
    };
    router.push(routes[tab] ?? '/');
  };

  const isHome = activeTab === 'home';

  return (
    <div className="min-h-screen bg-awder-sable/40 flex flex-col items-center justify-start">
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="px-5 border-b border-awder-sable flex justify-between items-center bg-white sticky top-0 z-10 h-[70px]">
          {/* Logo agrandi visuellement (scale) sans épaissir la barre */}
          <div className="relative h-16 w-52 -ml-2 shrink-0">
            <Image
              src="/logo.jpeg"
              alt="Awder"
              fill
              sizes="208px"
              className="object-contain object-left mix-blend-multiply scale-[1.45] origin-left"
              priority
            />
          </div>

          {/* Toggle Voyage ⇄ Hôte — visible seulement pour les hôtes */}
          {onToggleMode && userMode && (
            <button
              onClick={onToggleMode}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-awder-sable bg-awder-offwhite text-awder-brun text-xs font-semibold active:scale-95 transition-all"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-awder-ocre" />
              {userMode === 'voyageur' ? 'Mode hôte' : 'Mode voyage'}
            </button>
          )}
        </header>

        {/* Contenu */}
        <main className="flex-1 overflow-y-auto pb-24 bg-awder-offwhite">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>

          {/* Bannière Devenir Hôte (home uniquement) */}
          {isHome && !hideBecomeHost && (
            <div className="px-6 py-8">
              <div className="bg-awder-ocre rounded-2xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-awder-gold rounded-full -mr-16 -mt-16 blur-2xl opacity-30 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative space-y-4">
                  <h3 className="text-xl font-semibold text-white leading-tight">
                    Vous avez un espace ?
                  </h3>
                  <p className="text-white/80 text-sm">
                    Devenez Hôte Awder et commencez à gagner.
                  </p>
                  <button
                    onClick={onBecomeHost ?? (() => router.push('/profile'))}
                    className="px-6 py-3 bg-white text-awder-ocre font-semibold rounded-xl text-sm shadow-[var(--shadow-warm-md)] active:scale-95 transition-all"
                  >
                    Publier mon lieu
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-awder-sable px-3 pt-2 pb-4 flex justify-between items-end z-20">
          <NavButton icon={<Search className="w-5 h-5" />} label="Explorer" active={activeTab === 'home'} onClick={() => navigate('home')} />
          <NavButton icon={<Calendar className="w-5 h-5" />} label="Réserves" active={activeTab === 'bookings'} onClick={() => navigate('bookings')} />
          <RaisedNavButton icon={<MapPinned className="w-6 h-6" />} label="Guide" active={activeTab === 'deals'} onClick={() => navigate('deals')} />
          <NavButton icon={<MessageSquare className="w-5 h-5" />} label="Messages" active={activeTab === 'messages'} onClick={() => navigate('messages')} />
          <NavButton icon={<User className="w-5 h-5" />} label="Profil" active={activeTab === 'profile'} onClick={() => navigate('profile')} />
        </nav>
      </div>
    </div>
  );
};

const NavButton = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center gap-0.5 transition-all active:scale-90 ${active ? 'text-awder-ocre' : 'text-awder-grisbrun hover:text-awder-brun'}`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-awder-ocre/10' : 'bg-transparent'}`}>
      {icon}
    </div>
    <span className="awder-label text-[8px] leading-none">{label}</span>
  </button>
);

// Onglet central surélevé (bouton ocre qui dépasse la barre)
const RaisedNavButton = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-all"
  >
    <div
      className={`w-14 h-14 -mt-8 rounded-full grid place-items-center text-white border-[5px] border-awder-offwhite transition-all ${active ? 'bg-awder-ocre' : 'bg-awder-brun'}`}
      style={{ boxShadow: '0 12px 22px -8px rgba(166,75,42,0.7)' }}
    >
      {icon}
    </div>
    <span className={`awder-label text-[8px] leading-none ${active ? 'text-awder-ocre' : 'text-awder-grisbrun'}`}>{label}</span>
  </button>
);
