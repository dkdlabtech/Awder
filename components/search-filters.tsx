'use client';

import React, { useState, useEffect } from 'react';
import { Search, Palmtree, PartyPopper, Briefcase, Sparkles, Compass } from 'lucide-react';

export interface SearchFiltersValue {
  text: string;
  category: 'all' | 'detente' | 'events' | 'business' | 'insolite' | 'experiences';
}

interface SearchFiltersProps {
  onSearch: (filters: SearchFiltersValue) => void;
}

const CATEGORIES = [
  { id: 'detente' as const, label: 'Détente', icon: <Palmtree className="w-5 h-5" /> },
  { id: 'events' as const, label: 'Événements', icon: <PartyPopper className="w-5 h-5" /> },
  { id: 'business' as const, label: 'Business', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'experiences' as const, label: 'Expériences', icon: <Compass className="w-5 h-5" /> },
  { id: 'insolite' as const, label: 'Insolite', icon: <Sparkles className="w-5 h-5" /> },
];

export const SearchFilters = ({ onSearch }: SearchFiltersProps) => {
  const [activeCat, setActiveCat] = useState<SearchFiltersValue['category']>('all');
  const [text, setText] = useState('');

  // Notify parent on every change (debounced lightly via effect)
  useEffect(() => {
    const t = setTimeout(() => onSearch({ text, category: activeCat }), 200);
    return () => clearTimeout(t);
  }, [text, activeCat, onSearch]);

  return (
    <div className="px-6 py-4 space-y-6">
      {/* Search Bar */}
      <div className="relative group">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Où voulez-vous Awder aujourd'hui ?"
          className="w-full pl-6 pr-16 py-4 bg-white rounded-full border-2 border-awder-sable focus:border-awder-gold outline-none transition-all shadow-sm text-awder-brun font-medium placeholder:text-awder-grisbrun"
        />
        <button
          type="button"
          onClick={() => onSearch({ text, category: activeCat })}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-awder-ocre rounded-full flex items-center justify-center shadow-lg shadow-awder-ocre/20 active:scale-90 transition-all"
        >
          <Search className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Categories — les 5 tiennent sur l'écran, aucune n'est coupée */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {CATEGORIES.map((cat) => {
          const isActive = activeCat === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(isActive ? 'all' : cat.id)}
              className="flex flex-col items-center gap-1.5 transition-all"
            >
              <div className={`w-full aspect-square max-w-[56px] rounded-2xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-awder-ocre text-white shadow-[0_10px_20px_-8px_rgba(166,75,42,0.5)]'
                  : 'bg-white text-awder-grisbrun border border-awder-sable'
              }`}>
                {React.cloneElement(cat.icon, { className: 'w-[18px] h-[18px]' })}
              </div>
              <span className={`text-[9px] font-semibold text-center leading-tight transition-colors ${
                isActive ? 'text-awder-ocre' : 'text-awder-grisbrun'
              }`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
