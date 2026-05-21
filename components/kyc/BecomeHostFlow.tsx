'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Home as HomeIcon,
  Sparkles,
  TrendingUp,
  Shield,
  ArrowRight,
  X,
  Loader2,
  Banknote,
} from 'lucide-react';

interface BecomeHostFlowProps {
  userId: string;
  userName?: string;
  onClose: () => void;
  onActivated: () => void;
}

/**
 * Engagement progressif :
 *  1. Pitch émotionnel (gagner de l'argent avec son bien)
 *  2. Activation IMMÉDIATE du rôle host (un clic — pas de KYC)
 *  3. L'utilisateur est redirigé vers la création d'annonce
 *  4. Le KYC sera demandé au moment de PUBLIER, pas avant
 *
 * Pas de friction. Pas de papiers. Pas de formulaire de 12 pages.
 * On capture l'envie d'agir, ON LIVRE.
 */
export default function BecomeHostFlow({
  userId,
  userName,
  onClose,
  onActivated,
}: BecomeHostFlowProps) {
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    setActivating(true);
    setError(null);
    try {
      // Activer immédiatement le rôle host — PAS de vérification ici
      await updateDoc(doc(db, 'users', userId), {
        role: 'host',
        // isVerified RESTE false — le KYC viendra plus tard
        updatedAt: new Date().toISOString(),
      });
      onActivated();
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'activation.');
      setActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-orange-500 to-amber-600 px-6 pt-12 pb-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
            <HomeIcon className="w-8 h-8" strokeWidth={2.5} />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            Louez votre bien sur Awder
          </h1>
          <p className="text-white/90 text-sm">
            {userName ? `${userName}, transformez` : 'Transformez'} votre espace en source de revenus, avec la confiance Sira-Djou.
          </p>
        </div>

        {/* Bénéfices clés */}
        <div className="p-6 space-y-4">
          <Benefit
            icon={Banknote}
            title="Gagnez en FCFA"
            description="Vos paiements arrivent via Wave, Orange Money, MTN — directement sur votre wallet Awder."
          />
          <Benefit
            icon={Shield}
            title="Paiements garantis"
            description="L'escrow Sira-Djou bloque l'argent du voyageur jusqu'à la fin du séjour. Zéro impayé."
          />
          <Benefit
            icon={TrendingUp}
            title="Commission ultra-réduite"
            description="Seulement 5% (vs 14-16% chez Airbnb). Plus de FCFA pour vous à chaque réservation."
          />
          <Benefit
            icon={Sparkles}
            title="Visible immédiatement"
            description="Créez votre annonce maintenant. La validation se fait juste avant publication."
          />
        </div>

        {/* Action principale */}
        <div className="p-6 pt-0 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={activating}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
          >
            {activating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Commencer maintenant
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-xs text-zinc-500 text-center">
            🛈 Aucun document requis maintenant. Vous publierez votre annonce après une vérification rapide d'identité (2 photos, 2 min).
          </p>
        </div>
      </div>
    </div>
  );
}

function Benefit({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="text-xs text-zinc-600 leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}
