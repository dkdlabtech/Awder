import { adminDb } from './firebase-admin';
import type { PlatformConfig, PriceBreakdown } from '@/types';

/**
 * Configuration par défaut — sera surchargée par /platform/config dans Firestore.
 * Stratégie commission Awder :
 *  - 5 % prélevés sur l'hôte (vs 14-16 % Airbnb)
 *  - 3 % de frais service voyageur (transparents)
 *  - 15 % sur les services tiers (chef, conciergerie)
 *  - 4 % uniquement pour les hôtes "Awder Vérifié" (incitation qualité)
 */
const DEFAULT_CONFIG: Omit<PlatformConfig, 'updatedAt' | 'updatedBy'> = {
  hostCommissionRate: 0.05,
  guestServiceFeeRate: 0.03,
  servicesCommissionRate: 0.15,
  zeroCommissionPromo: false,
  verifiedHostDiscount: 0.04,
  minBookingAmount: 5000,
  maxBookingAmount: 10_000_000,
};

let cachedConfig: PlatformConfig | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Récupère la configuration courante (cache 1 min).
 */
export async function getPlatformConfig(): Promise<PlatformConfig> {
  if (cachedConfig && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }
  try {
    const snap = await adminDb().collection('platform').doc('config').get();
    if (snap.exists) {
      cachedConfig = snap.data() as PlatformConfig;
      cachedAt = Date.now();
      return cachedConfig;
    }
  } catch (err) {
    console.error('getPlatformConfig error:', err);
  }
  // Fallback aux defaults
  return {
    ...DEFAULT_CONFIG,
    updatedAt: new Date() as any,
    updatedBy: 'system',
  };
}

/**
 * Force le rafraîchissement du cache (à appeler après mise à jour admin).
 */
export function invalidateConfigCache() {
  cachedConfig = null;
  cachedAt = 0;
}

/**
 * Détermine le taux de commission applicable à un hôte donné.
 */
export async function getHostCommissionRate(hostVerificationLevel?: string): Promise<number> {
  const config = await getPlatformConfig();
  // Promotion en cours : commission 0%
  if (config.zeroCommissionPromo) {
    const until = (config.zeroCommissionUntil as any)?.toDate?.() ?? null;
    if (!until || until > new Date()) {
      return 0;
    }
  }
  // Hôte Awder Vérifié → tarif réduit
  if (hostVerificationLevel === 'visited' || hostVerificationLevel === 'premium') {
    return config.verifiedHostDiscount;
  }
  return config.hostCommissionRate;
}

/**
 * Calcule la décomposition transparente du prix pour le voyageur.
 *  - listingPrice  = prix annonce × nuits
 *  - servicesPrice = total services tiers
 *  - cautionAmount = caution bloquée
 *  - awderServiceFee = guestServiceFeeRate × (listingPrice + servicesPrice)
 *  - total = listingPrice + servicesPrice + cautionAmount + awderServiceFee
 */
export async function computePriceBreakdown(params: {
  listingPrice: number;
  servicesPrice?: number;
  cautionAmount: number;
}): Promise<PriceBreakdown> {
  const config = await getPlatformConfig();
  const listingPrice = Math.round(params.listingPrice);
  const servicesPrice = Math.round(params.servicesPrice ?? 0);
  const cautionAmount = Math.round(params.cautionAmount);

  const awderServiceFee = Math.round(
    (listingPrice + servicesPrice) * config.guestServiceFeeRate
  );

  const subtotal = listingPrice + servicesPrice + awderServiceFee;
  const total = subtotal + cautionAmount;

  return {
    listingPrice,
    servicesPrice,
    cautionAmount,
    awderServiceFee,
    subtotal,
    total,
  };
}

/**
 * Calcule la commission Awder à prélever au moment du release_caution.
 * Cette commission est déduite du montant que touche l'hôte.
 *
 * @param totalPrice  ce que le voyageur a payé (sans la caution, donc listingPrice + servicesPrice)
 * @param servicesPrice  part services
 * @param hostVerificationLevel  niveau de vérif de l'hôte
 */
export async function computeHostPayout(params: {
  listingPrice: number;
  servicesPrice?: number;
  hostVerificationLevel?: string;
}): Promise<{
  grossAmount: number;       // ce que doit toucher l'hôte avant commission
  hostCommission: number;    // commission sur listing
  servicesCommission: number; // commission sur services
  totalCommission: number;
  netPayout: number;         // ce que touche réellement l'hôte
  appliedRate: number;
}> {
  const config = await getPlatformConfig();
  const listingPrice = Math.round(params.listingPrice);
  const servicesPrice = Math.round(params.servicesPrice ?? 0);
  const rate = await getHostCommissionRate(params.hostVerificationLevel);

  const grossAmount = listingPrice + servicesPrice;
  const hostCommission = Math.round(listingPrice * rate);
  const servicesCommission = Math.round(servicesPrice * config.servicesCommissionRate);
  const totalCommission = hostCommission + servicesCommission;
  const netPayout = grossAmount - totalCommission;

  return {
    grossAmount,
    hostCommission,
    servicesCommission,
    totalCommission,
    netPayout,
    appliedRate: rate,
  };
}

/**
 * Format XOF en français : "85 000 FCFA"
 */
export function formatXOF(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
}
