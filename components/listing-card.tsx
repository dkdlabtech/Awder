'use client';

import React from 'react';
import Image from 'next/image';
import { Star, MapPin, ShieldCheck, Zap, Droplets, Wifi } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPrice } from '@/lib/utils';

interface ListingProps {
  listing: {
    id: string;
    title: string;
    price: number;
    location: { city: string; address?: string };
    images: string[];
    isVerified?: boolean;
    rating?: number;
    pricingType: 'nightly' | 'hourly';
    badges?: string[];
    bookingMode?: 'instant' | 'request';
    infrastructure?: { hasGenerator?: boolean; hasWaterReserve?: boolean; wifiSpeedMbps?: number };
  };
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const BADGE_META: Record<string, { icon: React.ReactNode; label: string }> = {
  sans_coupure_elec: { icon: <Zap className="w-3 h-3" />, label: 'Sans coupure élec' },
  sans_coupure_eau: { icon: <Droplets className="w-3 h-3" />, label: 'Sans coupure eau' },
  wifi_pro: { icon: <Wifi className="w-3 h-3" />, label: 'Wifi Pro' },
  awder_verifie: { icon: <ShieldCheck className="w-3 h-3" />, label: 'Awder Vérifié' },
};

export const ListingCard = ({ listing, onClick, isFavorite = false, onToggleFavorite }: ListingProps) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-[var(--shadow-warm-sm)] hover:shadow-[var(--shadow-warm-md)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-awder-sable group"
    >
      <div className="relative aspect-[16/10]">
        <Image
          src={listing.images?.[0] || `https://picsum.photos/seed/${listing.id}/800/600`}
          alt={listing.title}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />

        {/* Badge Hôte Koron — or = confiance */}
        {listing.isVerified && (
          <div className="absolute top-3 left-3 bg-awder-gold text-awder-brun-deep px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">Hôte Koron</span>
          </div>
        )}

        {/* Cœur favori */}
        {onToggleFavorite && (
          <button
            type="button"
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-awder-brun/30 backdrop-blur-sm grid place-items-center text-white active:scale-90 transition-transform"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={isFavorite ? '#C2A350' : 'none'} stroke={isFavorite ? '#C2A350' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 8.6a5 5 0 0 0-8.8-3 5 5 0 0 0-8.8 3c0 4.5 8.8 9.9 8.8 9.9s8.8-5.4 8.8-9.9z" />
            </svg>
          </button>
        )}

        {/* Note Diya */}
        <div className="absolute bottom-3 left-3 bg-white/92 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 text-awder-gold fill-awder-gold" />
          <span className="text-xs font-semibold text-awder-brun">{listing.rating || 4.8}</span>
        </div>

        {/* Mode de réservation */}
        {listing.bookingMode === 'request' && (
          <div className="absolute bottom-3 right-3 bg-awder-brun/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-full">
            <span className="text-[10px] font-semibold">Sur demande</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-2.5">
        <h3 className="font-display font-semibold text-lg leading-snug text-awder-brun group-hover:text-awder-ocre transition-colors">{listing.title}</h3>
        <div className="flex items-center gap-1.5 text-awder-grisbrun">
          <MapPin className="w-3.5 h-3.5 text-awder-ocre" />
          <span className="text-[13px]">{listing.location?.address ? `${listing.location.address}, ` : ''}{listing.location?.city ?? ''}</span>
        </div>
        {listing.badges && listing.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {listing.badges.filter(b => BADGE_META[b]).slice(0, 3).map((b) => (
              <span key={b} className="inline-flex items-center gap-1 px-2.5 py-1 bg-awder-gold/12 text-awder-brun rounded-full text-[11px] font-semibold border border-awder-gold/25">
                <span className="text-awder-gold">{BADGE_META[b].icon}</span>{BADGE_META[b].label}
              </span>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center pt-2.5 border-t border-awder-sable">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-semibold text-xl text-awder-ocre tracking-tight">{formatPrice(listing.price)} F</span>
            <span className="awder-label text-awder-grisbrun">
              / {listing.pricingType === 'nightly' ? 'nuit' : 'heure'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
