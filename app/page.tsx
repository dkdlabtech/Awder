'use client';

import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile-layout';
import { SearchFilters, type SearchFiltersValue } from '@/components/search-filters';
import { ListingCard } from '@/components/listing-card';
import { useAuth, authErrorToFrench } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  MapPin, 
  ShieldAlert,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  Smartphone,
  Calendar,
  User,
  CreditCard,
  Settings,
  Gift,
  Home,
  MessageSquare,
  Send,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Plus,
  QrCode,
  Download,
  Upload,
  Camera,
  X,
  PlusCircle,
  BarChart3,
  Map,
  Star,
  FileText,
  Clock,
  Unlock,
  Lock,
  ChevronDown,
  Info,
  Utensils,
  Sparkles,
  Bell,
  Headphones,
  Phone,
  Mail,
  Heart,
  Globe,
  Mic,
  Zap,
  Droplets,
  Wifi,
  Search,
  MapPinned,
  ShoppingBasket,
  PartyPopper,
  Tag,
  Compass
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  setDoc,
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  onSnapshot,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { uploadListingImages, uploadUserImage } from '@/lib/upload';
import { callBookingAction } from '@/lib/booking-actions';
import { ensureConversation, listenToConversations, listenToMessages, sendChatMessage, type Conversation, type ChatMessage } from '@/lib/chat';
import { RealCalendar } from '@/components/real-calendar';
import { GuaranteeRow, TrustStrip, VoiceNotePlayer, EmptyState, type GuaranteeKind } from '@/components/ui';
import { WelcomeCard } from '@/components/host/WelcomeCard';
import BecomeHostFlow from '@/components/kyc/BecomeHostFlow';
import { AddListingOverlay } from '@/components/host/AddListingOverlay';
import { differenceInCalendarDays } from 'date-fns';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';
import { formatPrice, CURRENCIES, type CurrencyCode } from '@/lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mock Listings
const MOCK_LISTINGS = [
  {
    id: '1',
    title: 'Villa Mandingue • Bamako',
    price: 45000,
    cautionAmount: 15000,
    location: { city: 'Bamako', address: 'ACI 2000', neighborhood: 'Sébénikoro' },
    type: 'accommodation',
    pricingType: 'nightly',
    images: [
      'https://picsum.photos/seed/villa/800/600',
      'https://picsum.photos/seed/villa2/800/600',
      'https://picsum.photos/seed/villa3/800/600'
    ],
    isVerified: true,
    amenities: ['Wifi', 'Piscine', 'Sécurité 24/7', 'Groupe Électrogène'],
    description: 'Une villa authentique avec tout le confort moderne. Profitez de notre piscine et de la sécurité garantie par Awder Sira-Djou.',
    directions: 'Près de l\'ambassade d\'Algérie, 2ème portail à droite.'
  },
  {
    id: '2',
    title: 'Terrasse Ocre Horizon',
    price: 25000,
    cautionAmount: 10000,
    location: { city: 'Dakar', address: 'Ngor' },
    type: 'event',
    pricingType: 'hourly',
    images: [
      'https://picsum.photos/seed/terrace/800/600',
      'https://picsum.photos/seed/terrace2/800/600'
    ],
    isVerified: true,
    amenities: ['Vue Mer', 'Espace Sonorisé', 'Wifi'],
    description: 'Le lieu parfait pour vos événements privés avec une vue imprenable sur l\'île de Ngor.',
    directions: 'À côté de l\'hôtel Ngor Diarama, face à l\'océan.'
  },
  {
    id: '3',
    title: 'Espace Business Koron',
    price: 15000,
    cautionAmount: 5000,
    location: { city: 'Saly', address: 'Centre' },
    type: 'accommodation',
    pricingType: 'hourly',
    images: ['https://picsum.photos/seed/office/800/600'],
    isVerified: true,
    amenities: ['Fibre Optique', 'Café', 'Climatisation'],
    description: 'Travailler dans le calme avec une connexion haut débit garantie.',
    directions: 'Immeuble Sylla, 3ème étage.'
  },
  {
    id: '4',
    title: 'Atelier Poterie Traditionnelle • Kalabancoro',
    price: 12000,
    cautionAmount: 0,
    location: { city: 'Bamako', address: 'Kalabancoro' },
    type: 'experience',
    pricingType: 'hourly',
    images: [
      'https://picsum.photos/seed/pottery/800/600',
      'https://picsum.photos/seed/pottery2/800/600'
    ],
    isVerified: true,
    amenities: ['Matériel fourni', 'Thé malien offert', 'Guide local'],
    description: 'Découvrez l\'art de la poterie traditionnelle avec les femmes artisanes de Kalabancoro. Repartez avec votre propre création.',
    directions: 'Près du marché de Kalabancoro, demander l\'atelier des femmes.'
  },
  {
    id: '5',
    title: 'Sortie Pirogue sur le Fleuve Niger',
    price: 25000,
    cautionAmount: 0,
    location: { city: 'Bamako', address: 'Quai de la CDC' },
    type: 'experience',
    pricingType: 'hourly',
    images: [
      'https://picsum.photos/seed/river/800/600',
      'https://picsum.photos/seed/river2/800/600'
    ],
    isVerified: true,
    amenities: ['Gilets de sauvetage', 'Rafraîchissements', 'Photographe'],
    description: 'Une magnifique balade en pirogue traditionnelle au coucher du soleil sur le fleuve Niger, avec des récits historiques contés par nos piroguiers.',
    directions: 'Embarcadère de Sébénikoro, près du restaurant Le Niger.'
  }
];

// ✨ Questions pré-définies avant réservation — aucun texte libre (anti-contournement)
const PREDEFINED_QUESTIONS = [
  { id: 'dispo', icon: <Calendar className="w-4 h-4" />, text: 'Ce lieu est-il vraiment disponible pour mes dates ?' },
  { id: 'eau_elec', icon: <Zap className="w-4 h-4" />, text: 'Les garanties eau / électricité sont-elles actives en ce moment ?' },
  { id: 'arrivee', icon: <Clock className="w-4 h-4" />, text: 'Puis-je arriver après 22 h ?' },
  { id: 'famille', icon: <Heart className="w-4 h-4" />, text: 'Le lieu convient-il pour des enfants / un événement ?' },
];

// Réponses rapides de l'hôte (avant réservation)
const HOST_QUICK_REPLIES = [
  'Oui, c\'est disponible ✔',
  'Non, ce n\'est pas disponible pour ces dates.',
  'Oui, les garanties eau/électricité sont actives.',
  'Oui, arrivée tardive possible.',
  'Oui, adapté aux familles/événements.',
  'Réservez et nous coordonnerons les détails dans le chat.',
];

