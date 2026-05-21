/**
 * Constantes partagées dans toute l'app Awder.
 */

import { Utensils, Sparkles, Camera, Headphones } from 'lucide-react';

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: any;
}

/** Services tiers proposés à la réservation. */
export const ADD_ONS: AddOn[] = [
  {
    id: 'chef',
    name: 'Chef Cuisinier',
    description: 'Cuisine locale ou internationale pour votre séjour',
    price: 25000,
    icon: Utensils,
  },
  {
    id: 'cleaning',
    name: 'Ménage Quotidien',
    description: 'Personnel de nettoyage dédié',
    price: 10000,
    icon: Sparkles,
  },
  {
    id: 'concierge',
    name: 'Conciergerie',
    description: 'Assistance 24/7 (transferts, courses, événements)',
    price: 15000,
    icon: Headphones,
  },
  {
    id: 'photographer',
    name: 'Photographe',
    description: 'Séance photo pendant votre séjour',
    price: 30000,
    icon: Camera,
  },
];

/** Catégories utilisées sur la home. */
export const CATEGORIES = [
  { id: 'detente', label: 'Détente', emoji: '🌴' },
  { id: 'events', label: 'Événements', emoji: '🎉' },
  { id: 'business', label: 'Business', emoji: '💼' },
  { id: 'insolite', label: 'Insolite', emoji: '✨' },
  { id: 'family', label: 'Famille', emoji: '👨‍👩‍👧' },
];

/** Format XOF pour l'affichage. */
export function formatXOF(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
}
