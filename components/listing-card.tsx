'use client';

import React from 'react';
import Image from 'next/image';
import { Star, MapPin, ShieldCheck, CreditCard, Award } from 'lucide-react';
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
  };
  onClick: () => void;
}

export const ListingCard = ({ listing, onClick }: ListingProps) => {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-slate-100 group"
    >
      <div className="relative aspect-[16/10]">
        <Image 
          src={listing.images[0] || `https://picsum.photos/seed/${listing.id}/800/600`}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        
        {/* Hôte Koron Badge */}
        {listing.isVerified && (
          <div className="absolute top-4 right-4 bg-awder-gold text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
            <Award className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Hôte Koron</span>
          </div>
        )}

        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 text-awder-gold fill-awder-gold" />
          <span className="text-xs font-bold text-slate-800">{listing.rating || 4.8}</span>
        </div>
      </div>
      
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="font-black text-awder-brun leading-tight group-hover:text-awder-ocre transition-colors">{listing.title}</h3>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <MapPin className="w-3 h-3" />
          <span className="text-xs font-medium">{listing.location.address ? `${listing.location.address}, ` : ''}{listing.location.city}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-50">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-awder-ocre">{formatPrice(listing.price)} FCFA</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
              / {listing.pricingType === 'nightly' ? 'nuit' : 'heure'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