export default function HomeView() {
  const { user, signUpWithEmail, signInWithEmail, resetPassword, sendWhatsAppOtp, verifyWhatsAppOtp, logout, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'bookings' | 'profile' | 'messages' | 'deals'>('home');
  const [userMode, setUserMode] = useState<'voyageur' | 'hote'>('voyageur');
  // Mode EFFECTIF : un utilisateur non-hôte est toujours voyageur, quel que soit l'état
  // (évite qu'un nouvel utilisateur hérite du mode 'hote' d'une session précédente).
  const effectiveMode: 'voyageur' | 'hote' = profile?.role === 'host' ? userMode : 'voyageur';
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('XOF');
  const [currentImageIdx, setCurrentImageIdx] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Hourly Booking States
  const [bookingDate, setBookingDate] = useState<number | null>(null);
  const [startHour, setStartHour] = useState<number>(9);
  const [endHour, setEndHour] = useState<number>(17);

  // Extend Stay States
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDuration, setExtendDuration] = useState(1);
  const [extendingBooking, setExtendingBooking] = useState<any>(null);

  // Fetch Geolocation
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn("Geolocation permission denied or error:", err);
        }
      );
    }
  }, []);

  const getDistanceToListing = (listing: any) => {
    if (!userLocation) return null;
    const charSum = listing.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const distance = ((charSum % 135) / 10) + 1.2;
    return `${distance.toFixed(1)} km`;
  };

  // Auth Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authTab, setAuthTab] = useState<'email' | 'whatsapp'>('whatsapp');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authStep, setAuthStep] = useState<'form' | 'otp'>('form');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authError, setAuthError] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');

  // Note : on NE bascule PLUS automatiquement en mode hôte au login.
  // L'utilisateur choisit explicitement son mode via le toggle du profil.
  // (Réserver une annonce = action de voyageur, même si le profil a role='host')

  const [showAddListing, setShowAddListing] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawOperator, setWithdrawOperator] = useState<'wave' | 'orange_money' | 'moov'>('wave');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'recap' | 'list' | 'manual_ussd'>('recap');
  const [manualSenderPhone, setManualSenderPhone] = useState('');
  const [manualTxId, setManualTxId] = useState('');
  const [manualOperator, setManualOperator] = useState<'wave' | 'orange' | 'moov'>('wave');
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [filters, setFilters] = useState<SearchFiltersValue>({ text: '', category: 'all' });
  const [quickFilters, setQuickFilters] = useState<{ noCut: boolean; wifiPro: boolean; verified: boolean }>({ noCut: false, wifiPro: false, verified: false });
  const filteredListings = React.useMemo(() => {
    const q = filters.text.trim().toLowerCase();
    return listings.filter((l) => {
      // Category filter
      if (filters.category === 'detente' && l.type !== 'accommodation') return false;
      if (filters.category === 'events' && l.type !== 'event') return false;
      if (filters.category === 'business' && l.type !== 'accommodation') return false;
      if (filters.category === 'experiences' && l.type !== 'experience') return false;
      if (filters.category === 'insolite' && !l.title.toLowerCase().includes('insolite') && !l.description?.toLowerCase().includes('insolite')) return false;
      // Quick filters — différenciateurs West Africa
      const infra = l.infrastructure || {};
      if (quickFilters.noCut && !(infra.hasGenerator && infra.hasWaterReserve)) return false;
      if (quickFilters.wifiPro && !((infra.wifiSpeedMbps ?? 0) >= 20)) return false;
      if (quickFilters.verified && !l.isVerified) return false;
      // Text filter (title, city, neighborhood, address)
      if (q) {
        const hay = [
          l.title,
          l.location?.city,
          l.location?.neighborhood,
          l.location?.address,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [listings, filters, quickFilters]);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [hostBookings, setHostBookings] = useState<any[]>([]);

  // ✨ Réservations reçues par l'hôte (temps réel) — pour stats + calendrier
  useEffect(() => {
    if (!user) { setHostBookings([]); return; }
    const q = query(collection(db, 'bookings'), where('hostId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setHostBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => setHostBookings([]));
    return () => unsub();
  }, [user]);

  // Fetch Listings
  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const dbListings = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      console.log('[Awder] listings snapshot:', dbListings.length, 'docs');
      setListings(dbListings);
    }, (e) => {
      console.error('[Awder] listings query error:', e);
      handleFirestoreError(e, OperationType.LIST, 'listings');
    });
    return () => unsubscribe();
  }, []);

  // Fetch booked ranges for the currently-viewed listing
  useEffect(() => {
    if (!selectedListing?.id) { setBookedRanges([]); return; }
    const q = query(
      collection(db, 'bookings'),
      where('listingId', '==', selectedListing.id),
      where('status', 'in', ['paid_escrow', 'pending_payment', 'completed'])
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const ranges = snap.docs.map(d => {
        const b = d.data() as any;
        return {
          start: new Date(b.startDate),
          end: new Date(b.endDate),
        };
      }).filter(r => !isNaN(r.start.getTime()) && !isNaN(r.end.getTime()));
      setBookedRanges(ranges);
    }, () => setBookedRanges([]));
    return () => unsubscribe();
  }, [selectedListing?.id]);

  // Reset selected dateRange quand on change d'annonce
  useEffect(() => {
    setDateRange({ start: null, end: null });
    setBookingDate(null);
  }, [selectedListing?.id]);

  // ✨ Avis (Diya Rating) de l'annonce sélectionnée
  const [listingReviews, setListingReviews] = useState<any[]>([]);
  useEffect(() => {
    if (!selectedListing?.id) { setListingReviews([]); return; }
    const q = query(collection(db, 'reviews'), where('listingId', '==', selectedListing.id));
    const unsub = onSnapshot(q, (snap) => {
      setListingReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => setListingReviews([]));
    return () => unsub();
  }, [selectedListing?.id]);

  // Fetch Wallet
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'wallets', user.uid), (snap) => {
      if (snap.exists()) {
        setWallet(snap.data());
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `wallets/${user.uid}`));
    return () => unsubscribe();
  }, [user]);

  // ✨ Favoris — synchronisés sur users/{uid}.favorites
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  useEffect(() => {
    if (!user) { setFavoriteIds([]); return; }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setFavoriteIds((snap.data()?.favorites as string[]) || []);
    }, () => setFavoriteIds([]));
    return () => unsub();
  }, [user]);

  const toggleFavorite = async (listingId: string) => {
    if (!user) { setShowLoginModal(true); return; }
    try {
      const isFav = favoriteIds.includes(listingId);
      await updateDoc(doc(db, 'users', user.uid), {
        favorites: isFav ? arrayRemove(listingId) : arrayUnion(listingId),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // ✨ Réservation « sur demande » — l'hôte accepte avant paiement
  const sendBookingRequest = async () => {
    if (!user || !selectedListing) { setShowLoginModal(true); return; }
    setLoading(true);
    try {
      const isHourly = selectedListing.pricingType === 'hourly';
      const durationHours = isHourly ? (endHour - startHour) : 0;
      const durationNights = !isHourly
        ? (dateRange.start && dateRange.end ? differenceInCalendarDays(dateRange.end, dateRange.start) : 1)
        : 0;
      const stayPrice = selectedListing.price * (isHourly ? durationHours : durationNights);
      const servicesPrice = selectedServices.reduce((acc, s) => acc + (ADD_ONS.find(a => a.id === s)?.price || 0), 0);
      const cautionAmount = selectedListing.cautionAmount || 0;
      const totalPrice = stayPrice + servicesPrice + cautionAmount;
      const isoStart = isHourly
        ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(bookingDate).padStart(2, '0')}T${String(startHour).padStart(2, '0')}:00:00`
        : (dateRange.start as Date).toISOString();
      const isoEnd = isHourly
        ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(bookingDate).padStart(2, '0')}T${String(endHour).padStart(2, '0')}:00:00`
        : (dateRange.end as Date).toISOString();

      await addDoc(collection(db, 'bookings'), {
        listingId: selectedListing.id,
        listingTitle: selectedListing.title,
        listingImage: selectedListing.images?.[0] ?? null,
        hostId: selectedListing.hostId || 'system-seed',
        hostName: selectedListing.hostName || 'Hôte Awder',
        guestId: user.uid,
        guestName: profile?.displayName || 'Voyageur Awder',
        startDate: isoStart,
        endDate: isoEnd,
        status: 'pending_host_approval',
        checkInStatus: 'pending',
        cancellationPolicy: selectedListing.cancellationPolicy || 'moderate',
        totalPrice,
        nights: durationNights,
        hours: durationHours,
        services: selectedServices,
        cautionAmount,
        cautionStatus: 'pending',
        createdAt: new Date().toISOString(),
      });

      await addNotification(
        selectedListing.hostId || 'system-seed',
        'Nouvelle demande de réservation',
        `${profile?.displayName || 'Un voyageur'} souhaite réserver « ${selectedListing.title} ». Acceptez ou refusez depuis vos réservations.`,
        'booking_request'
      );

      setSelectedListing(null);
      setActiveTab('bookings');
      fetchBookings();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'bookings');
    } finally {
      setLoading(false);
    }
  };

  // ✨ L'hôte accepte / refuse une demande
  const respondToRequest = async (booking: any, accept: boolean) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: accept ? 'approved' : 'rejected',
        respondedAt: new Date().toISOString(),
      });
      await addNotification(
        booking.guestId,
        accept ? 'Demande acceptée !' : 'Demande refusée',
        accept
          ? `Votre demande pour « ${booking.listingTitle} » a été acceptée. Payez maintenant pour confirmer votre séjour.`
          : `Votre demande pour « ${booking.listingTitle} » n'a pas pu être acceptée. Découvrez d'autres lieux sur Awder.`,
        'system'
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `bookings/${booking.id}`);
    } finally {
      setLoading(false);
    }
  };

  // ✨ Le voyageur paie une demande acceptée
  const payApprovedBooking = async (booking: any) => {
    if (!user) return;
    setLoading(true);
    try {
      const pdResponse = await fetch('/api/paydunya/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: booking.totalPrice,
          description: `Réservation Awder : ${booking.listingTitle}`,
          bookingId: booking.id,
          guestName: profile?.displayName || 'Voyageur Awder',
          paymentMethod: 'paydunya',
        }),
      });
      const pdData = await pdResponse.json();
      if (!pdData.success) throw new Error(pdData.error || 'Erreur lors de l\'initialisation du paiement');
      if (pdData.demo) {
        await fetch('/api/paydunya/confirm-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id, demoToken: pdData.token }),
        });
        fetchBookings();
      } else {
        window.location.href = pdData.url;
      }
    } catch (e: any) {
      alert(e.message ?? 'Le paiement a échoué. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transactions
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'transactions'));
    return () => unsubscribe();
  }, [user]);

  // Seed Data if empty
  const seedListings = async () => {
    if (listings.length > 0) return;
    setLoading(true);
    try {
      for (const ml of MOCK_LISTINGS) {
        await addDoc(collection(db, 'listings'), {
          ...ml,
          hostId: 'system-seed',
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Error seeding", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentImageIdx(0);
    setDateRange({ start: null, end: null });
    setBookingDate(null);
    setStartHour(9);
    setEndHour(17);
  }, [selectedListing]);

  const [scrolled, setScrolled] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([
    { id: '1', senderId: 'host-1', text: 'Bonjour ! Votre villa est prête.', timestamp: new Date().toISOString() },
    { id: '2', senderId: 'guest-1', text: 'Super, j arrive dans 20 minutes.', timestamp: new Date().toISOString() },
  ]);
  const [newMessage, setNewMessage] = useState('');

  // Use the profile effect differently or just remove it to satisfy lint
  // We can use a separate state or just let the user toggle.
  // Given it's a demo, the user toggle is enough.

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages([...messages, { id: Date.now().toString(), senderId: 'me', text: newMessage, timestamp: new Date().toISOString() }]);
    setNewMessage('');
  };

  // Scroll handler for floating message
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Release Fund Logic
  const handleReleaseFunds = async (booking: any) => {
    if (!user) return;
    setLoading(true);
    try {
      const bRef = doc(db, 'bookings', booking.id);
      await updateDoc(bRef, {
        status: 'completed',
        cautionStatus: 'released'
      });

      // Update Guest Wallet: Deduct from Escrow (simulating completion)
      const guestWalletRef = doc(db, 'wallets', user.uid);
      await updateDoc(guestWalletRef, {
        escrow: increment(-booking.totalPrice),
        updatedAt: new Date().toISOString()
      });

      // Create Release Transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        bookingId: booking.id,
        amount: booking.totalPrice,
        type: 'escrow_release',
        status: 'completed',
        description: `Libération Sira-Djou pour ${booking.listingTitle}`,
        createdAt: new Date().toISOString(),
      });

      // ISI: Notify Host about the release
      await addNotification(
        booking.hostId,
        'Paiement Reçu !',
        `Les fonds pour "${booking.listingTitle}" ont été libérés dans votre portefeuille.`,
        'system'
      );

      fetchBookings();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `bookings/${booking.id}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'bookings'), where('guestId', '==', user.uid));
      const snap = await getDocs(q);
      setUserBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'bookings');
    }
  };

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  // ✨ Réserver pour un proche (diaspora paie pour la famille)
  const [bookingForOther, setBookingForOther] = useState(false);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  // ✨ Litige / Signaler un problème
  const [disputeBooking, setDisputeBooking] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [bookedRanges, setBookedRanges] = useState<{ start: Date; end: Date }[]>([]);
  const [showWallet, setShowWallet] = useState(false);
  const [showTerriyan, setShowTerriyan] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  const [welcomeCardBooking, setWelcomeCardBooking] = useState<any>(null);
  const [showAskQuestion, setShowAskQuestion] = useState(false);

  // ✨ Guide géolocalisé — bons plans curés (Awder + partenaires) + ambassadeurs (lecture connectés)
  const [localDeals, setLocalDeals] = useState<any[]>([]);
  const [guideAmbassadors, setGuideAmbassadors] = useState<any[]>([]);
  useEffect(() => {
    if (!user) { setLocalDeals([]); setGuideAmbassadors([]); return; }
    const unsubDeals = onSnapshot(query(collection(db, 'localDeals'), where('active', '==', true)),
      (snap) => setLocalDeals(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLocalDeals([]));
    const unsubAmb = onSnapshot(query(collection(db, 'guideAmbassadors'), where('active', '==', true)),
      (snap) => setGuideAmbassadors(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setGuideAmbassadors([]));
    return () => { unsubDeals(); unsubAmb(); };
  }, [user]);

  // ✨ Envoi d'une question pré-définie à l'hôte (ouvre la conversation en mode restreint)
  const sendPredefinedQuestion = async (text: string) => {
    if (!user || !selectedListing) return;
    setLoading(true);
    try {
      const myName = profile?.displayName ?? 'Voyageur';
      const convId = await ensureConversation(user.uid, myName, selectedListing.hostId, selectedListing.hostName || 'Hôte');
      await sendChatMessage(convId, user.uid, `❓ ${text}`);
      setShowAskQuestion(false);
      setActiveChat({
        id: convId,
        name: selectedListing.hostName || 'Hôte',
        avatar: (selectedListing.hostName || 'HO').slice(0, 2).toUpperCase(),
        otherUid: selectedListing.hostId,
      });
    } catch (e: any) {
      alert(e.message ?? 'Envoi impossible.');
    } finally {
      setLoading(false);
    }
  };

  // ✨ Chat libre uniquement s'il existe une réservation PAYÉE entre les deux parties
  const hasFreeChatWith = React.useCallback((otherUid: string | undefined) => {
    if (!otherUid) return false;
    const paid = (b: any) => ['paid_escrow', 'completed'].includes(b.status);
    return userBookings.some(b => b.hostId === otherUid && paid(b)) ||
           hostBookings.some(b => b.guestId === otherUid && paid(b));
  }, [userBookings, hostBookings]);
  const [showHostForm, setShowHostForm] = useState(false);
  const [showIdVerification, setShowIdVerification] = useState(false);
  const [showDiyaRating, setShowDiyaRating] = useState<any>(null);
  const [hostActiveTab, setHostActiveTab] = useState<'overview' | 'listings' | 'calendar' | 'settings'>('overview');

  const ADD_ONS = [
    { id: 'cook', name: 'Cuisinière Locale', price: 15000, icon: <Utensils className="w-4 h-4" /> },
    { id: 'cleaning', name: 'Service Nettoyage', price: 10000, icon: <Sparkles className="w-4 h-4" /> },
    { id: 'security', name: 'Sécurité / Gardien', price: 20000, icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Notification System
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const addNotification = async (userId: string, title: string, message: string, type: 'booking_request' | 'check_out' | 'system') => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'notifications');
    }
  };

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', user.uid),
      );
      const snap = await getDocs(q);
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'notifications');
    }
  }, [user]);

  React.useEffect(() => {
    const init = async () => {
      if (user) {
        await fetchNotifications();
      }
    };
    init();
  }, [user, fetchNotifications]);

  const markNotificationRead = async (id: string) => {
    try {
      const nRef = doc(db, 'notifications', id);
      await updateDoc(nRef, { read: true });
      fetchNotifications();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `notifications/${id}`);
    }
  };

  // Real-time Notifications Listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'notifications'));
    return () => unsubscribe();
  }, [user]);

  const resetAuthModal = () => {
    setAuthTab('whatsapp');
    setAuthMode('signin');
    setAuthStep('form');
    setAuthEmail('');
    setAuthPassword('');
    setAuthDisplayName('');
    setAuthPhone('');
    setAuthOtp('');
    setAuthError('');
    setDevCodeHint('');
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    setAuthError('');
    try {
      if (authMode === 'signup') {
        if (!authDisplayName.trim()) {
          setAuthError('Votre prénom est requis.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(authEmail, authPassword, authDisplayName.trim());
      } else {
        await signInWithEmail(authEmail, authPassword);
      }
      setShowLoginModal(false);
      resetAuthModal();
    } catch (e: any) {
      setAuthError(authErrorToFrench(e.code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppOtp = async () => {
    setLoading(true);
    setAuthError('');
    setDevCodeHint('');
    try {
      const { devCode } = await sendWhatsAppOtp(authPhone);
      setAuthStep('otp');
      if (devCode) {
        // Dev mode: prefill the code and show a hint
        setAuthOtp(devCode);
        setDevCodeHint(`Mode dev : code = ${devCode}`);
      }
    } catch (e: any) {
      setAuthError(e.message ?? 'Erreur d\'envoi du code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWhatsAppOtp = async () => {
    setLoading(true);
    setAuthError('');
    try {
      await verifyWhatsAppOtp(authPhone, authOtp);
      setShowLoginModal(false);
      resetAuthModal();
    } catch (e: any) {
      setAuthError(e.message ?? 'Code invalide.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (method: 'wave' | 'orange_money' | 'moov' | 'paydunya' | 'manual_transfer', manualRef?: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    // Garantit que l'utilisateur reste en mode voyageur après une réservation
    // (réserver = action de voyageur, même si profile.role === 'host')
    setUserMode('voyageur');
    setLoading(true);
    
    let step = 'bookings';
    try {
      const isHourly = selectedListing.pricingType === 'hourly';
      const durationHours = isHourly ? (endHour - startHour) : 0;
      const durationNights = !isHourly
        ? (dateRange.start && dateRange.end ? differenceInCalendarDays(dateRange.end, dateRange.start) : 1)
        : 0;

      if (!isHourly && (!dateRange.start || !dateRange.end || durationNights <= 0)) {
        alert('Sélectionnez d\'abord vos dates d\'arrivée et de départ.');
        setLoading(false);
        return;
      }
      if (isHourly && !bookingDate) {
        alert('Sélectionnez d\'abord la date de votre réservation.');
        setLoading(false);
        return;
      }

      const stayPrice = selectedListing.price * (isHourly ? durationHours : durationNights);
      const servicesPrice = selectedServices.reduce((acc, s) => acc + (ADD_ONS.find(a => a.id === s)?.price || 0), 0);
      const cautionAmount = selectedListing.cautionAmount || 0;
      // Le voyageur paie le prix affiché par l'hôte, sans frais visibles.
      // La commission Awder est prélevée côté hôte sur le versement (non affichée au client).
      const AWDER_COMMISSION_RATE = 0.05;
      const awderCommission = Math.round((stayPrice + servicesPrice) * AWDER_COMMISSION_RATE);
      const totalPrice = stayPrice + servicesPrice + cautionAmount;
      const priceBreakdown = {
        listingPrice: stayPrice,
        servicesPrice,
        cautionAmount,
        awderCommission, // interne : déduit du versement hôte
        subtotal: stayPrice + servicesPrice,
        total: totalPrice,
      };
      const hostId = selectedListing.hostId || 'system-seed';
      const hostName = selectedListing.hostName || selectedListing.hostDisplayName || 'Hôte Awder';

      const isoStart = isHourly
        ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(bookingDate).padStart(2, '0')}T${String(startHour).padStart(2, '0')}:00:00`
        : (dateRange.start as Date).toISOString();
      const isoEnd = isHourly
        ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(bookingDate).padStart(2, '0')}T${String(endHour).padStart(2, '0')}:00:00`
        : (dateRange.end as Date).toISOString();

      const bookingData = {
        listingId: selectedListing.id,
        listingTitle: selectedListing.title,
        listingImage: selectedListing.images?.[0] ?? null,
        hostId,
        hostName,
        guestId: user.uid,
        startDate: isoStart,
        endDate: isoEnd,
        status: 'pending_payment',
        checkInStatus: 'pending',
        cancellationPolicy: selectedListing.cancellationPolicy || 'moderate',
        totalPrice,
        priceBreakdown,
        servicesPrice,
        nights: durationNights,
        hours: durationHours,
        services: selectedServices,
        // ✨ Bénéficiaire (si réservation pour un proche)
        ...(bookingForOther && beneficiaryName.trim()
          ? { beneficiaryName: beneficiaryName.trim(), beneficiaryPhone: beneficiaryPhone.trim() || null }
          : {}),
        cautionAmount,
        cautionStatus: 'pending',
        paymentMethod: method,
        createdAt: new Date().toISOString(),
        ...(manualRef ? { manualTransferRef: manualRef } : {}),
      };

      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);

      if (method === 'manual_transfer') {
        // Create manual transaction log
        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          bookingId: bookingRef.id,
          guestId: user.uid,
          hostId,
          amount: totalPrice,
          type: 'payment',
          status: 'pending',
          method: 'manual',
          description: `Transfert manuel en attente : ${selectedListing.title}`,
          createdAt: new Date().toISOString(),
        });

        // Notify Host
        await addNotification(
          hostId,
          'Demande de validation de paiement',
          `Le voyageur a soumis une référence de transfert manuel (${manualRef}) pour "${selectedListing.title}".`,
          'booking_request'
        );

        setShowPayment(false);
        setSelectedListing(null);
        setActiveTab('bookings');
        fetchBookings();
        setLoading(false);
        return;
      }

      // Call checkout API (PayDunya or demo mock)
      step = 'paydunya_api';
      const pdResponse = await fetch('/api/paydunya/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPrice,
          description: `Réservation Awder : ${selectedListing.title}`,
          bookingId: bookingRef.id,
          guestName: user.displayName || profile?.displayName || 'Voyageur Awder',
          paymentMethod: method,
        }),
      });

      const pdData = await pdResponse.json();
      if (!pdData.success) {
        throw new Error(pdData.error || 'Erreur lors de l\'initialisation du paiement');
      }

      if (pdData.demo) {
        // Demo mode: simulate immediate success by calling our own confirm endpoint
        await fetch('/api/paydunya/confirm-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: bookingRef.id, demoToken: pdData.token }),
        });
        setShowPayment(false);
        setSelectedListing(null);
        setActiveTab('bookings');
        fetchBookings();
      } else {
        // Real PayDunya redirect
        window.location.href = pdData.url;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, step);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab, user]);

  // Host Enrollment Submit

  return (
    <MobileLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onBecomeHost={() => setShowHostForm(true)}
      userMode={profile?.role === 'host' ? userMode : undefined}
      onToggleMode={profile?.role === 'host' ? () => { setUserMode(m => m === 'voyageur' ? 'hote' : 'voyageur'); setActiveTab('home'); } : undefined}
    >
      {activeTab === 'home' && effectiveMode === 'voyageur' && !selectedListing && (
        <div className="space-y-6">
          <div className="px-6 pt-6 flex justify-between items-end">
            <div className="space-y-2">
              <h2 className="font-display font-semibold text-awder-brun leading-[1.04] tracking-tight text-[40px]">
                Où voulez-vous <span className="text-awder-ocre italic">Awder</span> aujourd&apos;hui ?
              </h2>
              <p className="text-sm text-awder-grisbrun leading-relaxed max-w-[34ch]">
                Votre chez-vous, partout chez nous.
              </p>
            </div>
          </div>
          
          <SearchFilters onSearch={setFilters} />

          {/* ✨ Filtres rapides West Africa */}
          <div className="px-6 -mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setShowOnlyFavorites(v => !v)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${showOnlyFavorites ? 'bg-awder-ocre border-awder-ocre text-white' : 'bg-white border-awder-sable text-awder-grisbrun'}`}
            >
              <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-white' : ''}`} /> Favoris
            </button>
            {[
              { key: 'noCut' as const, icon: <Zap className="w-3.5 h-3.5" />, label: 'Sans coupure' },
              { key: 'wifiPro' as const, icon: <Wifi className="w-3.5 h-3.5" />, label: 'Wifi Pro' },
              { key: 'verified' as const, icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'Awder Vérifié' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setQuickFilters((p) => ({ ...p, [f.key]: !p[f.key] }))}
                className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${quickFilters[f.key] ? 'bg-awder-gold border-awder-gold text-awder-brun-deep' : 'bg-white border-awder-sable text-awder-grisbrun'}`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {(() => {
            const baseList = showOnlyFavorites ? filteredListings.filter(l => favoriteIds.includes(l.id)) : filteredListings;
            const shown = baseList.slice(0, visibleCount);
            const remaining = baseList.length - shown.length;
            return (
              <div className="px-6 pb-6 space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-semibold text-awder-brun text-lg">{showOnlyFavorites ? 'Mes favoris' : 'À la une'}</h3>
                  {baseList.length > 0 && (
                    <span className="text-xs font-semibold text-awder-grisbrun">{baseList.length} lieu{baseList.length > 1 ? 'x' : ''}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-8">
                  {baseList.length > 0 ? shown.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing as any}
                      onClick={() => setSelectedListing(listing)}
                      isFavorite={favoriteIds.includes(listing.id)}
                      onToggleFavorite={() => toggleFavorite(listing.id)}
                    />
                  )) : showOnlyFavorites ? (
                    <EmptyState
                      icon={<Heart className="w-8 h-8" />}
                      title="Aucun favori pour l'instant"
                      sub="Touchez le cœur sur une annonce pour la retrouver ici."
                    />
                  ) : listings.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <div className="w-20 h-20 bg-awder-sable/40 rounded-full flex items-center justify-center mx-auto text-awder-grisbrun/60">
                        <Home className="w-8 h-8" />
                      </div>
                      <p className="text-awder-grisbrun font-bold">Aucune annonce pour le moment</p>
                      <p className="text-awder-grisbrun/60 text-[10px] font-bold uppercase tracking-widest">
                        Les hôtes n&apos;ont pas encore publié d&apos;espace
                      </p>
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <p className="text-awder-grisbrun font-bold">Aucun résultat pour cette recherche</p>
                    </div>
                  )}
                </div>

                {/* Pagination : charger plus / tout voir */}
                {remaining > 0 && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                      onClick={() => setVisibleCount(c => c + 6)}
                      className="px-6 py-3 bg-white border border-awder-sable rounded-xl font-semibold text-sm text-awder-brun active:scale-[0.98] transition-all"
                    >
                      Voir plus ({remaining} restant{remaining > 1 ? 's' : ''})
                    </button>
                    <button
                      onClick={() => setVisibleCount(baseList.length)}
                      className="text-xs font-semibold text-awder-ocre underline decoration-awder-ocre/30 underline-offset-4"
                    >
                      Tout afficher
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Floating Welcome Message */}
          <AnimatePresence>
            {scrolled && user && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none"
              >
                <div className="bg-awder-brun text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 backdrop-blur-md border border-white/10 pointer-events-auto">
                  <div className="w-10 h-10 bg-awder-gold rounded-full flex items-center justify-center font-semibold text-awder-brun text-sm shadow-inner">
                    {profile?.displayName?.[0] || 'A'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">I dansɛ, {profile?.displayName?.split(' ')[0] || 'Voyageur'} !</span>
                    <span className="text-[10px] text-white/60 font-medium tracking-tight">Prêt pour une nouvelle aventure ?</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {selectedListing && (
        <AnimatePresence>
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-awder-offwhite overflow-y-auto pb-32"
          >
            {/* Header Image Slider */}
            <div className="relative h-96 w-full bg-awder-brun-deep">
              <Image 
                src={selectedListing.images?.[currentImageIdx] || selectedListing.images?.[0] || `https://picsum.photos/seed/${selectedListing.id}/800/600`}
                alt={selectedListing.title} 
                fill 
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover transition-all duration-500"
                referrerPolicy="no-referrer"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-awder-brun/80 via-transparent to-transparent"></div>
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedListing(null)}
                className="absolute top-6 left-6 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all z-30 border border-white/20 active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Slider Arrows */}
              {selectedListing.images && selectedListing.images.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentImageIdx((prev) => (prev === 0 ? selectedListing.images.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white z-30 hover:bg-black/50 active:scale-90"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setCurrentImageIdx((prev) => (prev === selectedListing.images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white z-30 hover:bg-black/50 active:scale-90"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              {selectedListing.images && selectedListing.images.length > 1 && (
                <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-1.5 z-30">
                  {selectedListing.images.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === currentImageIdx ? 'bg-awder-gold w-4' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable Content Container */}
            <div className="-mt-16 bg-awder-offwhite rounded-t-3xl relative z-20 px-6 py-10 space-y-10 shadow-2xl shadow-black/20">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-4 py-1.5 bg-awder-gold/10 text-awder-gold text-[10px] font-semibold rounded-full uppercase tracking-[0.2em] border border-awder-gold/20">
                    {selectedListing.type === 'accommodation' ? 'Détente' : selectedListing.type === 'experience' ? 'Expérience' : 'Événement'}
                  </span>
                  {selectedListing.isVerified && (
                    <div className="flex items-center gap-1.5 text-awder-ocre font-semibold text-[10px] uppercase tracking-widest">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Hôte Koron</span>
                    </div>
                  )}
                </div>
                <h1 className="text-3xl font-semibold text-awder-brun leading-[1.1] tracking-tighter">{selectedListing.title}</h1>
                {/* Position APPROXIMATIVE avant paiement : quartier + ville seulement */}
                <div className="flex items-center gap-2 text-awder-grisbrun">
                  <MapPin className="w-4 h-4 text-awder-ocre" />
                  <span className="text-sm font-bold tracking-tight">
                    {selectedListing.location?.neighborhood ? `${selectedListing.location.neighborhood}, ` : ''}{selectedListing.location?.city ?? ''}
                  </span>
                </div>

                {/* Distance Geolocation display */}
                {getDistanceToListing(selectedListing) && (
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-awder-gold uppercase tracking-widest mt-1">
                    <Map className="w-3.5 h-3.5 text-awder-gold" />
                    <span>À {getDistanceToListing(selectedListing)} de votre position</span>
                  </div>
                )}

                {/* L'adresse exacte est révélée après paiement (protection de l'hôte) */}
                <div className="flex items-start gap-3 bg-awder-sable/40 p-4 rounded-2xl border border-awder-sable mt-2">
                  <Lock className="w-4 h-4 text-awder-gold shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed text-awder-brun/80">
                    L&apos;adresse exacte, l&apos;itinéraire, la note vocale et les instructions taxi vous seront
                    révélés dès votre paiement sécurisé Sira-Djou.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-white rounded-2xl border border-awder-sable shadow-sm space-y-1">
                  <p className="text-[10px] text-awder-grisbrun font-semibold uppercase tracking-[0.2em] leading-none">
                    Tarif / {selectedListing.pricingType === 'hourly' ? 'Heure' : 'Nuit'}
                  </p>
                  <p className="text-2xl font-semibold text-awder-brun">{formatPrice(selectedListing.price, selectedCurrency)}</p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-awder-sable shadow-sm space-y-1">
                  <p className="text-[10px] text-awder-grisbrun font-semibold uppercase tracking-[0.2em] leading-none">Caution</p>
                  <p className="text-2xl font-semibold text-awder-ocre">+{formatPrice(selectedListing.cautionAmount || 0, selectedCurrency)}</p>
                </div>
              </div>

              {/* ✨ Capacité d'accueil */}
              {(selectedListing.capacity || selectedListing.bedrooms) && (
                <div className="flex items-center gap-4 -mt-4 text-[13px] text-awder-grisbrun font-medium">
                  {selectedListing.capacity ? (
                    <span className="inline-flex items-center gap-1.5"><User className="w-4 h-4 text-awder-ocre" /> {selectedListing.capacity} voyageur{selectedListing.capacity > 1 ? 's' : ''}</span>
                  ) : null}
                  {selectedListing.bedrooms ? (
                    <span className="inline-flex items-center gap-1.5"><Home className="w-4 h-4 text-awder-ocre" /> {selectedListing.bedrooms} chambre{selectedListing.bedrooms > 1 ? 's' : ''}</span>
                  ) : null}
                </div>
              )}

              {/* ✨ Mode de réservation */}
              <div className="flex items-center gap-2 -mt-4">
                {selectedListing.bookingMode === 'request' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-awder-brun/5 border border-awder-brun/10 rounded-full text-xs font-semibold text-awder-brun">
                    <Send className="w-3 h-3" /> Sur demande — l&apos;hôte confirme avant paiement
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-awder-bogolan/10 border border-awder-bogolan/25 rounded-full text-xs font-semibold text-awder-bogolan">
                    <Zap className="w-3 h-3" /> Réservation instantanée
                  </span>
                )}
              </div>

              {/* ✨ Votre hôte — mini-profil public */}
              {selectedListing.hostId && selectedListing.hostId !== 'system-seed' && (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-awder-brun text-xl tracking-tight">Votre hôte</h3>
                    <p className="awder-label text-awder-gold mt-0.5">Terriyan · parrainage de confiance</p>
                  </div>
                  <div className="flex items-center gap-3.5 p-4 bg-white border border-awder-sable rounded-2xl">
                    <div className="w-12 h-12 shrink-0 rounded-full bg-awder-brun text-awder-gold-soft grid place-items-center font-display font-semibold text-lg">
                      {(selectedListing.hostName || 'H')[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-awder-brun flex items-center gap-2">
                        {selectedListing.hostName || 'Hôte Awder'}
                        {selectedListing.isVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-awder-gold text-awder-brun-deep rounded-full text-[10px] font-semibold">
                            <ShieldCheck className="w-3 h-3" /> Koron
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-awder-grisbrun mt-0.5">Répond généralement en moins de 24 h</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ✨ Questions pré-définies UNIQUEMENT avant réservation (anti-contournement) */}
              {selectedListing.hostId && selectedListing.hostId !== user?.uid && (
                <button
                  onClick={() => {
                    if (!user) { setShowLoginModal(true); return; }
                    setShowAskQuestion(true);
                  }}
                  className="w-full py-3.5 bg-white border-[1.5px] border-awder-brun/25 text-awder-brun rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 active:scale-[0.98] hover:border-awder-brun transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  Poser une question à l&apos;hôte
                </button>
              )}

              {/* Feuille de questions pré-définies */}
              <AnimatePresence>
                {showAskQuestion && user && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[140] bg-awder-brun-deep/70 backdrop-blur-sm flex items-end justify-center"
                    onClick={() => setShowAskQuestion(false)}
                  >
                    <motion.div
                      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                      className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 space-y-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-12 h-1 bg-awder-sable rounded-full mx-auto" />
                      <div className="text-center space-y-1">
                        <h3 className="font-display text-xl font-semibold text-awder-brun">Une question ?</h3>
                        <p className="text-xs text-awder-grisbrun">Choisissez — l&apos;hôte répond en un clic. Le chat libre s&apos;ouvre après votre réservation.</p>
                      </div>
                      <div className="space-y-2">
                        {PREDEFINED_QUESTIONS.map((q) => (
                          <button
                            key={q.id}
                            disabled={loading}
                            onClick={() => sendPredefinedQuestion(q.text)}
                            className="w-full flex items-center gap-3 p-4 bg-awder-offwhite border border-awder-sable rounded-xl text-left active:scale-[0.98] transition-all"
                          >
                            <span className="w-9 h-9 shrink-0 rounded-lg bg-awder-ocre/10 text-awder-ocre grid place-items-center">{q.icon}</span>
                            <span className="text-sm font-semibold text-awder-brun">{q.text}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ✨ Garanties Awder (Sira-Yiriwa) — différenciateurs West Africa */}
              {(() => {
                const infra = selectedListing.infrastructure || {};
                const guarantees: { kind: GuaranteeKind; label: string; sub: string }[] = [];
                if (infra.hasGenerator) guarantees.push({ kind: 'power', label: 'Sans coupure d\'électricité', sub: 'Groupe électrogène / solaire' });
                if (infra.hasWaterReserve) guarantees.push({ kind: 'water', label: 'Sans coupure d\'eau', sub: 'Réserve d\'eau garantie' });
                if (infra.wifiSpeedMbps >= 20) guarantees.push({ kind: 'wifi', label: `Wifi Pro · ${infra.wifiSpeedMbps} Mbps`, sub: 'Idéal voyage d\'affaires' });
                if (guarantees.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-awder-brun text-xl tracking-tight">Garanties Awder</h3>
                      <p className="awder-label text-awder-gold mt-0.5">Sira-Yiriwa · le confort assuré</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {guarantees.map((g) => (
                        <GuaranteeRow key={g.label} kind={g.kind} title={g.label} sub={g.sub} />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Indications d'accès, note vocale et taxi : révélés APRÈS paiement (voir Mes Réserves) */}

              <div className="space-y-4">
                <h3 className="font-semibold text-awder-brun text-xl tracking-tight">Description</h3>
                <p className="text-awder-grisbrun leading-relaxed text-sm font-medium">
                  {selectedListing.description}
                </p>
              </div>

              {selectedListing.amenities && selectedListing.amenities.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-awder-brun text-xl tracking-tight">Équipements</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedListing.amenities.map((a: string) => (
                      <span key={a} className="px-4 py-2 bg-white border border-awder-sable rounded-full text-xs font-semibold text-awder-brun">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ✨ Affichage spécifique SALLE D'ÉVÉNEMENTS */}
              {selectedListing.type === 'event' && (
                <>
                  {(selectedListing.eventEquipment?.length > 0 || selectedListing.eventEquipmentExtra) && (
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-awder-brun text-xl tracking-tight">Matériel inclus</h3>
                        <p className="awder-label text-awder-gold mt-0.5">Tout est fourni</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(selectedListing.eventEquipment || []).map((eq: string) => (
                          <div key={eq} className="flex items-center gap-2 p-3 bg-white border border-awder-sable rounded-xl">
                            <CheckCircle2 className="w-4 h-4 text-awder-bogolan shrink-0" />
                            <span className="text-[13px] font-medium text-awder-brun">{eq}</span>
                          </div>
                        ))}
                      </div>
                      {selectedListing.eventEquipmentExtra && (
                        <p className="text-[13px] text-awder-grisbrun italic">+ {selectedListing.eventEquipmentExtra}</p>
                      )}
                    </div>
                  )}

                  {selectedListing.eventRules && (
                    <div className="p-5 bg-awder-ocre/[0.06] border border-awder-ocre/15 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-awder-ocre" />
                        <h4 className="font-semibold text-awder-brun text-base">Consignes &amp; règlement</h4>
                      </div>
                      <p className="text-[13px] text-awder-brun/85 leading-relaxed whitespace-pre-line">{selectedListing.eventRules}</p>
                    </div>
                  )}
                </>
              )}

              {/* ✨ Avis Diya — différenciateur confiance */}
              {(() => {
                if (listingReviews.length === 0) return null;
                const avg = listingReviews.reduce((a, r) => a + (r.rating || 0), 0) / listingReviews.length;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-awder-brun text-xl tracking-tight">Avis Diya</h3>
                      <div className="flex items-center gap-1.5 bg-awder-gold/10 px-3 py-1.5 rounded-full">
                        <Star className="w-4 h-4 text-awder-gold fill-awder-gold" />
                        <span className="font-semibold text-awder-brun text-sm">{avg.toFixed(1)}</span>
                        <span className="text-[10px] font-bold text-awder-grisbrun">({listingReviews.length})</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {listingReviews.slice(0, 5).map((r) => (
                        <div key={r.id} className="p-5 bg-white border border-awder-sable rounded-2xl space-y-2">
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i <= (r.rating || 0) ? 'text-awder-gold fill-awder-gold' : 'text-awder-sable'}`} />
                            ))}
                            {r.createdAt && (
                              <span className="text-[9px] font-bold text-awder-grisbrun/60 uppercase tracking-widest ml-2">
                                {format(new Date(r.createdAt), 'dd MMM yyyy')}
                              </span>
                            )}
                          </div>
                          {r.comment && <p className="text-sm text-awder-brun/80 font-medium leading-relaxed">{r.comment}</p>}
                          {(r.cleanliness || r.communication) && (
                            <div className="flex gap-4 text-[10px] font-bold text-awder-grisbrun uppercase tracking-widest">
                              {r.cleanliness ? <span>Propreté {r.cleanliness}/5</span> : null}
                              {r.communication ? <span>Communication {r.communication}/5</span> : null}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Dynamic Availability Selection (Daily or Hourly) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-semibold text-awder-brun text-lg tracking-tight">Disponibilité</h3>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-awder-ocre uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    <span>Réservez maintenant</span>
                  </div>
                </div>

                {selectedListing.pricingType === 'hourly' ? (
                  /* Hourly date & slot picker */
                  <div className="p-8 bg-white border border-awder-sable rounded-2xl shadow-sm space-y-6">
                    <p className="text-[10px] font-semibold text-awder-grisbrun uppercase tracking-widest text-center">Étape 1 : Choisissez le Jour de Réservation</p>
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                        <span key={`listing-day-${d}-${i}`} className="text-[8px] font-semibold text-awder-grisbrun/60 uppercase">{d}</span>
                      ))}
                      {Array.from({ length: 31 }).map((_, i) => {
                        const day = i + 1;
                        const isSelected = bookingDate === day;
                        return (
                          <button 
                            key={i} 
                            onClick={() => setBookingDate(day)}
                            className={`aspect-square flex items-center justify-center rounded-xl text-[10px] font-semibold transition-all ${
                              isSelected ? 'bg-awder-ocre text-white shadow-lg scale-110' : 'bg-awder-sable/40 text-awder-grisbrun hover:bg-awder-sable'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    {bookingDate && (
                      <div className="pt-6 border-t border-awder-sable space-y-4 animate-in fade-in duration-300">
                        <p className="text-[10px] font-semibold text-awder-grisbrun uppercase tracking-widest text-center">Étape 2 : Définissez les Heures</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-awder-grisbrun uppercase tracking-widest pl-1">Heure d'arrivée</label>
                            <select 
                              value={startHour} 
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setStartHour(val);
                                if (endHour <= val) setEndHour(val + 1);
                              }}
                              className="w-full p-4 bg-awder-sable/40 border border-awder-sable rounded-2xl font-semibold text-xs text-awder-brun outline-none focus:border-awder-gold"
                            >
                              {Array.from({ length: 15 }).map((_, idx) => {
                                const h = idx + 8; // 8h to 22h
                                return <option key={`start-${h}`} value={h}>{String(h).padStart(2, '0')}:00</option>;
                              })}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-awder-grisbrun uppercase tracking-widest pl-1">Heure de départ</label>
                            <select 
                              value={endHour} 
                              onChange={(e) => setEndHour(Number(e.target.value))}
                              className="w-full p-4 bg-awder-sable/40 border border-awder-sable rounded-2xl font-semibold text-xs text-awder-brun outline-none focus:border-awder-gold"
                            >
                              {Array.from({ length: 15 }).map((_, idx) => {
                                const h = idx + 9; // 9h to 23h
                                if (h <= startHour) return null;
                                return <option key={`end-${h}`} value={h}>{String(h).padStart(2, '0')}:00</option>;
                              })}
                            </select>
                          </div>
                        </div>
                        <div className="text-center text-[10px] font-semibold text-awder-ocre uppercase tracking-widest bg-awder-ocre/5 p-4 rounded-2xl border border-awder-ocre/10">
                          Total durée : {endHour - startHour} heure(s) le {bookingDate} Mai 2026
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard daily calendar — real-date version */
                  <div className="p-4 bg-white border border-awder-sable rounded-2xl shadow-sm">
                    <RealCalendar
                      value={dateRange}
                      onChange={setDateRange}
                      bookedRanges={[
                        ...bookedRanges,
                        ...((selectedListing.blockedDates ?? []) as string[]).map((iso) => {
                          const d = new Date(iso + 'T00:00:00');
                          return { start: d, end: d };
                        }),
                      ]}
                    />
                  </div>
                )}
              </div>

              {/* Services à la carte */}
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-semibold text-awder-brun text-xl tracking-tight">Services à la carte</h3>
                  <span className="text-[10px] font-semibold text-awder-gold bg-awder-gold/10 px-3 py-1 rounded-full uppercase tracking-widest">Extra</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {ADD_ONS.map(service => (
                    <button 
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`p-6 rounded-2xl border flex items-center justify-between transition-all active:scale-[0.98] ${selectedServices.includes(service.id) ? 'border-awder-ocre bg-awder-ocre/5 shadow-lg shadow-awder-ocre/10' : 'border-awder-sable bg-white'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${selectedServices.includes(service.id) ? 'bg-awder-ocre text-white' : 'bg-awder-sable/40 text-awder-grisbrun'}`}>
                          {service.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-awder-brun text-sm">{service.name}</p>
                          <p className="text-[10px] text-awder-grisbrun font-bold uppercase tracking-widest">Géré par Awder</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-sm ${selectedServices.includes(service.id) ? 'text-awder-ocre' : 'text-awder-brun'}`}>+{formatPrice(service.price, selectedCurrency)}</p>
                        {selectedServices.includes(service.id) && <CheckCircle2 className="w-4 h-4 text-awder-ocre ml-auto mt-1" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ✨ Réserver pour un proche (diaspora) */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setBookingForOther((v) => !v)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${bookingForOther ? 'border-awder-ocre bg-awder-ocre/5' : 'border-awder-sable bg-white'}`}
                >
                  <div className="text-left flex items-center gap-3">
                    <Gift className="w-5 h-5 text-awder-ocre" />
                    <div>
                      <p className="font-semibold text-sm text-awder-brun">Je réserve pour un proche</p>
                      <p className="text-[10px] text-awder-grisbrun font-bold">La réservation sera à son nom</p>
                    </div>
                  </div>
                  <div className={`w-12 h-7 rounded-full p-1 transition-all ${bookingForOther ? 'bg-awder-ocre' : 'bg-awder-sable'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-all ${bookingForOther ? 'translate-x-5' : ''}`} />
                  </div>
                </button>
                {bookingForOther && (
                  <div className="space-y-3">
                    <input
                      placeholder="Nom du bénéficiaire"
                      value={beneficiaryName}
                      onChange={(e) => setBeneficiaryName(e.target.value)}
                      className="w-full p-4 bg-white border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun text-sm"
                    />
                    <input
                      placeholder="Téléphone du bénéficiaire (+223...)"
                      value={beneficiaryPhone}
                      onChange={(e) => setBeneficiaryPhone(e.target.value)}
                      className="w-full p-4 bg-white border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Sira-Djou Security Banner */}
              <div className="p-6 bg-awder-ocre/[0.06] rounded-2xl border border-awder-ocre/15 space-y-5">
                <div className="flex gap-4">
                  <div className="p-3 bg-awder-ocre rounded-xl text-white h-fit">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-semibold text-awder-brun">Sira-Djou <span className="awder-label text-awder-ocre ml-1">Sécurité Awder</span></h4>
                    <p className="text-[13px] text-awder-grisbrun leading-relaxed">
                      Une caution de <strong className="text-awder-ocre font-semibold">{formatPrice(selectedListing.cautionAmount || 0, selectedCurrency)}</strong> sera retenue temporairement sous séquestre, puis libérée sur votre portefeuille 24 h après le check-out.
                    </p>
                  </div>
                </div>
                {selectedListing.cancellationPolicy && (
                  <div className="flex items-center gap-2 pt-2 border-t border-awder-ocre/10">
                    <Info className="w-3.5 h-3.5 text-awder-ocre shrink-0" />
                    <p className="text-[11px] text-awder-grisbrun font-bold">
                      Annulation <strong className="text-awder-brun uppercase">{
                        { flexible: 'Flexible', moderate: 'Modérée', strict: 'Stricte' }[selectedListing.cancellationPolicy as string] ?? 'Modérée'
                      }</strong> — {
                        { flexible: 'remboursement intégral jusqu\'à 24h avant.', moderate: 'remboursement 50% si annulation < 48h.', strict: 'aucun remboursement < 7 jours.' }[selectedListing.cancellationPolicy as string] ?? ''
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Payout & Book Trigger Area */}
              <div className="p-8 border-t bg-white rounded-2xl shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
                 {(() => {
                   const isHourly = selectedListing.pricingType === 'hourly';
                   const hours = isHourly ? (endHour - startHour) : 0;
                   const nights = !isHourly && dateRange.start && dateRange.end ? differenceInCalendarDays(dateRange.end, dateRange.start) : 0;
                   
                   const stayPrice = selectedListing.price * (isHourly ? hours : (nights || 1));
                   const servicesPrice = selectedServices.reduce((acc, s) => acc + (ADD_ONS.find(a => a.id === s)?.price || 0), 0);
                   const cautionAmount = selectedListing.cautionAmount || 0;
                   const totalPrice = stayPrice + servicesPrice + cautionAmount;

                   // Conflit calculé via les vraies plages réservées (bookedRanges)
                   const hasConflict = !isHourly && dateRange.start && dateRange.end &&
                     bookedRanges.some(r => dateRange.start! <= r.end && dateRange.end! >= r.start);
                   
                   const alreadyBooked = userBookings.some(b => 
                     b.listingId === selectedListing.id && 
                     b.status !== 'cancelled' &&
                     b.checkInStatus !== 'checked_out'
                   );

                   const isDurationSelected = isHourly ? (bookingDate !== null) : (nights > 0);

                   return (
                     <>
                       {/* Décomposition simple et rassurante — le prix de l'hôte, la caution remboursable */}
                       {isDurationSelected && (
                         <div className="mb-6 p-5 bg-awder-sable/40 rounded-2xl space-y-2 border border-awder-sable">
                           <div className="flex justify-between text-[13px] text-awder-grisbrun">
                             <span>{isHourly ? `${hours} h` : `${nights} nuit${nights > 1 ? 's' : ''}`} × {formatPrice(selectedListing.price, selectedCurrency)}</span>
                             <span className="text-awder-brun font-semibold">{formatPrice(stayPrice, selectedCurrency)}</span>
                           </div>
                           {servicesPrice > 0 && (
                             <div className="flex justify-between text-[13px] text-awder-grisbrun">
                               <span>Services à la carte</span>
                               <span className="text-awder-brun font-semibold">{formatPrice(servicesPrice, selectedCurrency)}</span>
                             </div>
                           )}
                           <div className="flex justify-between text-[13px] text-awder-grisbrun">
                             <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-awder-gold" /> Caution (remboursable)</span>
                             <span className="text-awder-ocre font-semibold">{formatPrice(cautionAmount, selectedCurrency)}</span>
                           </div>
                           <div className="flex justify-between items-center pt-2.5 border-t border-awder-sable">
                             <span className="font-semibold text-awder-brun text-sm">Total à payer</span>
                             <span className="font-display text-2xl font-semibold text-awder-ocre">{formatPrice(totalPrice, selectedCurrency)}</span>
                           </div>
                         </div>
                       )}
                       <div className="mb-4">
                         <TrustStrip text={hasConflict ? <>Ces dates sont déjà réservées — choisissez-en d&apos;autres.</> : undefined} />
                       </div>
                       <button
                         onClick={() => {
                           if (!user) { setShowLoginModal(true); return; }
                           if (selectedListing.bookingMode === 'request') {
                             sendBookingRequest();
                             return;
                           }
                           setPaymentMode('recap');
                           setManualSenderPhone('');
                           setManualTxId('');
                           setShowPayment(true);
                         }}
                         disabled={loading || alreadyBooked || hasConflict || !isDurationSelected}
                         className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-base ${alreadyBooked || hasConflict || !isDurationSelected ? 'bg-awder-sable text-awder-grisbrun cursor-not-allowed' : 'bg-awder-ocre text-white shadow-[0_10px_22px_-8px_rgba(166,75,42,0.55)] hover:bg-awder-ocre-deep'}`}
                       >
                         {!isDurationSelected ? (
                           <>
                             <Calendar className="w-5 h-5" />
                             Choisir vos dates
                           </>
                         ) : hasConflict ? (
                           <>
                             <ShieldAlert className="w-5 h-5" />
                             Dates indisponibles
                           </>
                         ) : alreadyBooked ? (
                           <>
                             <Clock className="w-5 h-5" />
                             Séjour en cours
                           </>
                         ) : selectedListing.bookingMode === 'request' ? (
                           <>
                             <Send className="w-5 h-5" />
                             Demander à réserver
                           </>
                         ) : (
                           <>
                             <CreditCard className="w-5 h-5" />
                             Réserver — {formatPrice(totalPrice, selectedCurrency)}
                           </>
                         )}
                       </button>
                     </>
                   );
                 })()}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Payment Overlay */}
      {showPayment && (
        <div className="fixed inset-0 z-[100] bg-awder-brun/90 backdrop-blur-xl flex items-end justify-center px-4">
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full max-w-md bg-white rounded-t-3xl p-12 space-y-10"
          >
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="relative">
                  <div className="w-24 h-24 border-8 border-awder-sable border-t-awder-ocre rounded-full animate-spin"></div>
                  <Smartphone className="absolute inset-0 m-auto w-8 h-8 text-awder-ocre animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-awder-brun leading-tight">Validation en cours</h3>
                  <p className="text-sm font-bold text-awder-grisbrun uppercase tracking-widest animate-pulse">Sira-Djou vérifie votre transaction local...</p>
                </div>
              </div>
            ) : paymentMode === 'manual_ussd' ? (
              <>
                <div className="space-y-3 text-center">
                  <div className="w-16 h-1 bg-awder-sable rounded-full mx-auto mb-6"></div>
                  <h3 className="text-3xl font-semibold text-awder-brun tracking-tighter">Paiement Manuel USSD</h3>
                  <p className="text-sm text-awder-grisbrun font-bold leading-relaxed px-4">
                    Suivez les étapes ci-dessous pour effectuer votre transfert.
                  </p>
                </div>

                {(() => {
                  if (!selectedListing) return null;
                  const isHourly = selectedListing.pricingType === 'hourly';
                  const hours = isHourly ? (endHour - startHour) : 0;
                  const nights = !isHourly && dateRange.start && dateRange.end ? differenceInCalendarDays(dateRange.end, dateRange.start) : 1;
                  const servicesPrice = selectedServices.reduce((acc, s) => acc + (ADD_ONS.find(a => a.id === s)?.price || 0), 0);
                  const cautionAmount = selectedListing.cautionAmount || 0;
                  const totalPrice = (selectedListing.price * (isHourly ? hours : nights)) + servicesPrice + cautionAmount;

                  return (
                    <div className="space-y-6">
                      {/* Operator selector */}
                      <div className="flex bg-awder-sable/40 p-1.5 rounded-2xl border border-awder-sable">
                        {(['wave', 'orange', 'moov'] as const).map((op) => (
                          <button
                            key={op}
                            type="button"
                            onClick={() => setManualOperator(op)}
                            className={`flex-1 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${
                              manualOperator === op ? 'bg-white text-awder-ocre shadow-sm' : 'text-awder-grisbrun'
                            }`}
                          >
                            {op === 'wave' ? 'Wave' : op === 'orange' ? 'Orange' : 'Moov'}
                          </button>
                        ))}
                      </div>

                      {/* Instructions */}
                      <div className="p-6 bg-awder-sable/40 rounded-2xl border border-awder-sable text-xs text-awder-brun/80 font-semibold space-y-2 leading-relaxed">
                        {manualOperator === 'wave' && (
                          <p>
                            1. Ouvrez l'application Wave ou composez votre USSD Wave.<br />
                            2. Transférez le montant exact de <strong className="text-awder-brun">{formatPrice(totalPrice, selectedCurrency)}</strong> au numéro marchand <strong className="text-awder-brun">+223 80 00 00 00</strong>.<br />
                            3. Entrez les détails ci-dessous.
                          </p>
                        )}
                        {manualOperator === 'orange' && (
                          <p>
                            1. Composez le <strong className="text-awder-brun">*144#</strong> pour Orange Money.<br />
                            2. Transférez le montant exact de <strong className="text-awder-brun">{formatPrice(totalPrice, selectedCurrency)}</strong> au numéro marchand <strong className="text-awder-brun">+223 70 00 00 00</strong>.<br />
                            3. Entrez les détails ci-dessous.
                          </p>
                        )}
                        {manualOperator === 'moov' && (
                          <p>
                            1. Composez le <strong className="text-awder-brun">*155#</strong> pour Moov Money.<br />
                            2. Transférez le montant exact de <strong className="text-awder-brun">{formatPrice(totalPrice, selectedCurrency)}</strong> au numéro marchand <strong className="text-awder-brun">+223 60 00 00 00</strong>.<br />
                            3. Entrez les détails ci-dessous.
                          </p>
                        )}
                      </div>

                      {/* Inputs */}
                      <div className="space-y-3">
                        <input 
                          placeholder="Téléphone Expéditeur (ex: +22370000000)" 
                          value={manualSenderPhone}
                          onChange={(e) => setManualSenderPhone(e.target.value)}
                          className="w-full p-5 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun text-xs"
                        />
                        <input 
                          placeholder="ID / Référence de Transaction (ex: TX12345)" 
                          value={manualTxId}
                          onChange={(e) => setManualTxId(e.target.value)}
                          className="w-full p-5 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun text-xs"
                        />
                      </div>

                      <button 
                        onClick={() => {
                          if (!manualSenderPhone || !manualTxId) {
                            alert("Veuillez remplir tous les champs.");
                            return;
                          }
                          handleBooking('manual_transfer', `Op: ${manualOperator.toUpperCase()} | Ref: ${manualTxId} (Tél: ${manualSenderPhone})`);
                        }}
                        className="w-full py-6 bg-awder-brun text-white rounded-full font-semibold text-lg shadow-xl shadow-awder-brun/20"
                      >
                        Confirmer mon transfert
                      </button>

                      <button 
                        type="button"
                        onClick={() => setPaymentMode('list')}
                        className="w-full py-2 text-awder-grisbrun font-semibold uppercase text-[10px] tracking-[0.3em] hover:text-awder-brun transition-colors text-center block"
                      >
                        Retour aux options
                      </button>
                    </div>
                  );
                })()}
              </>
            ) : paymentMode === 'recap' ? (
              (() => {
                if (!selectedListing) return null;
                const isHourly = selectedListing.pricingType === 'hourly';
                const hours = isHourly ? (endHour - startHour) : 0;
                const nights = !isHourly && dateRange.start && dateRange.end ? differenceInCalendarDays(dateRange.end, dateRange.start) : 1;
                const stayPrice = selectedListing.price * (isHourly ? hours : nights);
                const servicesPrice = selectedServices.reduce((acc, s) => acc + (ADD_ONS.find(a => a.id === s)?.price || 0), 0);
                const cautionAmount = selectedListing.cautionAmount || 0;
                const totalPrice = stayPrice + servicesPrice + cautionAmount;
                const pol = (selectedListing.cancellationPolicy as string) || 'moderate';
                const polLabel = { flexible: 'Flexible — remboursement intégral jusqu\'à 24 h avant', moderate: 'Modérée — remboursement 50 % si annulation < 48 h', strict: 'Stricte — aucun remboursement < 7 jours' }[pol] ?? '';
                return (
                  <>
                    <div className="space-y-2 text-center">
                      <div className="w-16 h-1 bg-awder-sable rounded-full mx-auto mb-4"></div>
                      <h3 className="font-display text-2xl font-semibold text-awder-brun">Récapitulatif</h3>
                      <p className="text-sm text-awder-grisbrun px-4">Vérifiez tout avant de payer.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-awder-offwhite border border-awder-sable rounded-2xl space-y-2.5">
                        <p className="font-semibold text-awder-brun text-sm">{selectedListing.title}</p>
                        <div className="flex items-center gap-2 text-[13px] text-awder-grisbrun">
                          <Calendar className="w-3.5 h-3.5 text-awder-ocre" />
                          {isHourly
                            ? <span>Le {bookingDate} · {String(startHour).padStart(2, '0')}:00 → {String(endHour).padStart(2, '0')}:00 ({hours} h)</span>
                            : <span>{dateRange.start ? format(dateRange.start, 'dd MMM', { locale: fr }) : ''} → {dateRange.end ? format(dateRange.end, 'dd MMM yyyy', { locale: fr }) : ''} · {nights} nuit{nights > 1 ? 's' : ''}</span>}
                        </div>
                        {bookingForOther && beneficiaryName.trim() && (
                          <div className="flex items-center gap-2 text-[13px] text-awder-grisbrun">
                            <Gift className="w-3.5 h-3.5 text-awder-ocre" />
                            <span>Pour : {beneficiaryName.trim()}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-awder-offwhite border border-awder-sable rounded-2xl space-y-2">
                        <div className="flex justify-between text-[13px] text-awder-grisbrun">
                          <span>{isHourly ? `${hours} h` : `${nights} nuit${nights > 1 ? 's' : ''}`} × {formatPrice(selectedListing.price, selectedCurrency)}</span>
                          <span className="text-awder-brun font-semibold">{formatPrice(stayPrice, selectedCurrency)}</span>
                        </div>
                        {selectedServices.map((sid) => {
                          const svc = ADD_ONS.find(a => a.id === sid);
                          if (!svc) return null;
                          return (
                            <div key={sid} className="flex justify-between text-[13px] text-awder-grisbrun">
                              <span>{svc.name}</span>
                              <span className="text-awder-brun font-semibold">{formatPrice(svc.price, selectedCurrency)}</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-[13px] text-awder-grisbrun">
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-awder-gold" /> Caution Sira-Djou (remboursable)</span>
                          <span className="text-awder-ocre font-semibold">{formatPrice(cautionAmount, selectedCurrency)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2.5 border-t border-awder-sable">
                          <span className="font-semibold text-awder-brun text-sm">Total à payer</span>
                          <span className="font-display text-2xl font-semibold text-awder-ocre">{formatPrice(totalPrice, selectedCurrency)}</span>
                        </div>
                      </div>

                      {polLabel && (
                        <p className="text-xs text-awder-grisbrun flex items-start gap-2 px-1">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-awder-ocre" />
                          Annulation {polLabel}.
                        </p>
                      )}

                      <TrustStrip />

                      <button
                        onClick={() => setPaymentMode('list')}
                        className="w-full py-4 bg-awder-ocre text-white rounded-xl font-semibold text-base shadow-[0_10px_22px_-8px_rgba(166,75,42,0.55)] active:scale-[0.98] transition-all"
                      >
                        Continuer vers le paiement
                      </button>
                      <button
                        onClick={() => setShowPayment(false)}
                        className="w-full py-2 text-awder-grisbrun font-semibold text-xs hover:text-awder-brun transition-colors"
                      >
                        Modifier ma réservation
                      </button>
                    </div>
                  </>
                );
              })()
            ) : (
              <>
                <div className="space-y-3 text-center">
                  <div className="w-16 h-1 bg-awder-sable rounded-full mx-auto mb-6"></div>
                  <h3 className="text-3xl font-semibold text-awder-brun tracking-tighter">Paiement Sécurisé</h3>
                  <p className="text-sm text-awder-grisbrun font-bold leading-relaxed px-4">Sélectionnez votre moyen de paiement local.</p>
                </div>

                <div className="space-y-4">
                  <PaymentButton 
                    method="wave" 
                    label="Wave Mobile Money" 
                    color="bg-[#40BCFF]" 
                    icon={<Smartphone className="w-6 h-6" />}
                    loading={loading}
                    onClick={() => handleBooking('wave')}
                  />
                  <PaymentButton 
                    method="orange_money" 
                    label="Orange Money" 
                    color="bg-[#FF6600]" 
                    icon={<Wallet className="w-6 h-6" />}
                    loading={loading}
                    onClick={() => handleBooking('orange_money')}
                  />
                  <PaymentButton 
                    method="moov" 
                    label="Moov Money" 
                    color="bg-[#004B93]" 
                    icon={<CreditCard className="w-6 h-6" />}
                    loading={loading}
                    onClick={() => handleBooking('moov')}
                  />
                  <PaymentButton 
                    method="manual_transfer" 
                    label="Transfert Manuel / USSD" 
                    color="bg-awder-gold" 
                    icon={<QrCode className="w-6 h-6 text-awder-brun" />}
                    loading={loading}
                    onClick={() => setPaymentMode('manual_ussd')}
                  />
                </div>

                <button 
                  onClick={() => setShowPayment(false)}
                  className="w-full py-2 text-awder-grisbrun font-semibold uppercase text-[10px] tracking-[0.3em] hover:text-awder-brun transition-colors"
                  disabled={loading}
                >
                  Annuler la transaction
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}

      {activeTab === 'home' && effectiveMode === 'hote' && (
        <HostDashboard
          profile={profile}
          wallet={wallet}
          transactions={transactions}
          myListings={listings.filter((l) => l.hostId === user?.uid)}
          hostBookings={hostBookings}
          notifications={notifications}
          onShowNotifications={() => setShowNotifications(true)}
          onShowSupport={() => setShowSupport(true)}
          onWithdraw={() => setShowWithdraw(true)}
          onEditListing={(l: any) => { setEditingListing(l); setShowAddListing(true); }}
          onAddListing={() => {
            // KYC demandé à la PUBLICATION (dans AddListingOverlay), pas avant de créer.
            setEditingListing(null);
            setShowAddListing(true);
          }}
          onViewBooking={(b: any) => setActiveTab('bookings')}
          onSwitchMode={() => setUserMode('voyageur')}
          activeSubTab={hostActiveTab}
          onSubTabChange={setHostActiveTab}
        />
      )}

      {showIdVerification && (
        <IdentityOverlay 
          onClose={() => setShowIdVerification(false)}
          onSuccess={async () => {
            if (profile) {
              const uRef = doc(db, 'users', user?.uid || '');
              await updateDoc(uRef, { idVerificationStatus: 'verified' });
            }
            setShowIdVerification(false);
            setShowAddListing(true);
          }}
        />
      )}

      {showDiyaRating && (
        <DiyaRatingOverlay 
          booking={showDiyaRating}
          onClose={() => setShowDiyaRating(null)}
          onSuccess={() => {
            setShowDiyaRating(null);
            fetchBookings();
          }}
        />
      )}

      {showNotifications && (
        <NotificationOverlay
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkRead={markNotificationRead}
        />
      )}

      {/* ✨ Carte de bienvenue générée (déco hôte) */}
      {welcomeCardBooking && (
        <WelcomeCard
          guestName={welcomeCardBooking.beneficiaryName || welcomeCardBooking.guestName || 'Cher voyageur'}
          hostName={profile?.displayName || 'Votre hôte'}
          onClose={() => setWelcomeCardBooking(null)}
        />
      )}
      
      {showWallet && <WalletOverlay wallet={wallet} transactions={transactions} onClose={() => setShowWallet(false)} />}
      {showTerriyan && <TerriyanOverlay onClose={() => setShowTerriyan(false)} />}
      {showPersonalInfo && <PersonalInfoOverlay profile={profile} onClose={() => setShowPersonalInfo(false)} />}
      {showSupport && <SupportOverlay onClose={() => setShowSupport(false)} />}

      {showAddListing && (
        <AddListingOverlay
          initialData={editingListing}
          onClose={() => { setShowAddListing(false); setEditingListing(null); }}
          onSuccess={() => {
            setShowAddListing(false);
            setEditingListing(null);
          }}
        />
      )}

      {/* ✨ Modal de retrait des fonds (payout Mobile Money) */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[160] bg-awder-brun/90 backdrop-blur-xl flex items-end justify-center px-4">
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="w-full max-w-md bg-white rounded-t-3xl p-10 space-y-6">
            <div className="w-16 h-1 bg-awder-sable rounded-full mx-auto" />
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-semibold text-awder-brun tracking-tighter">Retirer mes gains</h3>
              <p className="text-xs text-awder-grisbrun font-bold">Solde disponible : <strong className="text-awder-brun">{formatPrice(wallet?.balance || 0)} F</strong></p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([['wave','Wave'],['orange_money','Orange'],['moov','Moov']] as const).map(([op, label]) => (
                <button key={op} onClick={() => setWithdrawOperator(op)}
                  className={`py-3 rounded-2xl font-semibold text-[11px] uppercase tracking-widest border-2 transition-all ${withdrawOperator === op ? 'border-awder-ocre bg-awder-ocre/5 text-awder-ocre' : 'border-awder-sable text-awder-grisbrun'}`}>
                  {label}
                </button>
              ))}
            </div>
            <input type="number" placeholder="Montant à retirer (FCFA)" value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full p-4 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun text-sm" />
            <input placeholder="Numéro Mobile Money (+223...)" value={withdrawPhone}
              onChange={(e) => setWithdrawPhone(e.target.value)}
              className="w-full p-4 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun text-sm" />
            <div className="flex gap-3">
              <button onClick={() => setShowWithdraw(false)} className="flex-1 py-4 bg-awder-sable/40 text-awder-grisbrun rounded-full font-semibold text-xs uppercase tracking-widest">Annuler</button>
              <button
                onClick={async () => {
                  const amt = Number(withdrawAmount);
                  if (!amt || amt <= 0) { alert('Montant invalide.'); return; }
                  if (amt > (wallet?.balance || 0)) { alert('Montant supérieur au solde disponible.'); return; }
                  if (!withdrawPhone.trim()) { alert('Entrez votre numéro Mobile Money.'); return; }
                  setLoading(true);
                  try {
                    const idToken = await auth.currentUser!.getIdToken();
                    const res = await fetch('/api/wallet/withdraw', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                      body: JSON.stringify({ amount: amt, phone: withdrawPhone.trim(), operator: withdrawOperator }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Échec du retrait.');
                    setShowWithdraw(false);
                    setWithdrawAmount(''); setWithdrawPhone('');
                    alert('Demande de retrait enregistrée ! Vous recevrez les fonds sous 24h.');
                  } catch (e: any) {
                    alert(e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="flex-1 py-4 bg-awder-ocre text-white rounded-full font-semibold text-xs uppercase tracking-widest shadow-xl shadow-awder-ocre/20 disabled:opacity-60"
              >
                {loading ? '...' : 'Confirmer le retrait'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ✨ Bons plans géolocalisés — connecté + a réservé */}
      {activeTab === 'deals' && (() => {
        const stayCities = Array.from(new Set(
          userBookings
            .filter((b: any) => ['paid_escrow', 'completed'].includes(b.status))
            .map((b: any) => listings.find(l => l.id === b.listingId)?.location?.city)
            .filter(Boolean)
        )) as string[];
        const hasBooked = stayCities.length > 0;
        const cityMatch = (c?: string) => stayCities.some(sc => (c || '').toLowerCase() === sc.toLowerCase());
        const matched = localDeals
          .filter((d: any) => cityMatch(d.city))
          .sort((a: any, b: any) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0));
        const ambassadors = guideAmbassadors.filter((a: any) => cityMatch(a.city));

        // Icône selon le type de bon plan
        const dealIcon = (type: string) => {
          const t = (type || '').toLowerCase();
          if (t.includes('marché') || t.includes('marche')) return <ShoppingBasket className="w-5 h-5" />;
          if (t.includes('distraction') || t.includes('loisir') || t.includes('sortie') || t.includes('nightlife') || t.includes('attraction')) return <PartyPopper className="w-5 h-5" />;
          if (t.includes('réduction') || t.includes('reduction')) return <Tag className="w-5 h-5" />;
          if (t.includes('expérience') || t.includes('experience')) return <Compass className="w-5 h-5" />;
          return <Utensils className="w-5 h-5" />;
        };

        return (
          <div className="px-6 py-10 space-y-6 pb-32">
            <div className="space-y-1">
              <p className="awder-label text-awder-gold">Autour de votre séjour</p>
              <h2 className="font-display text-3xl font-semibold text-awder-brun tracking-tight">Guide</h2>
              <p className="text-sm text-awder-grisbrun">Bonnes adresses, distractions, réductions et guides locaux — sélectionnés par Awder.</p>
            </div>

            {!user ? (
              <EmptyState
                icon={<MapPinned className="w-8 h-8" />}
                title="Connectez-vous pour votre guide"
                sub="Les bonnes adresses autour de votre séjour s'affichent une fois connecté."
                action={<button onClick={() => setShowLoginModal(true)} className="px-6 py-3 bg-awder-ocre text-white rounded-xl font-semibold text-sm">Se connecter</button>}
              />
            ) : !hasBooked ? (
              <EmptyState
                icon={<Lock className="w-8 h-8" />}
                title="Réservez pour débloquer"
                sub="Dès votre première réservation payée, découvrez les meilleures adresses et des guides locaux autour du lieu — pensé pour la diaspora et les visiteurs."
                action={<button onClick={() => setActiveTab('home')} className="px-6 py-3 bg-awder-ocre text-white rounded-xl font-semibold text-sm">Explorer les lieux</button>}
              />
            ) : (matched.length === 0 && ambassadors.length === 0) ? (
              <EmptyState
                icon={<MapPin className="w-8 h-8" />}
                title={`Bientôt à ${stayCities[0]}`}
                sub="Nous ajoutons des bons plans et des guides dans votre ville. Revenez très vite !"
              />
            ) : (
              <div className="space-y-8">
                {/* Ambassadeurs Guide — personnes physiques */}
                {ambassadors.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-awder-brun text-lg">Ambassadeurs guides</h3>
                      <p className="awder-label text-awder-gold mt-0.5">Des locaux pour vous accompagner</p>
                    </div>
                    {ambassadors.map((a: any) => (
                      <div key={a.id} className="p-4 bg-white border border-awder-sable rounded-2xl flex items-center gap-3.5">
                        <div className="w-12 h-12 shrink-0 rounded-full bg-awder-brun text-awder-gold-soft grid place-items-center font-display font-semibold text-lg">
                          {(a.name || 'G')[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-awder-brun flex items-center gap-2">
                            {a.name}
                            {a.verified && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-awder-gold text-awder-brun-deep rounded-full text-[10px] font-semibold"><ShieldCheck className="w-3 h-3" /> Koron</span>}
                          </p>
                          <p className="text-xs text-awder-grisbrun mt-0.5">{[a.specialty, a.neighborhood].filter(Boolean).join(' · ')}</p>
                          {a.bio && <p className="text-[13px] text-awder-brun/80 mt-1 leading-relaxed">{a.bio}</p>}
                        </div>
                        {a.whatsapp && (
                          <a
                            href={`https://wa.me/${(a.whatsapp || '').replace(/[^0-9]/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="shrink-0 px-3.5 py-2 bg-awder-ocre text-white rounded-lg text-xs font-semibold"
                          >
                            Contacter
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Bons plans */}
                {matched.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-awder-brun text-lg">Bonnes adresses</h3>
                      <p className="awder-label text-awder-gold mt-0.5">Restos, distractions &amp; réductions</p>
                    </div>
                    {matched.map((d: any) => (
                      <div key={d.id} className="p-4 bg-white border border-awder-sable rounded-2xl flex items-start gap-3.5">
                        <span className="w-11 h-11 shrink-0 rounded-xl bg-awder-ocre/10 text-awder-ocre grid place-items-center">
                          {dealIcon(d.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-awder-brun">{d.title}</p>
                            {d.sponsored && <span className="px-2 py-0.5 bg-awder-gold text-awder-brun-deep rounded-full text-[10px] font-semibold">Partenaire</span>}
                          </div>
                          <p className="text-xs text-awder-grisbrun mt-0.5">
                            {[d.type, d.neighborhood, d.distance].filter(Boolean).join(' · ')}
                          </p>
                          {d.description && <p className="text-[13px] text-awder-brun/80 mt-1.5 leading-relaxed">{d.description}</p>}
                          {d.discount && (
                            <span className="inline-block mt-2 px-2.5 py-1 bg-awder-bogolan/12 text-awder-bogolan rounded-full text-xs font-semibold">
                              {d.discount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-awder-grisbrun text-center">Awder ne cesse d&apos;ajouter de nouveaux partenaires et guides près de vous.</p>
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'messages' && (
        <MessagesView
          myUid={user?.uid ?? null}
          onSelectChat={(chat: any) => setActiveChat(chat)}
        />
      )}

      {activeChat && user && (
        <ChatOverlay
          chat={activeChat}
          myUid={user.uid}
          onClose={() => setActiveChat(null)}
          canFreeText={hasFreeChatWith(activeChat.otherUid)}
          isHost={effectiveMode === 'hote'}
        />
      )}

      {/* ✨ Réservations REÇUES par l'hôte (mode hôte) */}
      {activeTab === 'bookings' && effectiveMode === 'hote' && (
        <div className="px-6 py-10 space-y-8 pb-32">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold text-awder-brun tracking-tighter leading-none">Réservations reçues</h2>
            <p className="text-xs text-awder-grisbrun font-semibold uppercase tracking-[0.3em] italic">Vos voyageurs sur Awder</p>
          </div>

          <div className="p-4 bg-awder-gold/5 border border-awder-gold/20 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-awder-gold shrink-0 mt-0.5" />
            <p className="text-[11px] text-awder-grisbrun font-bold leading-relaxed">
              <strong className="text-awder-brun">Réservation instantanée :</strong> pas besoin de confirmer. Dès le paiement, les fonds sont sécurisés (Sira-Djou). Vous libérez la caution 24h après le départ.
            </p>
          </div>

          <div className="space-y-6">
            {hostBookings.length > 0 ? [...hostBookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-8 bg-white rounded-2xl border border-awder-sable shadow-2xl shadow-[var(--shadow-warm-sm)] space-y-6"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-awder-brun text-xl leading-tight tracking-tight">{booking.listingTitle}</h4>
                    <div className="flex items-center gap-2 text-xs text-awder-grisbrun font-bold">
                      <User className="w-3 h-3 text-awder-ocre" />
                      <span>Voyageur : <strong className="text-awder-brun">{booking.beneficiaryName || 'Client Awder'}</strong></span>
                    </div>
                    {(booking.startDate || booking.endDate) && (
                      <div className="flex items-center gap-2 text-xs text-awder-grisbrun font-bold">
                        <Calendar className="w-3 h-3 text-awder-ocre" />
                        <span>
                          {booking.startDate ? format(new Date(booking.startDate), 'dd MMM') : ''}
                          {booking.endDate ? ` → ${format(new Date(booking.endDate), 'dd MMM yyyy')}` : ''}
                          {booking.nights ? ` · ${booking.nights} nuit${booking.nights > 1 ? 's' : ''}` : ''}
                          {booking.hours ? ` · ${booking.hours}h` : ''}
                        </span>
                      </div>
                    )}
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest ${
                      booking.status === 'paid_escrow' ? 'bg-awder-gold/10 text-awder-gold' :
                      booking.status === 'completed' ? 'bg-awder-bogolan/10 text-awder-bogolan' :
                      booking.status === 'disputed' ? 'bg-red-50 text-red-600' :
                      booking.status === 'pending_host_approval' ? 'bg-awder-ocre/10 text-awder-ocre' :
                      booking.status === 'approved' ? 'bg-awder-bogolan/10 text-awder-bogolan' :
                      booking.status === 'rejected' ? 'bg-red-50 text-red-600' :
                      booking.status === 'pending_payment' ? 'bg-awder-sable text-awder-grisbrun' : 'bg-awder-sable/40'
                    }`}>
                      {booking.status === 'paid_escrow' ? 'Payé · En cours' :
                       booking.status === 'completed' ? 'Terminé' :
                       booking.status === 'disputed' ? 'En litige' :
                       booking.status === 'pending_host_approval' ? 'Demande à traiter' :
                       booking.status === 'approved' ? 'Acceptée · Attente paiement' :
                       booking.status === 'rejected' ? 'Refusée' :
                       booking.status === 'pending_payment' ? 'Paiement en attente' : booking.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-awder-brun">{formatPrice(booking.totalPrice)} F</p>
                    <p className="text-[9px] font-semibold text-awder-grisbrun/60 uppercase tracking-widest mt-1">
                      {booking.checkInStatus === 'checked_in' ? 'Voyageur présent' : booking.checkInStatus === 'checked_out' ? 'Voyageur parti' : 'Arrivée attendue'}
                    </p>
                  </div>
                </div>

                {/* ✨ Demande sur demande : accepter / refuser */}
                {booking.status === 'pending_host_approval' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => respondToRequest(booking, false)}
                      disabled={loading}
                      className="flex-1 py-3.5 bg-white border border-red-200 text-red-500 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all"
                    >
                      Refuser
                    </button>
                    <button
                      onClick={() => respondToRequest(booking, true)}
                      disabled={loading}
                      className="flex-1 py-3.5 bg-awder-ocre text-white rounded-xl font-semibold text-sm shadow-[0_10px_22px_-8px_rgba(166,75,42,0.45)] active:scale-[0.98] transition-all"
                    >
                      Accepter la demande
                    </button>
                  </div>
                )}

                {/* ✨ Carte de bienvenue imprimable (réservation payée) */}
                {(booking.status === 'paid_escrow' || booking.status === 'completed') && (
                  <button
                    onClick={() => setWelcomeCardBooking(booking)}
                    className="w-full py-3 bg-awder-gold/10 text-awder-gold rounded-xl font-semibold flex items-center justify-center gap-2 text-sm border border-awder-gold/30"
                  >
                    <Gift className="w-4 h-4" /> Carte de bienvenue à imprimer
                  </button>
                )}

                {user && booking.guestId && booking.guestId !== user.uid && (
                  <button
                    onClick={async () => {
                      try {
                        const convId = await ensureConversation(user.uid, profile?.displayName ?? 'Hôte', booking.guestId, booking.beneficiaryName || 'Voyageur');
                        setActiveChat({ id: convId, name: booking.beneficiaryName || 'Voyageur', avatar: 'VG', otherUid: booking.guestId });
                      } catch (e: any) { alert(e.message); }
                    }}
                    className="w-full py-3 bg-awder-brun/5 text-awder-brun rounded-xl font-semibold flex items-center justify-center gap-2 text-sm border border-awder-brun/10"
                  >
                    <MessageSquare className="w-4 h-4" /> Contacter le voyageur
                  </button>
                )}

                {booking.checkInStatus === 'checked_out' && booking.status === 'paid_escrow' && (
                  <button
                    onClick={async () => {
                      try { await callBookingAction(booking.id, 'release_caution'); } catch (err: any) { alert(err.message); }
                    }}
                    disabled={loading}
                    className="w-full py-4 bg-awder-gold text-awder-brun rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-awder-gold/20 text-xs uppercase tracking-widest animate-pulse"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Libérer la caution & clôturer
                  </button>
                )}
                {booking.status === 'paid_escrow' && !booking.hasDispute && (
                  <button
                    onClick={() => { setDisputeBooking(booking); setDisputeReason(''); }}
                    className="w-full py-3 text-red-500 rounded-2xl font-semibold flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest border border-red-100 bg-red-50"
                  >
                    <ShieldAlert className="w-4 h-4" /> Signaler un problème
                  </button>
                )}
              </motion.div>
            )) : (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-full border border-awder-sable flex items-center justify-center text-awder-sable">
                  <Calendar className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <p className="text-awder-brun font-semibold text-lg">Aucune réservation reçue</p>
                  <p className="text-awder-grisbrun text-sm font-medium px-12 leading-relaxed">Vos voyageurs apparaîtront ici dès qu&apos;ils réservent votre lieu.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bookings' && effectiveMode !== 'hote' && (
        <div className="px-6 py-10 space-y-10 pb-32">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold text-awder-brun tracking-tighter leading-none">Mes Réserves</h2>
            <p className="text-xs text-awder-grisbrun font-semibold uppercase tracking-[0.3em] italic">An bè koun kɛ !</p>
          </div>

          <div className="space-y-6">
            {user && userBookings.length > 0 ? userBookings.map((booking) => (
              <motion.div 
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-8 bg-white rounded-2xl border border-awder-sable shadow-2xl shadow-[var(--shadow-warm-sm)] space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-awder-brun text-xl leading-tight tracking-tight">{booking.listingTitle}</h4>
                    <div className="flex items-center gap-2 text-xs text-awder-grisbrun font-bold">
                      <User className="w-3 h-3 text-awder-ocre" />
                      <span>Hôte : <strong className="text-awder-brun">{booking.hostName ?? 'Hôte Awder'}</strong></span>
                    </div>
                    {(booking.startDate || booking.endDate) && (
                      <div className="flex items-center gap-2 text-xs text-awder-grisbrun font-bold">
                        <Calendar className="w-3 h-3 text-awder-ocre" />
                        <span>
                          {booking.startDate ? format(new Date(booking.startDate), 'dd MMM') : ''}
                          {booking.endDate ? ` → ${format(new Date(booking.endDate), 'dd MMM yyyy')}` : ''}
                          {booking.nights ? ` · ${booking.nights} nuit${booking.nights > 1 ? 's' : ''}` : ''}
                          {booking.hours ? ` · ${booking.hours}h` : ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full w-fit">
                      {booking.status === 'paid_escrow' ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-awder-gold" />
                          <span className="text-[8px] font-semibold uppercase tracking-widest text-awder-gold">Sira-Djou Sécurisé</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3 h-3 text-white/60" />
                          <span className="text-[8px] font-semibold uppercase tracking-widest text-white/60">En attente</span>
                        </>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest ${
                      booking.status === 'paid_escrow' ? 'bg-awder-gold/10 text-awder-gold' :
                      booking.status === 'completed' ? 'bg-awder-bogolan/10 text-awder-bogolan' :
                      booking.status === 'pending_host_approval' ? 'bg-awder-ocre/10 text-awder-ocre' :
                      booking.status === 'approved' ? 'bg-awder-bogolan/10 text-awder-bogolan' :
                      booking.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-awder-sable/40 text-awder-grisbrun'
                    }`}>
                      {booking.status === 'paid_escrow' ? 'Fonds Séquestrés' :
                       booking.status === 'completed' ? 'Voyage Terminé' :
                       booking.status === 'pending_host_approval' ? 'En attente de l\'hôte' :
                       booking.status === 'approved' ? 'Acceptée — à payer' :
                       booking.status === 'rejected' ? 'Refusée' : 'En attente'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-awder-brun">{formatPrice(booking.totalPrice)} F</p>
                    <div className="flex items-center justify-end gap-1 text-[8px] font-semibold text-awder-bogolan uppercase tracking-widest mt-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Sira-Djou Validé</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingReceipt(booking);
                      }}
                      className="text-[10px] font-bold text-awder-ocre underline decoration-awder-ocre/20 underline-offset-4 uppercase tracking-widest mt-2 block ml-auto"
                    >
                      Facture #AW-{booking.id.slice(0,4).toUpperCase()}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-awder-offwhite rounded-2xl border border-awder-sable/60 space-y-1">
                    <p className="text-[9px] font-semibold text-awder-grisbrun uppercase tracking-widest">Caution Sira-Ocre</p>
                    <p className={`text-sm font-semibold ${booking.cautionStatus === 'released' ? 'text-awder-bogolan' : 'text-awder-ocre'}`}>
                      {booking.cautionStatus === 'released' ? 'LIBÉRÉE' : `${formatPrice(booking.cautionAmount)} F`}
                    </p>
                  </div>
                  <div className="p-5 bg-awder-offwhite rounded-2xl border border-awder-sable/60 space-y-1">
                    <p className="text-[9px] font-semibold text-awder-grisbrun uppercase tracking-widest">Statut Arrivée</p>
                    <p className="text-sm font-semibold text-awder-brun uppercase tracking-tighter">
                      {booking.checkInStatus === 'checked_in' ? 'Présent' : booking.checkInStatus === 'checked_out' ? 'Parti' : 'Attendu'}
                    </p>
                  </div>
                </div>

                {user && booking.hostId && booking.hostId !== user.uid && (
                  <button
                    onClick={async () => {
                      try {
                        const myName = profile?.displayName ?? 'Voyageur';
                        const otherName = booking.hostName ?? 'Hôte';
                        const convId = await ensureConversation(user.uid, myName, booking.hostId, otherName);
                        setActiveChat({ id: convId, name: otherName, avatar: otherName.slice(0,2).toUpperCase(), otherUid: booking.hostId });
                      } catch (e: any) { alert(e.message); }
                    }}
                    className="w-full py-3 bg-awder-brun/5 text-awder-brun rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest border border-awder-brun/10"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Contacter l&apos;hôte
                  </button>
                )}

                <div className="flex gap-2">
                  {booking.status === 'paid_escrow' && booking.checkInStatus !== 'checked_out' && (
                    <button
                      onClick={() => {
                        setExtendingBooking(booking);
                        setExtendDuration(1);
                        setShowExtendModal(true);
                      }}
                      disabled={loading}
                      className="flex-1 py-4 bg-white border-2 border-awder-brun text-awder-brun rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                      <PlusCircle className="w-4 h-4 text-awder-gold" />
                      Prolonger
                    </button>
                  )}
                  {booking.status === 'paid_escrow' && booking.checkInStatus !== 'checked_in' && booking.checkInStatus !== 'checked_out' && (
                    <button
                      onClick={async () => {
                        try {
                          await callBookingAction(booking.id, 'check_in');
                          fetchBookings();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      disabled={loading}
                      className="flex-1 py-4 bg-awder-ocre text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-awder-ocre/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                      <Download className="w-4 h-4" />
                      Check-in
                    </button>
                  )}
                  {booking.checkInStatus === 'checked_in' && (
                    <button
                      onClick={async () => {
                        try {
                          await callBookingAction(booking.id, 'check_out');
                          fetchBookings();
                          setShowDiyaRating(booking);
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      disabled={loading}
                      className="flex-1 py-4 bg-awder-brun text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-awder-brun/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                      <Upload className="w-4 h-4" />
                      Check-out
                    </button>
                  )}
                  {booking.checkInStatus === 'checked_out' && booking.status === 'paid_escrow' && (
                    <div className="flex-1 py-4 bg-awder-sable/40 text-awder-grisbrun rounded-2xl font-semibold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-center">
                      <Clock className="w-4 h-4" />
                      En attente de clôture par l&apos;hôte
                    </div>
                  )}
                </div>

                {/* ✨ Demande acceptée → payer pour confirmer */}
                {booking.status === 'approved' && (
                  <button
                    onClick={() => payApprovedBooking(booking)}
                    disabled={loading}
                    className="w-full py-4 bg-awder-ocre text-white rounded-xl font-semibold flex items-center justify-center gap-2.5 shadow-[0_10px_22px_-8px_rgba(166,75,42,0.55)] active:scale-[0.98] transition-all text-base"
                  >
                    <CreditCard className="w-5 h-5" />
                    Payer maintenant — {formatPrice(booking.totalPrice)} F
                  </button>
                )}
                {booking.status === 'pending_host_approval' && (
                  <div className="w-full py-3.5 bg-awder-ocre/[0.06] text-awder-ocre rounded-xl font-semibold flex items-center justify-center gap-2 text-sm border border-awder-ocre/15">
                    <Clock className="w-4 h-4" />
                    L&apos;hôte examine votre demande…
                  </div>
                )}

                {/* ✨ Rappel Diya — 7 jours après un séjour terminé non noté */}
                {booking.status === 'completed' && !booking.reviewed &&
                  booking.endDate && (Date.now() - new Date(booking.endDate).getTime()) < 7 * 24 * 3600 * 1000 && (
                  <button
                    onClick={() => setShowDiyaRating(booking)}
                    className="w-full py-3.5 bg-awder-gold/10 text-awder-gold border border-awder-gold/30 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-all"
                  >
                    <Star className="w-4 h-4 fill-awder-gold" />
                    Noter mon séjour · Diya
                  </button>
                )}

                {/* ✨ Comment s'y rendre — révélé après paiement sécurisé */}
                {(booking.status === 'paid_escrow' || booking.status === 'completed') && (() => {
                  const bookedListing = listings.find(l => l.id === booking.listingId);
                  if (!bookedListing) return null;
                  const loc = bookedListing.location || {};
                  const coords = loc.coordinates;
                  return (
                    <div className="space-y-3 pt-2">
                      <div>
                        <h5 className="font-semibold text-awder-brun text-base">Comment s&apos;y rendre</h5>
                        <p className="awder-label text-awder-gold mt-0.5">Révélé après votre paiement Sira-Djou</p>
                      </div>
                      <div className="p-4 bg-awder-offwhite border border-awder-sable rounded-xl space-y-3">
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-awder-ocre shrink-0 mt-0.5" />
                          <p className="text-[13px] text-awder-brun font-medium">
                            {loc.address}{loc.neighborhood ? `, ${loc.neighborhood}` : ''}, {loc.city}
                          </p>
                        </div>
                        {(loc.directions || bookedListing.directions) && (
                          <div className="flex items-start gap-2.5">
                            <Info className="w-4 h-4 text-awder-gold shrink-0 mt-0.5" />
                            <p className="text-[13px] text-awder-brun/85 leading-relaxed">{loc.directions || bookedListing.directions}</p>
                          </div>
                        )}
                        {loc.taxiInstructions && (
                          <div className="flex items-start gap-2.5">
                            <Map className="w-4 h-4 text-awder-brun shrink-0 mt-0.5" />
                            <p className="text-[13px] text-awder-brun/85 leading-relaxed"><strong className="font-semibold">Au taxi :</strong> {loc.taxiInstructions}</p>
                          </div>
                        )}
                        {loc.voiceNoteUrl && <VoiceNotePlayer src={loc.voiceNoteUrl} />}
                        {coords?.lat && coords?.lng && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 bg-awder-brun text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                          >
                            <Map className="w-4 h-4" /> Ouvrir l&apos;itinéraire GPS
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ✨ Bons plats à côté — guide local pour la diaspora */}
                {(booking.status === 'paid_escrow' || booking.status === 'completed') && (() => {
                  const bookedListing = listings.find(l => l.id === booking.listingId);
                  const tips = (bookedListing?.hostTips || []).filter((t: any) => t.name);
                  if (tips.length === 0) return null;
                  return (
                    <div className="space-y-3 pt-2">
                      <div>
                        <h5 className="font-semibold text-awder-brun text-base">Bons plats à côté</h5>
                        <p className="awder-label text-awder-gold mt-0.5">Les bonnes adresses de votre hôte</p>
                      </div>
                      <div className="space-y-2">
                        {tips.map((tip: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3.5 bg-awder-offwhite border border-awder-sable rounded-xl">
                            <span className="w-9 h-9 shrink-0 rounded-lg bg-awder-ocre/10 text-awder-ocre grid place-items-center">
                              <Utensils className="w-4 h-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-awder-brun truncate">{tip.name}</p>
                              <p className="text-xs text-awder-grisbrun">
                                {tip.kind === 'plat' ? 'Plat local' : tip.kind === 'resto' ? 'Restaurant' : tip.kind === 'marche' ? 'Marché' : 'Expérience'}
                                {tip.note ? ` · ${tip.note}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ✨ Signaler un problème (litige) — bloque l'escrow */}
                {(booking.status === 'paid_escrow') && !booking.hasDispute && (
                  <button
                    onClick={() => { setDisputeBooking(booking); setDisputeReason(''); }}
                    className="w-full py-3 text-red-500 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all text-[11px] uppercase tracking-widest border border-red-100 bg-red-50"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Signaler un problème
                  </button>
                )}
                {booking.status === 'disputed' && (
                  <div className="w-full py-3 text-red-600 rounded-2xl font-semibold flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest border border-red-200 bg-red-50">
                    <ShieldAlert className="w-4 h-4" />
                    Litige en cours — Awder intervient
                  </div>
                )}
              </motion.div>
            )) : (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-full border border-awder-sable flex items-center justify-center text-awder-sable">
                  <Calendar className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <p className="text-awder-brun font-semibold text-lg">Aucune réserve active</p>
                  <p className="text-awder-grisbrun text-sm font-medium px-12 leading-relaxed">Découvrez nos lieux d&apos;exception pour commencer l&apos;aventure.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt Overlay */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[110] bg-awder-brun/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={() => setViewingReceipt(null)}
              className="absolute top-6 right-6 p-2 bg-awder-sable rounded-full hover:bg-awder-sable transition-colors"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>
            
            <div className="p-10 space-y-8">
              <div className="space-y-4 text-center">
                <div className="relative w-48 h-48 mx-auto">
                  <Image 
                    src="/logo.jpeg" 
                    alt="Awder" 
                    fill 
                    sizes="192px"
                    className="object-contain mix-blend-multiply"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-awder-gold uppercase tracking-[0.4em]">Reçu de Séjour</p>
                  <p className="text-xs text-awder-grisbrun font-bold">#AW-{viewingReceipt.id.slice(0,6).toUpperCase()}</p>
                </div>
                <div className="px-4 py-1.5 bg-awder-bogolan/10 text-awder-bogolan text-[10px] font-semibold rounded-full uppercase tracking-widest border border-green-100 w-fit mx-auto">
                  PAYÉ
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-awder-brun leading-tight">{viewingReceipt.listingTitle}</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-awder-ocre" />
                    <p className="text-[10px] text-awder-grisbrun font-bold uppercase tracking-tight">ACI 2000, Bamako</p>
                  </div>
                </div>
                
                <div className="border-t border-awder-sable pt-6 space-y-4 text-sm font-bold">
                  <div className="flex justify-between items-center text-awder-brun/80">
                    <span>Séjour (1 nuit)</span>
                    <span>{formatPrice(viewingReceipt.totalPrice)} F</span>
                  </div>
                  <div className="flex justify-between items-center text-awder-grisbrun">
                    <span>Frais Awder & Protection</span>
                    <span>{formatPrice(Math.round(viewingReceipt.totalPrice * 0.12))} F</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-awder-sable">
                    <span className="text-lg font-semibold text-awder-brun">TOTAL PAYÉ</span>
                    <span className="text-lg font-semibold text-awder-ocre">{formatPrice(Math.round(viewingReceipt.totalPrice * 1.12))} F</span>
                  </div>
                </div>

                <div className="p-6 bg-awder-sable/40 rounded-2xl space-y-2 border border-awder-sable">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] text-awder-grisbrun font-semibold uppercase tracking-widest leading-none">Dépôt de Garantie (Caution)</p>
                    <ShieldCheck className="w-4 h-4 text-awder-gold" />
                  </div>
                  <p className="text-lg font-semibold text-awder-brun leading-none">{formatPrice(viewingReceipt.cautionAmount)} FCFA</p>
                  <p className="text-[9px] text-awder-grisbrun font-bold italic mt-2">
                    Séquestre temporaire. La caution sera automatiquement libérée et recréditée sur votre portefeuille Awder 24h après la validation de votre check-out par l'hôte.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 py-4 border-t border-awder-sable">
                <div className="w-24 h-24 bg-white border-2 border-awder-sable p-2 rounded-2xl flex items-center justify-center opacity-40">
                  <QrCode className="w-full h-full text-awder-brun" />
                </div>
                <span className="text-[8px] font-semibold text-awder-grisbrun/60 uppercase tracking-[0.4em]">Scan pour Check-in</span>
              </div>

              <div className="pt-4 text-center space-y-6">
                <div className="space-y-1">
                   <p className="text-[10px] font-semibold text-awder-brun italic">&quot;Aw dansɛ ! Votre aventure commence ici.&quot;</p>
                   <p className="text-[10px] font-semibold text-awder-brun italic tracking-widest">ߌ ߘߊ߲߬ߛߍ߬</p>
                </div>
                
                <div className="flex justify-center gap-4">
                  <button className="flex-1 py-4 bg-awder-brun text-white rounded-2xl font-semibold text-xs uppercase tracking-widest shadow-xl shadow-awder-brun/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Enregistrer
                  </button>
                </div>
                <p className="text-[9px] text-awder-grisbrun/60 font-semibold uppercase tracking-widest">I ni ce, an bɛ koun kɛ !</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dispute Modal — Signaler un problème */}
      {disputeBooking && (
        <div className="fixed inset-0 z-[160] bg-awder-brun/90 backdrop-blur-xl flex items-end justify-center px-4">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full max-w-md bg-white rounded-t-3xl p-10 space-y-6"
          >
            <div className="w-16 h-1 bg-awder-sable rounded-full mx-auto" />
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold text-awder-brun tracking-tighter">Signaler un problème</h3>
              <p className="text-xs text-awder-grisbrun font-bold leading-relaxed">
                Vos fonds restent bloqués (Sira-Djou). L&apos;équipe Awder examine et tranche sous 48h.
              </p>
            </div>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              placeholder="Décrivez le problème (logement non conforme, hôte injoignable, dégâts...)"
              className="w-full p-5 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-red-300 font-bold text-awder-brun text-sm resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setDisputeBooking(null)}
                className="flex-1 py-4 bg-awder-sable/40 text-awder-grisbrun rounded-full font-semibold text-xs uppercase tracking-widest"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (disputeReason.trim().length < 5) { alert('Décrivez le problème (5 caractères min).'); return; }
                  setLoading(true);
                  try {
                    await callBookingAction(disputeBooking.id, 'open_dispute', { disputeReason });
                    setDisputeBooking(null);
                    fetchBookings();
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="flex-1 py-4 bg-red-500 text-white rounded-full font-semibold text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 disabled:opacity-60"
              >
                {loading ? '...' : 'Ouvrir le litige'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Extend Stay Modal */}
      {showExtendModal && extendingBooking && (
        <div className="fixed inset-0 z-[120] bg-awder-brun/90 backdrop-blur-xl flex items-end justify-center px-4">
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full max-w-md bg-white rounded-t-3xl p-12 space-y-10"
          >
            <div className="space-y-3 text-center">
              <div className="w-16 h-1 bg-awder-sable rounded-full mx-auto mb-6"></div>
              <h3 className="text-3xl font-semibold text-awder-brun tracking-tighter">Prolonger le Séjour</h3>
              <p className="text-sm text-awder-grisbrun font-bold leading-relaxed">
                {extendingBooking.listingTitle}
              </p>
            </div>

            {(() => {
              const isHourly = extendingBooking.hours > 0;
              const listing = listings.find((l: any) => l.id === extendingBooking.listingId) || MOCK_LISTINGS.find((l: any) => l.id === extendingBooking.listingId);
              const unitPrice = listing ? listing.price : 20000;
              const additionalPrice = unitPrice * extendDuration;

              return (
                <div className="space-y-8">
                  <div className="p-6 bg-awder-sable/40 rounded-2xl border border-awder-sable flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-awder-grisbrun font-semibold uppercase tracking-[0.2em] leading-none">
                        Durée à ajouter
                      </p>
                      <p className="text-2xl font-semibold text-awder-brun mt-2">
                        {extendDuration} {isHourly ? (extendDuration > 1 ? 'heures' : 'heure') : (extendDuration > 1 ? 'nuits' : 'nuit')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setExtendDuration(prev => Math.max(1, prev - 1))}
                        className="w-12 h-12 bg-white border border-awder-sable rounded-2xl flex items-center justify-center font-semibold text-xl text-awder-brun active:scale-90"
                      >
                        -
                      </button>
                      <button 
                        onClick={() => setExtendDuration(prev => prev + 1)}
                        className="w-12 h-12 bg-white border border-awder-sable rounded-2xl flex items-center justify-center font-semibold text-xl text-awder-brun active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-awder-sable/40 rounded-2xl border border-awder-sable space-y-2">
                    <div className="flex justify-between items-center text-awder-brun/80 font-bold text-sm">
                      <span>Tarif unitaire :</span>
                      <span>{formatPrice(unitPrice, selectedCurrency)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-awder-sable font-semibold text-lg text-awder-brun">
                      <span>Total Supplément :</span>
                      <span className="text-awder-ocre">{formatPrice(additionalPrice, selectedCurrency)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await callBookingAction(extendingBooking.id, 'extend_stay', extendDuration);
                        setShowExtendModal(false);
                        setExtendingBooking(null);
                        fetchBookings();
                      } catch (err: any) {
                        alert(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full py-6 bg-awder-ocre text-white rounded-full font-semibold text-lg shadow-2xl shadow-awder-ocre/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "Confirmer & Payer la prolongation"
                    )}
                  </button>

                  <button 
                    onClick={() => {
                      setShowExtendModal(false);
                      setExtendingBooking(null);
                    }}
                    className="w-full py-2 text-awder-grisbrun font-semibold uppercase text-[10px] tracking-[0.3em] hover:text-awder-brun transition-colors text-center block"
                    disabled={loading}
                  >
                    Annuler
                  </button>
                </div>
              );
            })()}
          </motion.div>
        </div>
      )}

      {/* Host Inscription Form Overlay */}
      {showHostForm && user && (
        <BecomeHostFlow
          userId={user.uid}
          userName={profile?.displayName}
          onClose={() => setShowHostForm(false)}
          onActivated={(prefill) => {
            setShowHostForm(false);
            setUserMode('hote');
            setActiveTab('home');
            setEditingListing(prefill); // pré-remplit la création d'annonce (sans id → nouveau brouillon autosauvé)
            setShowAddListing(true);
          }}
        />
      )}

      {activeTab === 'profile' && !user && (
        <div className="px-6 py-20 space-y-8 text-center pb-32">
          <div className="w-24 h-24 bg-awder-ocre/10 rounded-full flex items-center justify-center mx-auto text-awder-ocre">
            <User className="w-12 h-12" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold text-awder-brun tracking-tighter">Bienvenue sur Awder</h2>
            <p className="text-sm text-awder-grisbrun font-medium leading-relaxed max-w-xs mx-auto">
              Connectez-vous pour réserver, devenir hôte et gérer votre portefeuille.
            </p>
          </div>
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full py-5 bg-awder-ocre text-white rounded-2xl font-semibold shadow-xl shadow-awder-ocre/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Se connecter
          </button>
        </div>
      )}

      {activeTab === 'profile' && user && (
        <div className="px-6 py-10 space-y-10 pb-32">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-semibold text-awder-brun tracking-tighter">Profil</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white border border-awder-sable rounded-2xl px-3 py-2 shadow-sm">
                <Globe className="w-4 h-4 text-awder-gold" />
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value as any)}
                  className="bg-transparent text-xs font-semibold text-awder-brun outline-none cursor-pointer"
                >
                  {Object.entries(CURRENCIES).map(([code, details]) => (
                    <option key={code} value={code}>
                      {code} ({details.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className={`p-8 rounded-t-3xl rounded-br-[50px] shadow-2xl relative overflow-hidden group transition-all ${profile?.role === 'host' ? 'bg-awder-ocre shadow-awder-ocre/20' : 'bg-awder-brun shadow-awder-brun/20'}`}>
            <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-[100px] opacity-20 group-hover:scale-150 transition-transform duration-1000 ${profile?.role === 'host' ? 'bg-awder-gold' : 'bg-awder-gold'}`}></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white text-3xl font-semibold">
                  {profile?.displayName?.[0] || 'A'}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-2xl font-semibold tracking-tight">{profile?.displayName || 'Awder Voyageur'}</p>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full w-fit">
                    {profile?.role === 'host' ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-awder-gold" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-white"> Hôte Koron Vérifié</span>
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 text-white/60" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/90"> Voyageur Awder</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* La bascule Voyage ⇄ Hôte vit désormais dans l'en-tête (header). */}

          <div className="grid grid-cols-1 gap-4">
            <ProfileLink 
              icon={<User className="w-6 h-6" />} 
              label="Informations Personnelles" 
              onClick={() => setShowPersonalInfo(true)}
            />
            <ProfileLink 
              icon={<ShieldAlert className="w-6 h-6" />} 
              label="Sécurité & Identité" 
              badge="À vérifier" 
              onClick={() => setShowIdVerification(true)}
            />
            <ProfileLink 
              icon={<CreditCard className="w-6 h-6" />} 
              label="Portefeuille Wallet" 
              onClick={() => setShowWallet(true)}
            />
            <ProfileLink 
              icon={<Gift className="w-6 h-6" />} 
              label="Terriyan (Parrainage)" 
              highlight 
              onClick={() => setShowTerriyan(true)}
            />
            <ProfileLink
              icon={<Headphones className="w-6 h-6" />}
              label="Contacter Awder"
              onClick={() => setShowSupport(true)}
            />
            {profile?.role !== 'host' && (
              <ProfileLink
                icon={<PlusCircle className="w-6 h-6" />}
                label="Devenir Hôte Awder"
                onClick={() => setShowHostForm(true)}
              />
            )}
          </div>

          <button
            onClick={logout}
            className="w-full py-5 bg-red-50 text-red-500 rounded-2xl font-semibold border border-red-100 active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Déconnexion
          </button>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[400] bg-awder-brun/95 backdrop-blur-xl flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={() => { setShowLoginModal(false); resetAuthModal(); }}
              className="absolute top-8 right-8 p-3 bg-awder-sable/40 text-awder-grisbrun rounded-2xl hover:bg-awder-sable transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-10 space-y-8">
              {/* Header */}
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-awder-ocre/10 rounded-full flex items-center justify-center mx-auto text-awder-ocre">
                  <User className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-semibold text-awder-brun tracking-tighter leading-none">Bienvenue chez Awder</h3>
                  <p className="text-sm font-bold text-awder-grisbrun tracking-tight italic">Connectez-vous pour continuer.</p>
                </div>
              </div>

              {/* Tab switcher Email / WhatsApp */}
              <div className="flex bg-awder-sable/40 rounded-2xl p-1">
                <button
                  onClick={() => { setAuthTab('email'); setAuthStep('form'); setAuthError(''); }}
                  className={`flex-1 py-3 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${authTab === 'email' ? 'bg-white text-awder-brun shadow-sm' : 'text-awder-grisbrun'}`}
                >
                  <Mail className="w-4 h-4" /> Email
                </button>
                <button
                  onClick={() => { setAuthTab('whatsapp'); setAuthStep('form'); setAuthError(''); }}
                  className={`flex-1 py-3 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${authTab === 'whatsapp' ? 'bg-white text-awder-brun shadow-sm' : 'text-awder-grisbrun'}`}
                >
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </button>
              </div>

              {/* Error */}
              {authError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-xs font-bold text-center">
                  {authError}
                </div>
              )}

              {/* ── Email tab ── */}
              {authTab === 'email' && (
                <div className="space-y-4">
                  {/* Connexion / Inscription toggle */}
                  <div className="flex bg-awder-sable/40 rounded-2xl p-1">
                    <button
                      onClick={() => { setAuthMode('signin'); setAuthError(''); }}
                      className={`flex-1 py-2 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all ${authMode === 'signin' ? 'bg-white text-awder-brun shadow-sm' : 'text-awder-grisbrun'}`}
                    >
                      Connexion
                    </button>
                    <button
                      onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                      className={`flex-1 py-2 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all ${authMode === 'signup' ? 'bg-white text-awder-brun shadow-sm' : 'text-awder-grisbrun'}`}
                    >
                      Inscription
                    </button>
                  </div>

                  {authMode === 'signup' && (
                    <div className="relative group">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre transition-colors" />
                      <input
                        type="text"
                        placeholder="Votre prénom"
                        value={authDisplayName}
                        onChange={(e) => setAuthDisplayName(e.target.value)}
                        className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun transition-all"
                      />
                    </div>
                  )}

                  <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre transition-colors" />
                    <input
                      type="email"
                      placeholder="votre@email.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun transition-all"
                    />
                  </div>

                  <div className="relative group">
                    <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre transition-colors" />
                    <input
                      type="password"
                      placeholder="Mot de passe"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                      className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun transition-all"
                    />
                  </div>

                  <button
                    onClick={handleEmailAuth}
                    disabled={loading || !authEmail || !authPassword}
                    className="w-full py-6 bg-awder-ocre text-white rounded-2xl font-semibold text-sm uppercase tracking-[0.2em] shadow-xl shadow-awder-ocre/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                      : authMode === 'signin' ? 'Se Connecter' : 'Créer mon compte'}
                  </button>

                  {authMode === 'signin' && (
                    <button
                      onClick={async () => {
                        if (!authEmail) { setAuthError('Entrez votre email pour réinitialiser.'); return; }
                        try {
                          await resetPassword(authEmail);
                          setAuthError('');
                          alert('Email de réinitialisation envoyé. Vérifiez votre boîte mail.');
                        } catch (e: any) {
                          setAuthError(authErrorToFrench(e.code ?? ''));
                        }
                      }}
                      className="w-full text-center text-[11px] font-bold text-awder-grisbrun hover:text-awder-ocre transition-colors uppercase tracking-widest"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
              )}

              {/* ── WhatsApp tab ── */}
              {authTab === 'whatsapp' && (
                <div className="space-y-4">
                  {authStep === 'form' ? (
                    <>
                      <p className="text-[10px] font-semibold text-awder-gold uppercase tracking-[0.4em] text-center">Votre numéro WhatsApp</p>
                      <div className="relative group">
                        <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre transition-colors" />
                        <input
                          type="tel"
                          placeholder="+223 70 00 00 00"
                          value={authPhone}
                          onChange={(e) => setAuthPhone(e.target.value)}
                          className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-bold text-awder-brun transition-all"
                        />
                      </div>
                      <button
                        onClick={handleSendWhatsAppOtp}
                        disabled={loading || !authPhone}
                        className="w-full py-6 bg-awder-ocre text-white rounded-2xl font-semibold text-sm uppercase tracking-[0.2em] shadow-xl shadow-awder-ocre/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {loading
                          ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                          : 'Recevoir le code'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold text-awder-gold uppercase tracking-[0.4em] text-center">Code reçu sur WhatsApp</p>
                      {devCodeHint && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-xs font-semibold text-center">
                          {devCodeHint}
                        </div>
                      )}
                      <div className="relative group">
                        <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-awder-grisbrun/60 group-focus-within:text-awder-ocre transition-colors" />
                        <input
                          type="text"
                          placeholder="000000"
                          value={authOtp}
                          onChange={(e) => setAuthOtp(e.target.value)}
                          maxLength={6}
                          className="w-full p-5 pl-16 bg-awder-sable/40 border border-awder-sable rounded-2xl outline-none focus:border-awder-gold font-semibold text-awder-brun tracking-[0.8em] transition-all"
                        />
                      </div>
                      <button
                        onClick={handleVerifyWhatsAppOtp}
                        disabled={loading || authOtp.length < 6}
                        className="w-full py-6 bg-awder-ocre text-white rounded-2xl font-semibold text-sm uppercase tracking-[0.2em] shadow-xl shadow-awder-ocre/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {loading
                          ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                          : 'Vérifier & Entrer'}
                      </button>
                      <button
                        onClick={() => { setAuthStep('form'); setAuthOtp(''); setAuthError(''); }}
                        className="w-full py-2 text-awder-grisbrun font-bold text-[10px] uppercase tracking-widest hover:text-awder-ocre transition-colors"
                      >
                        Modifier le numéro
                      </button>
                    </>
                  )}
                </div>
              )}

              <p className="text-[9px] text-center text-awder-grisbrun/60 font-bold uppercase tracking-widest leading-relaxed px-6">
                En continuant, vous acceptez nos conditions d&apos;utilisation et notre politique de confidentialité Sira-Djou.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </MobileLayout>
  );
}

const PaymentButton = ({ method, label, color, icon, loading, onClick }: any) => (
  <button 
    disabled={loading}
    onClick={onClick}
    className="w-full flex items-center justify-between p-6 bg-awder-sable/40 border-2 border-transparent hover:border-awder-ocre rounded-2xl transition-all group"
  >
    <div className="flex items-center gap-5">
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/5 transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className="text-left">
        <p className="font-semibold text-awder-brun">{label}</p>
        <p className="text-[10px] text-awder-grisbrun font-bold uppercase tracking-widest italic">Sira-Djou Inclus</p>
      </div>
    </div>
  </button>
);

const HostDashboard = ({ profile, onAddListing, onViewBooking, onSwitchMode, activeSubTab, onSubTabChange, notifications, onShowNotifications, onShowSupport, wallet, transactions, myListings = [], hostBookings = [], onWithdraw, onEditListing }: any) => {
  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  // ✨ Stats hôte réelles
  const activeBookings = hostBookings.filter((b: any) => ['paid_escrow', 'completed', 'disputed'].includes(b.status));
  const confirmedCount = hostBookings.filter((b: any) => b.status === 'paid_escrow' || b.status === 'completed').length;
  const totalBookings = hostBookings.length;
  const totalEarned = hostBookings
    .filter((b: any) => b.status === 'completed')
    .reduce((acc: number, b: any) => acc + ((b.totalPrice || 0) - (b.cautionAmount || 0)), 0);
  // Note moyenne réelle des annonces de l'hôte
  const ratedListings = myListings.filter((l: any) => typeof l.rating === 'number' && (l.reviewCount ?? 0) > 0);
  const avgRating = ratedListings.length
    ? (ratedListings.reduce((a: number, l: any) => a + l.rating, 0) / ratedListings.length)
    : null;

  // ✨ Calendrier hôte — sélection d'annonce + blocage manuel
  const now = new Date();
  const [calListingId, setCalListingId] = useState<string>('');
  // ✨ Mes annonces : onglet statut actif + recherche
  const [listingsTab, setListingsTab] = useState<'approved' | 'pending_review' | 'draft' | 'rejected'>('approved');
  const [listingsSearch, setListingsSearch] = useState('');
  const [calSaving, setCalSaving] = useState(false);
  React.useEffect(() => {
    if (!calListingId && myListings.length > 0) setCalListingId(myListings[0].id);
  }, [myListings, calListingId]);
  const calListing = myListings.find((l: any) => l.id === calListingId);

  // Jours réservés (mois courant) pour l'annonce sélectionnée
  const bookedDaysThisMonth = new Set<number>();
  hostBookings.forEach((b: any) => {
    if (calListingId && b.listingId !== calListingId) return;
    if (!['paid_escrow', 'completed', 'pending_payment'].includes(b.status)) return;
    const s = new Date(b.startDate); const e = new Date(b.endDate);
    if (isNaN(s.getTime())) return;
    const cur = new Date(s);
    while (cur <= e) {
      if (cur.getMonth() === now.getMonth() && cur.getFullYear() === now.getFullYear()) {
        bookedDaysThisMonth.add(cur.getDate());
      }
      cur.setDate(cur.getDate() + 1);
    }
  });
  // Jours bloqués manuellement (stockés sur l'annonce en 'YYYY-MM-DD')
  const blockedSet = new Set<string>((calListing?.blockedDates ?? []) as string[]);
  const dayIso = (day: number) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const toggleBlockDay = async (day: number) => {
    if (!calListing || calSaving) return;
    if (bookedDaysThisMonth.has(day)) return; // réservé → non modifiable
    const iso = dayIso(day);
    const current: string[] = calListing.blockedDates ?? [];
    const next = current.includes(iso) ? current.filter((d) => d !== iso) : [...current, iso];
    setCalSaving(true);
    try {
      await updateDoc(doc(db, 'listings', calListing.id), { blockedDates: next, updatedAt: new Date().toISOString() });
    } catch (e: any) {
      alert(e.message ?? 'Échec de la mise à jour.');
    } finally {
      setCalSaving(false);
    }
  };

  return (
    <div className="px-6 py-10 space-y-10 pb-32">
      <div className="flex justify-between items-end">
        <div className="space-y-2 flex-1">
          <p className="text-[10px] font-semibold text-awder-gold uppercase tracking-[0.3em]">{activeSubTab === 'overview' ? 'Hôte Koron' : 'Annaso • ' + activeSubTab}</p>
          <h2 className="text-4xl font-semibold text-awder-brun tracking-tighter leading-none">
            {activeSubTab === 'overview' && 'Mes Gains Awder'}
            {activeSubTab === 'listings' && 'Mes Annonces'}
            {activeSubTab === 'calendar' && 'Calendrier Koron'}
            {activeSubTab === 'settings' && 'Paramétrage'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onSwitchMode}
            className="p-3 bg-white border border-awder-sable rounded-2xl shadow-sm text-awder-grisbrun flex flex-col items-center gap-1 active:scale-95 transition-all"
          >
            <User className="w-5 h-5 text-awder-grisbrun/60" />
            <span className="text-[8px] font-semibold uppercase tracking-widest">VOYAGEUR</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
        <HostTabButton icon={<Activity className="w-4 h-4" />} label="Aperçu" active={activeSubTab === 'overview'} onClick={() => onSubTabChange('overview')} />
        <HostTabButton icon={<Wallet className="w-4 h-4" />} label="Finance" active={activeSubTab === 'finance'} onClick={() => onSubTabChange('finance')} />
        <HostTabButton icon={<Home className="w-4 h-4" />} label="Annonces" active={activeSubTab === 'listings'} onClick={() => onSubTabChange('listings')} />
        <HostTabButton icon={<Calendar className="w-4 h-4" />} label="Calendrier" active={activeSubTab === 'calendar'} onClick={() => onSubTabChange('calendar')} />
        <HostTabButton icon={<Settings className="w-4 h-4" />} label="Paramètres" active={activeSubTab === 'settings'} onClick={() => onSubTabChange('settings')} />
      </div>

      {activeSubTab === 'finance' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="p-10 bg-awder-brun rounded-3xl text-white space-y-6 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-awder-gold/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
             <div className="space-y-1">
               <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.3em]">Solde Disponible</p>
               <p className="text-4xl font-semibold">{formatPrice(wallet?.balance || 0)} F</p>
             </div>
             <div className="flex gap-3">
               <button
                 onClick={onWithdraw}
                 disabled={(wallet?.balance || 0) <= 0}
                 className="flex-1 py-4 bg-awder-gold text-awder-brun rounded-2xl font-semibold text-xs uppercase tracking-widest shadow-lg shadow-awder-gold/20 active:scale-95 transition-all disabled:opacity-40"
               >
                 Retirer les fonds
               </button>
             </div>
          </div>

          <div className="space-y-6">
             <div className="flex justify-between items-center px-2">
               <h3 className="font-semibold text-awder-brun text-lg">Transactions Récentes</h3>
               <div className="flex items-center gap-1 text-[10px] font-semibold text-awder-grisbrun">
                 <ArrowUpRight className="w-3 h-3" />
                 <span>TRX ID VERIFIED</span>
               </div>
             </div>
             <div className="space-y-3">
               {transactions.length > 0 ? transactions.map((tx: any) => (
                 <div key={tx.id} className="p-6 bg-white border border-awder-sable/60 rounded-2xl flex items-center justify-between group hover:border-awder-ocre/20 transition-all">
                   <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl ${
                        tx.type === 'payment' ? 'bg-awder-bogolan/10 text-awder-bogolan' : 
                        tx.type === 'escrow_release' ? 'bg-awder-gold/10 text-awder-gold' : 
                        'bg-awder-sable/40 text-awder-grisbrun'
                      }`}>
                         {tx.type === 'payment' ? <ArrowUpRight className="w-5 h-5" /> : 
                          tx.type === 'escrow_release' ? <ShieldCheck className="w-5 h-5" /> :
                          <ArrowRight className="w-5 h-5" />}
                      </div>
                      <div className="space-y-0.5">
                         <p className="font-semibold text-awder-brun text-sm">{tx.description}</p>
                         <p className="text-[10px] text-awder-grisbrun/60 font-bold uppercase tracking-widest">{format(new Date(tx.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className={`font-semibold text-sm ${tx.type === 'payment' ? 'text-awder-bogolan' : 'text-awder-brun'}`}>
                        {tx.type === 'payment' ? '+' : ''}{formatPrice(tx.amount)} F
                      </p>
                      <p className="text-[8px] font-semibold text-awder-grisbrun/60 uppercase tracking-widest">{tx.status}</p>
                   </div>
                 </div>
               )) : (
                 <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-awder-sable/40 rounded-full flex items-center justify-center mx-auto text-awder-sable">
                      <Activity className="w-10 h-10" />
                    </div>
                    <p className="text-awder-grisbrun font-semibold text-xs uppercase tracking-widest">Aucune transaction finance</p>
                 </div>
               )}
             </div>
          </div>
        </motion.div>
      )}

      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-8 bg-awder-brun text-white rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-awder-gold" />
              <h4 className="font-semibold text-lg">Score Diya : {avgRating ? avgRating.toFixed(1) : '—'}/5</h4>
            </div>
            <p className="text-xs text-white/60 font-medium">
              {avgRating
                ? 'Votre accueil est apprécié ! Continuez ainsi pour rester Hôte Koron.'
                : 'Vos premières notes apparaîtront après vos premiers séjours.'}
            </p>
          </div>
        </div>
      )}

      {activeSubTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-8 bg-awder-ocre rounded-2xl space-y-2 shadow-2xl shadow-awder-ocre/20 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl group-hover:scale-150 transition-transform"></div>
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest uppercase">Mes Gains Awder</p>
              <p className="text-2xl font-semibold">{formatPrice(wallet?.balance || 0)} F</p>
              <div className="flex items-center gap-1 text-white/80 font-semibold text-[10px]">
                <TrendingUp className="w-3 h-3" />
                <span>En attente (Escrow): {formatPrice(wallet?.escrow || 0)} F</span>
              </div>
            </div>
            <div className="p-8 bg-white border border-awder-sable rounded-2xl space-y-2 shadow-sm relative overflow-hidden group">
              <p className="text-[10px] font-semibold text-awder-grisbrun uppercase tracking-widest select-none">Réservations</p>
              <p className="text-2xl font-semibold text-awder-brun leading-none">{totalBookings}</p>
              <div className="flex items-center gap-1 text-awder-gold font-semibold text-[10px]">
                <Activity className="w-3 h-3" />
                <span>{confirmedCount} confirmée{confirmedCount > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Fil d'Activité / Notifications Log */}
          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-semibold text-awder-brun text-xl tracking-tight">Fil d&apos;Activité Hôte</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-awder-ocre animate-pulse"></span>
                <span className="text-[10px] font-semibold text-awder-grisbrun uppercase tracking-widest">En Direct</span>
              </div>
            </div>
            <div className="space-y-4">
              {notifications && notifications.length > 0 ? notifications.slice(0, 5).map((n: any) => (
                <div 
                  key={n.id}
                  className={`p-6 rounded-2xl border transition-all ${n.read ? 'bg-awder-sable/40 border-transparent opacity-60' : 'bg-white border-awder-ocre/10 shadow-lg shadow-awder-ocre/5'}`}
                >
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-2xl h-fit ${n.type === 'booking_request' ? 'bg-awder-ocre text-white' : n.type === 'check_out' ? 'bg-awder-brun text-white' : 'bg-awder-gold text-white'}`}>
                      {n.type === 'booking_request' ? <Calendar className="w-4 h-4" /> : n.type === 'check_out' ? <ArrowUpRight className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-awder-brun text-sm tracking-tight">{n.title}</h4>
                        <span className="text-[8px] font-semibold text-awder-grisbrun/60 uppercase">{format(new Date(n.createdAt), 'HH:mm')}</span>
                      </div>
                      <p className="text-xs text-awder-grisbrun font-medium leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-10 text-center bg-awder-sable/40 rounded-2xl border border-dashed border-awder-sable">
                  <p className="text-[10px] font-semibold text-awder-grisbrun/60 uppercase tracking-widest leading-none">Calme plat sur Awder...</p>
                  <p className="text-[9px] text-awder-grisbrun font-medium mt-2 italic">Vos notifications de gestion s&apos;afficheront ici.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'listings' && (
        <div className="space-y-6">
          {myListings.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-20 h-20 bg-awder-sable/40 rounded-full flex items-center justify-center mx-auto text-awder-grisbrun/60">
                <Home className="w-8 h-8" />
              </div>
              <p className="text-awder-grisbrun font-bold text-sm">Vous n'avez pas encore d'annonce</p>
            </div>
          ) : (() => {
            // ✨ Onglets par statut + recherche — pas de longue liste unique
            const TABS: { key: typeof listingsTab; label: string }[] = [
              { key: 'approved', label: 'En ligne' },
              { key: 'pending_review', label: 'Validation' },
              { key: 'draft', label: 'Brouillons' },
              { key: 'rejected', label: 'Rejetées' },
            ];
            const byStatus = (s: string) => myListings.filter((l: any) => (l.moderationStatus || 'draft') === s);
            const q = listingsSearch.trim().toLowerCase();
            const visible = byStatus(listingsTab).filter((l: any) => !q || (l.title || '').toLowerCase().includes(q));
            return (
              <div className="space-y-4">
                {/* Recherche */}
                <div className="relative">
                  <Search className="w-4 h-4 text-awder-grisbrun absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={listingsSearch}
                    onChange={(e) => setListingsSearch(e.target.value)}
                    placeholder="Rechercher une annonce…"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-awder-sable rounded-xl outline-none focus:border-awder-gold text-sm font-medium text-awder-brun placeholder:text-awder-grisbrun/60"
                  />
                </div>
                {/* Onglets statut */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {TABS.map((t) => {
                    const n = byStatus(t.key).length;
                    const active = listingsTab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setListingsTab(t.key)}
                        className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${active ? 'bg-awder-brun border-awder-brun text-white' : 'bg-white border-awder-sable text-awder-grisbrun'}`}
                      >
                        {t.label} {n > 0 && <span className={active ? 'text-awder-gold-soft' : 'text-awder-grisbrun/70'}>· {n}</span>}
                      </button>
                    );
                  })}
                </div>
                {/* Liste de l'onglet actif */}
                {visible.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-awder-grisbrun">{q ? 'Aucune annonce ne correspond à cette recherche.' : 'Rien dans cette catégorie pour le moment.'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-awder-sable bg-white border border-awder-sable rounded-2xl overflow-hidden">
                    {visible.map((listing: any) => (
                      <button
                        key={listing.id}
                        onClick={() => onEditListing?.(listing)}
                        className="w-full flex items-center gap-3 p-3 text-left active:bg-awder-sable/40 transition-colors"
                      >
                        <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden relative border border-awder-sable">
                          <Image src={listing.images?.[0] ?? 'https://picsum.photos/seed/x/200'} alt={listing.title} fill sizes="56px" className="object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-awder-brun truncate">{listing.title}</p>
                          <p className="text-xs text-awder-grisbrun truncate">{listing.location?.city} · {formatPrice(listing.price)} F / {listing.pricingType === 'hourly' ? 'h' : 'nuit'}</p>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-awder-grisbrun rotate-180 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <button onClick={onAddListing} className="w-full py-4 bg-awder-brun text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 shadow-[var(--shadow-warm-md)] active:scale-[0.98] transition-all">
            <Plus className="w-5 h-5" />
            Nouvelle annonce
          </button>
        </div>
      )}

      {activeSubTab === 'calendar' && (
        <div className="space-y-8">
          {myListings.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-20 h-20 bg-awder-sable/40 rounded-full flex items-center justify-center mx-auto text-awder-grisbrun/60">
                <Calendar className="w-8 h-8" />
              </div>
              <p className="text-awder-grisbrun font-bold text-sm">Créez une annonce pour gérer ses disponibilités.</p>
            </div>
          ) : (
            <>
              {/* Sélecteur d'annonce */}
              {myListings.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {myListings.map((l: any) => (
                    <button key={l.id} onClick={() => setCalListingId(l.id)}
                      className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-tight border-2 transition-all ${calListingId === l.id ? 'bg-awder-brun border-awder-brun text-white' : 'bg-white border-awder-sable text-awder-grisbrun'}`}>
                      {l.title.slice(0, 20)}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-8 bg-white border border-awder-sable rounded-2xl shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-awder-brun">Disponibilités {calSaving && <span className="text-[10px] text-awder-ocre">· sauvegarde...</span>}</h4>
                  <Info className="w-5 h-5 text-awder-grisbrun/60" />
                </div>
                <p className="text-[10px] font-semibold text-awder-grisbrun uppercase tracking-widest text-center">{format(new Date(), 'MMMM yyyy', { locale: fr })}</p>
                <p className="text-[11px] text-awder-grisbrun font-bold text-center leading-relaxed">Touchez un jour libre pour le <strong className="text-awder-brun">bloquer</strong> (indisponible). Les jours réservés sont verrouillés.</p>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <span key={`host-calendar-day-${d}-${i}`} className="text-[10px] font-semibold text-awder-grisbrun/60 uppercase">{d}</span>
                  ))}
                  {Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const day = i + 1;
                    const booked = bookedDaysThisMonth.has(day);
                    const blocked = blockedSet.has(dayIso(day));
                    const isToday = day === now.getDate();
                    return (
                      <button
                        key={i}
                        onClick={() => toggleBlockDay(day)}
                        disabled={booked}
                        className={`aspect-square flex items-center justify-center rounded-xl text-xs font-semibold transition-all ${
                          booked ? 'bg-awder-ocre/10 text-awder-ocre border border-awder-ocre/20 cursor-not-allowed' :
                          blocked ? 'bg-awder-brun text-white shadow-lg' :
                          isToday ? 'bg-awder-gold/10 text-awder-gold border border-awder-gold/30' :
                          'bg-awder-sable/40 text-awder-grisbrun hover:bg-awder-sable'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 pt-4 border-t border-awder-sable/60">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-awder-ocre rounded-full"></div>
                    <span className="text-[10px] font-bold text-awder-grisbrun uppercase tracking-widest">Réservé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-awder-brun rounded-full"></div>
                    <span className="text-[10px] font-bold text-awder-grisbrun uppercase tracking-widest">Bloqué</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeSubTab === 'guides' && (
        <div className="space-y-8">
           <div className="space-y-4">
             <h4 className="font-semibold text-awder-brun text-xl tracking-tight px-2">Mon Guide Local</h4>
             <p className="text-sm text-awder-grisbrun font-medium px-2">Recommandez vos pépites secrètes à vos voyageurs.</p>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
             {[
               { icon: <MapPin />, title: "Restaurant Le Djenné", cat: "Restaurant", desc: "Le meilleur Tiep de la ville." },
               { icon: <Map />, title: "Marché Artisanal", cat: "Artisan", desc: "Produits authentiques sans prix touriste." }
             ].map((guide, idx) => (
               <div key={idx} className="p-6 bg-white border border-awder-sable rounded-2xl space-y-4 shadow-sm">
                 <div className="flex justify-between items-start">
                   <div className="space-y-1">
                     <span className="px-3 py-1 bg-awder-sable/40 text-awder-grisbrun text-[8px] font-semibold uppercase tracking-widest rounded-full border border-awder-sable">{guide.cat}</span>
                     <h5 className="font-semibold text-awder-brun">{guide.title}</h5>
                   </div>
                   <button className="p-2 text-awder-grisbrun/60"><X className="w-4 h-4" /></button>
                 </div>
                 <p className="text-xs text-awder-grisbrun font-medium">{guide.desc}</p>
               </div>
             ))}
             <button className="w-full py-5 border-2 border-dashed border-awder-sable rounded-2xl text-awder-grisbrun flex flex-col items-center gap-2 hover:border-awder-ocre hover:bg-awder-ocre/5 transition-all">
               <PlusCircle className="w-6 h-6" />
               <span className="text-[10px] font-semibold uppercase tracking-widest">Nouveau Lieu</span>
             </button>
           </div>
        </div>
      )}

      {activeSubTab === 'overview' && (
        <button onClick={onAddListing} className="w-full py-6 bg-awder-brun text-white rounded-full font-semibold text-lg flex items-center justify-center gap-4 shadow-2xl shadow-awder-brun/30 active:scale-95 transition-all">
          <Plus className="w-6 h-6" />
          Nouvelle Annonce
        </button>
      )}
    </div>
  );
};

const HostTabButton = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border ${active ? 'bg-awder-brun text-white border-awder-brun shadow-xl scale-105' : 'bg-white text-awder-grisbrun border-awder-sable'}`}
  >
    {icon}
    {label}
  </button>
);

const IdentityOverlay = ({ onClose, onSuccess }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setError(null);
    setLoading(true);
    try {
      const url = await uploadUserImage(file, user.uid, 'idcard');
      const uRef = doc(db, 'users', user.uid);
      await updateDoc(uRef, {
        idCardUrl: url,
        idVerificationStatus: 'pending',
        updatedAt: new Date().toISOString(),
      });
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? 'Échec de l\'upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-awder-brun/98 backdrop-blur-xl flex flex-col p-8">
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10">
        <div className="w-24 h-24 bg-awder-gold rounded-full flex items-center justify-center text-awder-brun shadow-2xl shadow-awder-gold/30">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h3 className="text-3xl font-semibold text-white tracking-tighter">Identité Koron Active</h3>
          <p className="text-white/60 text-sm font-medium px-6 leading-relaxed">
            Pour garantir la sécurité de la communauté Awder, nous vérifions l&apos;identité de chaque hôte avant sa première publication.
          </p>
          {error && <p className="text-red-300 font-bold text-xs">{error}</p>}
        </div>
        <div className="w-full space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <button
            className="w-full py-6 bg-white rounded-full font-semibold text-awder-brun flex items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl disabled:opacity-60"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? <Activity className="w-6 h-6 animate-spin" /> : <><Camera className="w-6 h-6" /> Scanner ma Pièce d&apos;Identité</>}
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 bg-white/10 text-white rounded-full font-semibold text-xs uppercase tracking-widest border border-white/20 active:scale-95 transition-all"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
};

const DiyaRatingOverlay = ({ booking, onClose, onSuccess }: any) => {
  const [rating, setRating] = useState(5);
  const [cleanliness, setCleanliness] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!auth.currentUser || !booking) {
      onSuccess();
      return;
    }
    setSaving(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ bookingId: booking.id, rating, cleanliness, communication, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l\'envoi de l\'avis.');
      onSuccess();
    } catch (e: any) {
      alert(e.message);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-awder-ocre flex flex-col overflow-y-auto">
      <div className="min-h-full flex flex-col justify-center p-7 py-12 space-y-8">
        <div className="space-y-2 text-center text-white">
          <p className="awder-label text-white/80">Système de notation · Diya</p>
          <h3 className="font-display text-4xl font-semibold tracking-tight">Comment s&apos;est passé votre séjour ?</h3>
          <p className="text-sm text-white/75 max-w-[32ch] mx-auto">Votre avis aide les prochains voyageurs. C&apos;est vous qui décidez.</p>
        </div>

        <div className="space-y-7 bg-white/10 p-7 rounded-2xl border border-white/20">
          <RatingSlider label="Global (Diya)" value={rating} onChange={setRating} />
          <RatingSlider label="Propreté" value={cleanliness} onChange={setCleanliness} />
          <RatingSlider label="Communication" value={communication} onChange={setCommunication} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Un mot sur votre séjour (optionnel)…"
            className="w-full p-4 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-white/50 text-white placeholder:text-white/50 text-sm resize-none"
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-white text-awder-ocre rounded-xl font-semibold text-base shadow-[var(--shadow-warm-lg)] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Envoyer mon avis Diya'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-full py-3.5 text-white/85 rounded-xl font-semibold text-sm border border-white/30 hover:bg-white/10 transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};

const RatingSlider = ({ label, value, onChange }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center text-white">
      <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      <span className="font-semibold text-awder-gold">{value}/5</span>
    </div>
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(i => (
        <button 
          key={i} 
          onClick={() => onChange(i)}
          className={`flex-1 h-2 rounded-full transition-all ${i <= value ? 'bg-awder-gold' : 'bg-white/20'}`}
        />
      ))}
    </div>
  </div>
);

const NotificationOverlay = ({ notifications, onClose, onMarkRead }: any) => {
  return (
    <div className="fixed inset-0 z-[300] bg-awder-brun/98 backdrop-blur-xl flex flex-col">
       <div className="p-8 flex justify-between items-center border-b border-white/10">
         <h3 className="text-2xl font-semibold text-white tracking-tighter">Notifications Awder</h3>
         <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl text-white">
           <X className="w-6 h-6" />
         </button>
       </div>
       
       <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {notifications.length > 0 ? notifications.map((n: any) => (
           <button 
            key={n.id} 
            onClick={() => onMarkRead(n.id)}
            className={`w-full p-6 rounded-2xl border text-left transition-all ${n.read ? 'bg-white/5 border-white/10' : 'bg-white border-white shadow-2xl'}`}
           >
             <div className="flex justify-between items-start gap-4">
               <div className="space-y-1">
                 <div className="flex items-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${n.type === 'booking_request' ? 'bg-awder-ocre' : n.type === 'check_out' ? 'bg-awder-brun' : 'bg-awder-gold'}`}></div>
                   <p className={`font-semibold text-[9px] uppercase tracking-widest ${n.read ? 'text-white/40' : 'text-awder-brun/60'}`}>{n.type.replace('_', ' ')}</p>
                 </div>
                 <h4 className={`font-semibold text-lg tracking-tight ${n.read ? 'text-white/60' : 'text-awder-brun'}`}>{n.title}</h4>
                 <p className={`text-sm font-medium leading-relaxed ${n.read ? 'text-white/40' : 'text-awder-grisbrun'}`}>{n.message}</p>
                 <p className="text-[10px] font-bold text-awder-grisbrun/60 uppercase tracking-widest mt-2">{format(new Date(n.createdAt), 'dd MMM, HH:mm')}</p>
               </div>
               {!n.read && <div className="w-2 h-2 bg-awder-ocre rounded-full mt-2"></div>}
             </div>
           </button>
         )) : (
           <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/10">
               <Bell className="w-10 h-10" />
             </div>
             <p className="text-white/40 font-semibold uppercase tracking-widest text-[10px]">Aucune notification</p>
           </div>
         )}
       </div>
    </div>
  );
};

const WalletOverlay = ({ wallet, transactions, onClose }: { wallet: any; transactions: any[]; onClose: () => void }) => {
  const balance = wallet?.balance ?? 0;
  const escrow = wallet?.escrow ?? 0;
  const isIncoming = (t: any) => t.type === 'escrow_release' || t.type === 'refund';
  return (
    <div className="fixed inset-0 z-[300] bg-white flex flex-col">
      <div className="p-8 flex justify-between items-center border-b border-awder-sable/60">
        <h3 className="text-3xl font-semibold text-awder-brun tracking-tighter">Mon Portefeuille</h3>
        <button onClick={onClose} className="p-3 bg-awder-sable/40 rounded-2xl text-awder-grisbrun">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Main Balance Card */}
        <div className="p-10 bg-awder-brun rounded-2xl text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform"></div>
          <div className="relative space-y-4">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.3em]">Solde Disponible</p>
            <p className="text-4xl font-semibold tracking-tighter">{formatPrice(balance)} F</p>
            {escrow > 0 && (
              <div className="pt-2 flex flex-col gap-1 border-t border-white/10 mt-3 pt-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-awder-gold" />
                  <span className="text-[10px] font-semibold text-awder-gold uppercase tracking-widest">
                    Sira-Djou : {formatPrice(escrow)} F en escrow
                  </span>
                </div>
                <p className="text-[9px] text-white/60 font-bold italic leading-relaxed">
                  Ce montant inclut les frais de séjour et la caution sous séquestre. La caution sera automatiquement reversée sur votre solde disponible 24h après la validation du check-out par l'hôte.
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <button disabled className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-semibold text-[10px] uppercase tracking-widest transition-all opacity-50 cursor-not-allowed">Recharger</button>
              <button disabled className="flex-1 py-4 bg-awder-gold rounded-2xl font-semibold text-[10px] uppercase tracking-widest transition-all opacity-50 cursor-not-allowed">Retirer</button>
            </div>
          </div>
        </div>

        {/* Recent History */}
        <div className="space-y-4">
          <h4 className="font-semibold text-awder-brun text-lg px-2">Transactions Récentes</h4>
          <div className="space-y-3">
            {transactions.length === 0 && (
              <div className="p-10 text-center text-awder-grisbrun font-bold text-sm">Aucune transaction</div>
            )}
            {transactions.map((t: any) => (
              <div key={t.id} className="p-5 bg-awder-sable/40/50 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-4">
                  <p className="font-semibold text-awder-brun text-xs truncate">{t.description}</p>
                  <p className="text-[10px] text-awder-grisbrun font-bold uppercase tracking-widest">
                    {t.createdAt ? format(new Date(t.createdAt), 'dd MMM') : ''}
                  </p>
                </div>
                <p className={`font-semibold text-sm whitespace-nowrap ${isIncoming(t) ? 'text-awder-bogolan' : 'text-awder-ocre'}`}>
                  {isIncoming(t) ? '+' : '-'}{formatPrice(t.amount)} F
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TerriyanOverlay = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const referralCode = user
    ? `AWDER-${user.uid.slice(0, 6).toUpperCase()}`
    : 'AWDER-XXXXXX';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponible */
    }
  };

  return (
  <div className="fixed inset-0 z-[300] bg-white flex flex-col">
    <div className="p-8 flex justify-between items-center border-b border-awder-sable/60">
      <div className="space-y-1">
        <h3 className="text-3xl font-semibold text-awder-brun tracking-tighter">Terriyan</h3>
        <p className="text-xs font-medium text-awder-gold italic">L&apos;amitié récompensée sur Awder</p>
      </div>
      <button onClick={onClose} className="p-3 bg-awder-sable/40 rounded-2xl text-awder-grisbrun">
        <X className="w-6 h-6" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-6 space-y-8 text-center sm:text-left">
      <div className="p-10 bg-awder-gold rounded-2xl text-white shadow-2xl relative overflow-hidden">
        <Star className="absolute top-10 right-10 w-20 h-20 text-white/20 rotate-12" />
        <div className="space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em]">Programme de Parrainage</p>
          <h4 className="text-4xl font-semibold tracking-tighter">Terriyan</h4>
          <p className="text-xs font-medium opacity-80 leading-relaxed max-w-xs mx-auto sm:mx-0">
            Partagez votre code et gagnez 5 000 F de crédit pour chaque ami qui réserve.
          </p>
        </div>
      </div>

      <div className="p-8 bg-awder-sable/40 rounded-2xl space-y-6">
        <h4 className="font-semibold text-awder-brun text-lg tracking-tight">Votre Code de Parrainage</h4>
        <div className="p-6 bg-white border-2 border-dashed border-awder-gold/30 rounded-2xl flex items-center justify-between">
          <span className="text-xl font-semibold text-awder-gold tracking-widest">{referralCode}</span>
          <button
            onClick={handleCopy}
            className="p-3 bg-awder-gold text-white rounded-xl active:scale-90 transition-all font-semibold text-[10px] uppercase tracking-widest"
          >
            {copied ? 'Copié ✓' : 'Copier'}
          </button>
        </div>
        <p className="text-[10px] text-awder-grisbrun font-medium leading-relaxed italic">
          Chaque ami qui réserve avec votre code vous offre 5 000 F de crédit Awder.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <div className="p-6 border border-awder-sable rounded-2xl flex items-center gap-6">
           <div className="w-14 h-14 bg-awder-ocre/10 rounded-full flex items-center justify-center text-awder-ocre">
             <Heart className="w-8 h-8" />
           </div>
           <div className="text-left flex-1">
             <p className="font-semibold text-awder-brun">Statut de Confiance</p>
             <p className="text-[10px] text-awder-grisbrun font-bold uppercase tracking-widest">Vérifié par la communauté</p>
           </div>
         </div>
      </div>
    </div>
  </div>
  );
};

const PersonalInfoOverlay = ({ profile, onClose }: { profile: any, onClose: () => void }) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      const uRef = doc(db, 'users', user.uid);
      await updateDoc(uRef, {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || null,
        bio: bio.trim() || null,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      alert(e.message ?? 'Erreur de mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-white flex flex-col">
      <div className="p-8 flex justify-between items-center border-b border-awder-sable/60">
        <h3 className="text-3xl font-semibold text-awder-brun tracking-tighter">Profil & Infos</h3>
        <button onClick={onClose} className="p-3 bg-awder-sable/40 rounded-2xl text-awder-grisbrun">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col items-center gap-4 pb-4">
          <div className="w-24 h-24 bg-awder-brun rounded-full flex items-center justify-center text-white text-3xl font-semibold shadow-2xl relative">
            {displayName?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-xl text-awder-brun">{displayName || 'Utilisateur Awder'}</h4>
            <p className="text-[10px] text-awder-grisbrun font-bold uppercase tracking-widest italic">{profile?.role === 'host' ? 'Hôte Koron' : 'Voyageur'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-awder-sable/40 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-awder-ocre">
              <User className="w-4 h-4" />
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Nom Complet</p>
            </div>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-transparent outline-none font-semibold text-awder-brun text-lg"
            />
          </div>

          <div className="p-6 bg-awder-sable/40 rounded-2xl space-y-2 opacity-70">
            <div className="flex items-center gap-2 text-awder-ocre">
              <Mail className="w-4 h-4" />
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Adresse Email</p>
            </div>
            <p className="font-semibold text-awder-brun text-lg">{profile?.email ?? 'Non renseigné (compte WhatsApp)'}</p>
          </div>

          <div className="p-6 bg-awder-sable/40 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-awder-ocre">
              <Phone className="w-4 h-4" />
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Numéro de Téléphone</p>
            </div>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+223 70 00 00 00"
              className="w-full bg-transparent outline-none font-semibold text-awder-brun text-lg"
            />
          </div>

          <div className="p-6 bg-awder-sable/40 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-awder-ocre">
              <FileText className="w-4 h-4" />
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Bio / Présentation</p>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Quelques mots sur vous..."
              className="w-full bg-transparent outline-none font-semibold text-awder-brun text-base resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-5 bg-awder-brun text-white rounded-2xl font-semibold shadow-xl active:scale-95 transition-all disabled:opacity-60"
        >
          {saving ? 'Enregistrement...' : saved ? '✓ Enregistré' : 'Mettre à jour mon profil'}
        </button>
      </div>
    </div>
  );
};

const SupportOverlay = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[300] bg-awder-ocre/5 backdrop-blur-xl flex items-end sm:items-center justify-center">
    <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col">
      <div className="p-10 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="text-4xl font-semibold text-awder-brun tracking-tighter tracking-tight">Support Awder</h3>
            <p className="text-xs font-medium text-awder-grisbrun italic">Disponibilité : 08h - 22h, tous les jours.</p>
          </div>
          <button onClick={onClose} className="p-3 bg-awder-sable/40 rounded-2xl text-awder-grisbrun">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <a href="https://wa.me/22370000000?text=Bonjour%20Awder%2C%20j%27ai%20besoin%20d%27aide" target="_blank" rel="noreferrer" className="w-full flex items-center gap-6 p-8 bg-awder-brun text-white rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all group">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-awder-gold">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-lg leading-tight">Chat WhatsApp</p>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">Temps moyen : 2 mins</p>
            </div>
          </a>

          <a href="tel:+22370000000" className="w-full flex items-center gap-6 p-8 bg-white border border-awder-sable rounded-2xl shadow-sm hover:border-awder-ocre active:scale-95 transition-all group">
            <div className="w-14 h-14 bg-awder-sable/40 rounded-2xl flex items-center justify-center text-awder-brun group-hover:bg-awder-ocre group-hover:text-white transition-all">
              <Phone className="w-8 h-8" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-lg text-awder-brun leading-tight">Appel Téléphonique</p>
              <p className="text-[10px] font-semibold text-awder-grisbrun/60 uppercase tracking-widest mb-1">+223 70 00 00 00</p>
            </div>
          </a>

          <a href="mailto:service@awder.com?subject=Support%20Awder" className="w-full flex items-center gap-6 p-8 bg-white border border-awder-sable rounded-2xl shadow-sm hover:border-awder-ocre active:scale-95 transition-all group">
            <div className="w-14 h-14 bg-awder-sable/40 rounded-2xl flex items-center justify-center text-awder-brun group-hover:bg-awder-ocre group-hover:text-white transition-all">
              <Mail className="w-8 h-8" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-lg text-awder-brun leading-tight">Envoyer un Ticket</p>
              <p className="text-[10px] font-semibold text-awder-grisbrun/60 uppercase tracking-widest mb-1">service@awder.com</p>
            </div>
          </a>
        </div>

        <div className="p-8 bg-awder-gold text-white rounded-2xl shadow-xl text-center flex flex-col items-center gap-3">
          <Star className="w-8 h-8 text-white/50" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] leading-relaxed">
            Votre satisfaction est notre Koron !
          </p>
        </div>
      </div>
    </div>
  </div>
);

const MessagesView = ({ myUid, onSelectChat }: { myUid: string | null; onSelectChat: (c: any) => void }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  React.useEffect(() => {
    if (!myUid) return;
    return listenToConversations(myUid, setConversations);
  }, [myUid]);

  return (
    <div className="px-6 py-10 space-y-10 pb-32">
      <div className="space-y-2">
        <h2 className="text-4xl font-semibold text-awder-brun tracking-tighter leading-none">Messages</h2>
        <p className="text-xs text-awder-grisbrun font-semibold uppercase tracking-[0.3em] italic">Discussions Awder</p>
      </div>

      {!myUid && (
        <div className="py-20 text-center">
          <p className="text-awder-grisbrun font-bold">Connectez-vous pour voir vos discussions</p>
        </div>
      )}

      {myUid && conversations.length === 0 && (
        <div className="py-20 text-center space-y-3">
          <div className="w-20 h-20 bg-awder-sable/40 rounded-full flex items-center justify-center mx-auto text-awder-grisbrun/60">
            <MessageSquare className="w-8 h-8" />
          </div>
          <p className="text-awder-grisbrun font-bold text-sm">Aucune discussion pour l'instant</p>
          <p className="text-awder-grisbrun/60 text-[10px] font-bold uppercase tracking-widest">Lancez une conversation depuis une annonce</p>
        </div>
      )}

      <div className="space-y-2">
        {conversations.map((conv) => {
          const otherUid = conv.participants.find((p) => p !== myUid) ?? '';
          const otherName = conv.participantNames?.[otherUid] ?? 'Utilisateur';
          const avatar = otherName.slice(0, 2).toUpperCase();
          return (
          <button
            key={conv.id}
            onClick={() => onSelectChat({ id: conv.id, name: otherName, avatar, otherUid })}
            className="w-full p-6 bg-white border border-awder-sable rounded-2xl flex items-center gap-5 hover:border-awder-gold transition-all group"
          >
            <div className="w-16 h-16 bg-awder-sable/40 rounded-full flex items-center justify-center font-semibold text-awder-brun text-lg border border-awder-sable group-hover:bg-awder-gold/10 group-hover:text-awder-gold transition-colors">
              {avatar}
            </div>
            <div className="flex-1 text-left space-y-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-awder-brun truncate">{otherName}</p>
                <p className="text-[9px] text-awder-grisbrun/60 font-bold uppercase tracking-widest whitespace-nowrap pl-2">
                  {conv.lastMessageAt?.toDate ? format(conv.lastMessageAt.toDate(), 'HH:mm') : ''}
                </p>
              </div>
              <p className="text-xs text-awder-grisbrun font-medium truncate max-w-[220px]">{conv.lastMessage || 'Démarrez la conversation...'}</p>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
};

const ChatOverlay = ({ chat, myUid, onClose, canFreeText = true, isHost = false }: { chat: any; myUid: string; onClose: () => void; canFreeText?: boolean; isHost?: boolean }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const sendTemplate = async (text: string) => {
    if (sending) return;
    setSending(true);
    try {
      await sendChatMessage(chat.id, myUid, text);
    } catch (e: any) {
      alert(e.message ?? 'Échec de l\'envoi.');
    } finally {
      setSending(false);
    }
  };

  React.useEffect(() => {
    if (!chat?.id) return;
    return listenToMessages(chat.id, setMessages);
  }, [chat?.id]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendChatMessage(chat.id, myUid, text);
      setInput('');
    } catch (e: any) {
      alert(e.message ?? 'Échec de l\'envoi.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-white flex flex-col">
      <header className="px-6 py-6 border-b border-awder-sable bg-white flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-awder-brun" />
          </button>
          <div>
            <p className="font-semibold text-awder-brun leading-none">{chat.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-awder-bogolan rounded-full animate-pulse"></div>
              <p className="text-[10px] font-bold text-awder-grisbrun uppercase tracking-widest">Koron Sécurité Active</p>
            </div>
          </div>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-awder-offwhite">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center py-10 space-y-4">
            <div className="w-20 h-20 bg-white border border-awder-sable rounded-full flex items-center justify-center text-2xl font-semibold text-awder-brun">
              {chat.avatar}
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-awder-brun">C&apos;est le début de votre conversation avec {chat.name}</p>
              <p className="text-[10px] text-awder-grisbrun font-bold uppercase tracking-widest italic">Envoyez le premier message</p>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === myUid;
            const when = m.createdAt?.toDate ? format(m.createdAt.toDate(), 'HH:mm') : '';
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-5 rounded-2xl ${
                  isMine
                    ? 'bg-awder-brun text-white rounded-tr-none shadow-xl shadow-awder-brun/10'
                    : 'bg-white text-awder-brun rounded-tl-none border border-awder-sable'
                }`}>
                  <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                  <p className={`text-[8px] font-semibold uppercase tracking-widest mt-2 ${isMine ? 'text-white/40' : 'text-awder-grisbrun/60'}`}>
                    {when}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </main>

      <footer className="p-5 bg-white border-t border-awder-sable sticky bottom-0">
        {canFreeText ? (
          <div className="relative flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Écrivez votre message…"
              className="flex-1 p-4 bg-awder-sable/40 border border-awder-sable rounded-xl outline-none focus:border-awder-gold font-medium text-sm text-awder-brun pr-14"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="absolute right-2 p-3 bg-awder-ocre text-white rounded-lg active:scale-90 transition-all disabled:opacity-50"
              aria-label="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11px] text-awder-grisbrun text-center leading-snug">
              <Lock className="w-3 h-3 inline mr-1 text-awder-gold" />
              Le chat libre s&apos;ouvre après une réservation payée. En attendant, utilisez les réponses rapides :
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {(isHost ? HOST_QUICK_REPLIES : PREDEFINED_QUESTIONS.map(q => `❓ ${q.text}`)).map((t, i) => (
                <button
                  key={i}
                  disabled={sending}
                  onClick={() => sendTemplate(t)}
                  className="shrink-0 max-w-[260px] px-3.5 py-2.5 bg-awder-offwhite border border-awder-sable rounded-xl text-xs font-semibold text-awder-brun text-left active:scale-[0.97] transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};

const ProfileLink = ({ icon, label, badge, highlight, onClick }: { icon: React.ReactNode, label: string, badge?: string, highlight?: boolean, onClick?: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-6 bg-white rounded-2xl border ${highlight ? 'border-awder-gold/30 bg-awder-gold/5' : 'border-awder-sable'} hover:border-awder-gold group transition-all`}>
    <div className="flex items-center gap-5 text-awder-brun/80 group-hover:text-awder-brun">
      <div className={`p-3 rounded-2xl transition-colors ${highlight ? 'bg-awder-gold text-white' : 'bg-awder-sable/40 group-hover:bg-awder-gold/10 group-hover:text-awder-gold'}`}>
        {icon}
      </div>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
    </div>
    {badge && (
      <span className="px-3 py-1 bg-red-50 text-red-500 text-[10px] font-semibold rounded-full uppercase tracking-widest">
        {badge}
      </span>
    )}
  </button>
);
