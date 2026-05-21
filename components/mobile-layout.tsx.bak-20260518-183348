'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, Calendar, User, Home, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface MobileLayoutProps {
  children: React.ReactNode;
  activeTab?: 'home' | 'bookings' | 'profile' | 'messages';
  onTabChange?: (tab: any) => void;
  onBecomeHost?: () => void;
}

export const MobileLayout = ({ children, activeTab = 'home', onTabChange, onBecomeHost }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start">
      {/* Mobile Shell Simulation */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="px-6 py-2 border-b flex justify-between items-center bg-white sticky top-0 z-10 h-20 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="relative w-48 h-24 -ml-4">
              <Image 
                src="/logo.jpeg" 
                alt="Awder Logo" 
                fill 
                sizes="192px"
                className="object-contain object-left mix-blend-multiply"
                priority
              />
            </div>
          </div>
          <div className="w-10"></div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto pb-24 bg-awder-offwhite">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>

          {/* Become Host Banner */}
          {activeTab === 'home' && (
            <div className="px-6 py-8">
              <div className="bg-awder-ocre rounded-[32px] p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-awder-gold rounded-full -mr-16 -mt-16 blur-2xl opacity-30 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative space-y-4">
                  <h3 className="text-xl font-black text-white leading-tight">Vous avez un espace ?</h3>
                  <p className="text-white/80 text-sm">Devenez Hôte Awder et commencez à gagner.</p>
                  <button 
                    onClick={onBecomeHost}
                    className="px-6 py-3 bg-white text-awder-ocre font-bold rounded-full text-sm shadow-xl shadow-black/10 active:scale-95 transition-all"
                  >
                    Publier mon lieu
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-3 flex justify-between items-center z-20">
          <NavButton 
            icon={<Search className="w-6 h-6" />} 
            label="Explorer" 
            active={activeTab === 'home'} 
            onClick={() => onTabChange?.('home')}
          />
          <NavButton 
            icon={<Calendar className="w-6 h-6" />} 
            label="Réserves" 
            active={activeTab === 'bookings'} 
            onClick={() => onTabChange?.('bookings')}
          />
          <NavButton 
            icon={<Bell className="w-6 h-6" />} 
            label="Messages" 
            active={activeTab === 'messages'} 
            onClick={() => onTabChange?.('messages')}
          />
          <NavButton 
            icon={<User className="w-6 h-6" />} 
            label="Profil" 
            active={activeTab === 'profile'} 
            onClick={() => onTabChange?.('profile')}
          />
        </nav>
      </div>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${active ? 'text-awder-gold' : 'text-slate-400 hover:text-awder-ocre'}`}
  >
    <div className={`p-2 rounded-2xl transition-all ${active ? 'bg-awder-gold/10 scale-110 shadow-sm' : 'bg-transparent'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);
