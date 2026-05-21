import { Timestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// USERS — étendu avec verification physique Awder Vérifié
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'guest' | 'host' | 'admin';
export type VerificationLevel = 'none' | 'kyc' | 'visited' | 'premium';
export type IdVerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  displayName: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  // Auth methods
  email?: string;
  phoneNumber?: string;
  // KYC standard
  idCardUrl?: string;
  idVerificationStatus?: IdVerificationStatus;
  // Awder Vérifié — niveau de certification
  verificationLevel?: VerificationLevel;
  visitedBy?: string;            // uid de l'agent local
  visitedAt?: Timestamp;
  verificationPhotos?: string[]; // photos prises sur place
  // Gains hôte
  totalGains?: number;
  // Bannissement
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: Timestamp;
  bannedBy?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// WALLETS — inchangé, déjà solide
// ─────────────────────────────────────────────────────────────────────────────

export interface Wallet {
  userId: string;
  balance: number;
  escrow: number;
  currency: 'XOF';
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTINGS — étendu avec infrastructure & adressage local
// ─────────────────────────────────────────────────────────────────────────────

export type ListingType = 'accommodation' | 'event';
export type PricingType = 'nightly' | 'hourly';
export type ListingModerationStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
export type AirConditioningType = 'split' | 'central' | 'fan' | 'none';

/**
 * Différenciateur Awder #1 — Continuité de service (Sira-Yiriwa)
 * Vérifié par l'agent terrain au moment de la visite physique.
 */
export interface ListingInfrastructure {
  hasGenerator: boolean;
  generatorAutonomyHours?: number;     // ex: 8h d'autonomie
  hasSolar: boolean;
  solarPanelCount?: number;
  hasWaterReserve: boolean;
  waterCapacityLiters?: number;        // ex: 1500L
  hasWaterBooster: boolean;            // suppresseur
  wifiSpeedMbps?: number;              // mesuré par speedtest
  airConditioning: AirConditioningType;
  acRoomCount?: number;
  hasInverter: boolean;                // onduleur
}

/**
 * Différenciateur Awder #2 — Adressage hybride africain
 */
export interface ListingLocation {
  city: string;
  address: string;
  neighborhood?: string;
  // GPS (toujours présent en secours)
  gps?: { lat: number; lng: number };
  // Repères visuels locaux
  landmarks?: string[];                // ["derrière la pharmacie", "à 50m du manguier"]
  // Note vocale décrivant le chemin
  voiceNoteUrl?: string;               // URL Cloudinary
  // What3words (3m × 3m)
  what3words?: string;                 // "filing.complain.lockers"
  // Instructions pour le taxi
  taxiInstructions?: string;
}

export interface Listing {
  id?: string;
  hostId: string;
  title: string;
  description: string;
  type: ListingType;
  pricingType: PricingType;
  price: number;
  cautionAmount: number;
  capacity?: number;
  location: ListingLocation;
  images: string[];
  amenities: string[];
  // ✨ Différenciateurs Awder
  infrastructure?: ListingInfrastructure;
  badges?: ListingBadge[];             // badges décernés par Awder
  // Modération
  moderationStatus: ListingModerationStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  // État
  isActive: boolean;
  isVerified: boolean;                  // Awder Vérifié
  rating?: number;
  reviewCount?: number;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp;
}

export type ListingBadge =
  | 'awder_verifie'        // Visité par agent
  | 'sans_coupure_elec'    // Groupe électrogène ou solaire validé
  | 'sans_coupure_eau'     // Réserve d'eau validée
  | 'wifi_pro'             // Wifi > 20 Mbps mesuré
  | 'premium'              // Top qualité
  | 'super_host';          // Hôte de confiance

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS — escrow Sira-Djou conservé (100% online, fonds bloqués jusqu'au checkout)
// ─────────────────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending_payment' | 'paid_escrow' | 'completed' | 'cancelled' | 'disputed';
export type CheckInStatus = 'pending' | 'checked_in' | 'checked_out';
export type CautionStatus = 'pending' | 'blocked' | 'released' | 'claimed';
export type PaymentMethod = 'wave' | 'orange_money' | 'moov' | 'mtn' | 'paydunya';

/**
 * Décomposition transparente du prix — affichée AVANT paiement
 * Différenciateur #6 : zéro frais caché
 */
export interface PriceBreakdown {
  listingPrice: number;          // prix de l'annonce × nuits
  servicesPrice: number;         // chef, conciergerie, etc.
  cautionAmount: number;         // caution
  awderServiceFee: number;       // frais voyageur 3%
  subtotal: number;              // tout sauf commission hôte (non visible voyageur)
  total: number;                 // ce que paie le voyageur
}

export interface Booking {
  id?: string;
  listingId: string;
  listingTitle: string;
  hostId: string;
  guestId: string;
  startDate: string;
  endDate: string;
  nights: number;
  // Prix
  totalPrice: number;
  cautionAmount: number;
  priceBreakdown?: PriceBreakdown;
  // Statuts
  status: BookingStatus;
  checkInStatus: CheckInStatus;
  cautionStatus: CautionStatus;
  // Paiement (100% online via PayDunya — escrow Sira-Djou)
  paymentMethod: PaymentMethod;
  paymentToken?: string;
  paidAt?: string;
  // Services tiers
  services: string[];
  // Litige
  hasDispute?: boolean;
  disputeId?: string;
  createdAt: Timestamp | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS — étendu avec commission
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionType =
  | 'payment'
  | 'escrow_release'
  | 'commission'        // ✨ commission Awder prélevée
  | 'withdrawal'
  | 'refund'
  | 'service_fee';      // ✨ frais service voyageur

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'escrow';

export interface Transaction {
  id?: string;
  userId: string;
  bookingId?: string;
  guestId?: string;
  hostId?: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  paymentMethod?: string;
  method?: string;
  createdAt: Timestamp | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'booking_request'
  | 'check_out'
  | 'system'
  | 'payment_received'
  | 'dispute_opened'
  | 'listing_approved'
  | 'listing_rejected'
  | 'commission_charged'
  | 'payout_completed';

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: Timestamp | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS — Diya enrichi avec critères ouest-africains
// ─────────────────────────────────────────────────────────────────────────────

export interface Review {
  id?: string;
  bookingId: string;
  fromUserId: string;
  toUserId: string;
  listingId: string;
  rating: number;                    // note globale 1-5
  // ✨ Critères locaux spécifiques
  electricityReliability?: number;   // continuité électrique vraie
  waterAvailability?: number;        // continuité eau
  easyToFind?: number;               // facilité localisation
  hostResponsiveness?: number;       // réactivité WhatsApp
  cleanliness?: number;
  comment?: string;
  createdAt: Timestamp | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTES — ✨ nouveau : médiation WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'closed';
export type DisputeReason =
  | 'listing_misleading'      // photos trompeuses
  | 'electricity_outage'      // coupures électricité non annoncées
  | 'water_outage'            // coupures eau non annoncées
  | 'cleanliness'             // insalubre
  | 'host_no_show'            // hôte injoignable
  | 'guest_damage'            // dégâts voyageur
  | 'payment_issue'           // problème paiement
  | 'other';

export type DisputeResolution =
  | 'refund_guest'            // remboursement total
  | 'partial_refund'          // remboursement partiel
  | 'release_to_host'         // libération à l'hôte
  | 'claim_caution'           // saisir caution
  | 'no_action';

export interface Dispute {
  id?: string;
  bookingId: string;
  openedBy: string;            // uid (guest ou host)
  openedByRole: 'guest' | 'host';
  reason: DisputeReason;
  description: string;
  evidenceUrls?: string[];     // photos preuves
  status: DisputeStatus;
  // Médiation Awder
  assignedAdmin?: string;
  adminNotes?: string;
  resolution?: DisputeResolution;
  resolutionAmount?: number;
  resolvedAt?: Timestamp;
  whatsappThreadId?: string;   // thread WhatsApp Business
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM CONFIG — ✨ paramètres globaux Awder
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformConfig {
  // Commissions
  hostCommissionRate: number;          // 0.05 = 5%
  guestServiceFeeRate: number;         // 0.03 = 3%
  servicesCommissionRate: number;      // 0.15 = 15% sur chef/conciergerie
  // Promotion
  zeroCommissionPromo: boolean;        // 3 premiers mois gratuits
  zeroCommissionUntil?: Timestamp;
  verifiedHostDiscount: number;        // 0.04 = 4% pour Awder Vérifiés
  // Limites
  minBookingAmount: number;            // 5000 XOF mini
  maxBookingAmount: number;
  // Mis à jour
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT TERRAIN — ✨ visites physiques
// ─────────────────────────────────────────────────────────────────────────────

export interface VisitRequest {
  id?: string;
  listingId: string;
  hostId: string;
  agentId?: string;            // agent assigné
  status: 'requested' | 'scheduled' | 'completed' | 'cancelled';
  scheduledAt?: Timestamp;
  completedAt?: Timestamp;
  // Rapport
  photos?: string[];
  infrastructureReport?: ListingInfrastructure;
  agentNotes?: string;
  recommendedBadges?: ListingBadge[];
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG — traçabilité des actions admin
// ─────────────────────────────────────────────────────────────────────────────

export type AdminAction =
  | 'listing_approved'
  | 'listing_rejected'
  | 'user_verified'
  | 'user_banned'
  | 'user_unbanned'
  | 'dispute_resolved'
  | 'config_updated'
  | 'badge_granted'
  | 'badge_revoked'
  | 'manual_refund';

export interface AuditLog {
  id?: string;
  adminId: string;
  adminName?: string;
  action: AdminAction;
  targetType: 'listing' | 'user' | 'booking' | 'dispute' | 'config';
  targetId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP — server-side only
// ─────────────────────────────────────────────────────────────────────────────

export interface OtpCode {
  code: string;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
}
