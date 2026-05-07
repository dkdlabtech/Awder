'use client';

import React, { useState } from 'react';
import { MobileLayout } from '@/components/mobile-layout';
import { SearchFilters } from '@/components/search-filters';
import { ListingCard } from '@/components/listing-card';
import { useAuth } from '@/hooks/use-auth';
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
  Heart
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { format } from 'date-fns';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';

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
    location: { city: 'Bamako', address: 'ACI 2000' },
    type: 'accommodation',
    pricingType: 'nightly',
    images: ['https://picsum.photos/seed/villa/800/600'],
    isVerified: true,
    amenities: ['Wifi', 'Piscine', 'Sécurité 24/7', 'Groupe Électrogène'],
    description: 'Une villa authentique avec tout le confort moderne. Profitez de notre piscine et de la sécurité garantie par Awder.'
  },
  {
    id: '2',
    title: 'Terrasse Ocre Horizon',
    price: 25000,
    cautionAmount: 10000,
    location: { city: 'Dakar', address: 'Ngor' },
    type: 'event',
    pricingType: 'hourly',
    images: ['https://picsum.photos/seed/terrace/800/600'],
    isVerified: true,
    amenities: ['Vue Mer', 'Espace Sonorisé', 'Wifi'],
    description: 'Le lieu parfait pour vos événements privés avec une vue imprenable sur l\'île de Ngor.'
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
    description: 'Travailler dans le calme avec une connexion haut débit garantie.'
  }
];

export default function HomeView() {
  const { user, signIn, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'bookings' | 'profile' | 'messages'>('home');
  const [userMode, setUserMode] = useState<'voyageur' | 'hote'>('voyageur');

  // Sync userMode with profile role
  React.useEffect(() => {
    if (profile?.role === 'host') {
      setTimeout(() => setUserMode('hote'), 0);
    }
  }, [profile?.role]);

  const [showAddListing, setShowAddListing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userBookings, setUserBookings] = useState<any[]>([]);
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
  const handleReleaseFunds = async (bookingId: string) => {
    setLoading(true);
    try {
      const bRef = doc(db, 'bookings', bookingId);
      await updateDoc(bRef, {
        status: 'completed',
        cautionStatus: 'released'
      });
      fetchBookings();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `bookings/${bookingId}`);
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
  const [dateRange, setDateRange] = useState<{ start: number | null, end: number | null }>({ start: null, end: null });
  const [showWallet, setShowWallet] = useState(false);
  const [showTerriyan, setShowTerriyan] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
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

  const handleBooking = async (method: 'wave' | 'orange_money' | 'moov') => {
    if (!user) return signIn();
    setLoading(true);
    try {
      const nights = (dateRange.start && dateRange.end) ? (dateRange.end - dateRange.start) : 1;
      const servicesPrice = selectedServices.reduce((acc, s) => acc + (ADD_ONS.find(a => a.id === s)?.price || 0), 0);
      const totalPrice = (selectedListing.price * nights) + servicesPrice;

      const bookingData = {
        listingId: selectedListing.id,
        listingTitle: selectedListing.title,
        hostId: 'mock-host-id',
        guestId: user.uid,
        startDate: `2026-05-${dateRange.start}`,
        endDate: `2026-05-${dateRange.end}`,
        status: 'paid_escrow',
        checkInStatus: 'pending',
        totalPrice,
        nights,
        services: selectedServices,
        cautionAmount: selectedListing.cautionAmount,
        cautionStatus: 'blocked',
        paymentMethod: method,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'bookings'), bookingData);
      
      // Trigger notification for host
      await addNotification(
        'mock-host-id', // In real app, listing.hostId
        'Nouvelle Réservation !',
        `Un voyageur a réservé "${selectedListing.title}"`,
        'booking_request'
      );

      setShowPayment(false);
      setSelectedListing(null);
      setActiveTab('bookings');
      fetchBookings();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab, user]);

  // Host Enrollment Submit
  const handleHostEnrollment = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const uRef = doc(db, 'users', user.uid);
      await updateDoc(uRef, {
        role: 'host',
        isVerified: true 
      });
      setUserMode('hote');
      setActiveTab('home');
      setShowHostForm(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      onBecomeHost={() => setShowHostForm(true)}
    >
      {activeTab === 'home' && userMode === 'voyageur' && !selectedListing && (
        <div className="space-y-6">
          <div className="px-6 pt-6 flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-awder-gold uppercase tracking-[0.3em]">Bienvenue sur Awder</p>
              <h2 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">
                Où voulez-vous <span className="text-awder-ocre">Awder</span> aujourd&apos;hui ?
              </h2>
              <p className="text-sm font-medium text-slate-400 italic">&quot;Votre chez-vous, partout chez nous.&quot;</p>
            </div>
            {profile?.role === 'host' && (
              <button 
                onClick={() => setUserMode('hote')}
                className="mb-1 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-awder-ocre flex flex-col items-center gap-1 active:scale-95 transition-all"
              >
                <Activity className="w-5 h-5 text-slate-300" />
                <span className="text-[8px] font-black uppercase tracking-widest">DASHBOARD</span>
              </button>
            )}
          </div>
          
          <SearchFilters onSearch={() => {}} />

          <div className="px-6 pb-6 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-black text-awder-brun text-lg">À la une</h3>
              <button className="text-xs font-bold text-awder-ocre underline decoration-awder-ocre/30 underline-offset-8">Voir tout</button>
            </div>
            <div className="grid grid-cols-1 gap-8">
              {MOCK_LISTINGS.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing as any} 
                  onClick={() => setSelectedListing(listing)}
                />
              ))}
            </div>
          </div>

          {/* Floating Welcome Message */}
          <AnimatePresence>
            {scrolled && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none"
              >
                <div className="bg-awder-brun text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 backdrop-blur-md border border-white/10 pointer-events-auto">
                  <div className="w-10 h-10 bg-awder-gold rounded-full flex items-center justify-center font-black text-awder-brun text-sm shadow-inner">
                    {profile?.displayName?.[0] || 'A'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black">I dansɛ, {profile?.displayName?.split(' ')[0] || 'Voyageur'} !</span>
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
            className="fixed inset-0 z-[60] bg-awder-offwhite flex flex-col"
          >
            <div className="relative h-96">
              <Image 
                src={selectedListing.images[0]} 
                alt={selectedListing.title} 
                fill 
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover"
                referrerPolicy="no-referrer"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-awder-brun/80 via-transparent to-transparent"></div>
              <button 
                onClick={() => setSelectedListing(null)}
                className="absolute top-6 left-6 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all z-10 border border-white/20"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-10 space-y-10 -mt-20 bg-awder-offwhite rounded-t-[60px] relative z-20 shadow-2xl shadow-black/20">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-4 py-1.5 bg-awder-gold/10 text-awder-gold text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-awder-gold/20">
                    {selectedListing.type === 'accommodation' ? 'Détente' : 'Événement'}
                  </span>
                  {selectedListing.isVerified && (
                    <div className="flex items-center gap-1.5 text-awder-ocre font-black text-[10px] uppercase tracking-widest">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Hôte Koron</span>
                    </div>
                  )}
                </div>
                <h1 className="text-3xl font-black text-awder-brun leading-[1.1] tracking-tighter">{selectedListing.title}</h1>
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4 text-awder-ocre" />
                  <span className="text-sm font-bold tracking-tight">{selectedListing.location.address}, {selectedListing.location.city}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm space-y-1">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none">Prix / Nuit</p>
                  <p className="text-2xl font-black text-awder-brun">{formatPrice(selectedListing.price)} F</p>
                </div>
                <div className="p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm space-y-1">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none">Caution</p>
                  <p className="text-2xl font-black text-awder-ocre">+{formatPrice(selectedListing.cautionAmount)} F</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-awder-brun text-xl tracking-tight">Description</h3>
                <p className="text-slate-500 leading-relaxed text-sm font-medium">
                  {selectedListing.description}
                </p>
              </div>

              {/* Availability Calendar */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-black text-awder-brun text-lg tracking-tight">Disponibilité</h3>
                  <div className="flex items-center gap-1 text-[10px] font-black text-awder-ocre uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    <span>Réservez maintenant</span>
                  </div>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm">
                   <div className="grid grid-cols-7 gap-2 text-center">
                     {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                       <span key={d} className="text-[8px] font-black text-slate-300 uppercase">{d}</span>
                     ))}
                     {Array.from({ length: 31 }).map((_, i) => {
                       const day = i + 1;
                       const isBooked = [14, 15, 20].includes(day);
                       const isStart = dateRange.start === day;
                       const isEnd = dateRange.end === day;
                       const isInRange = dateRange.start && dateRange.end && day > dateRange.start && day < dateRange.end;
                       
                       return (
                         <button 
                           key={i} 
                           disabled={isBooked}
                           onClick={() => {
                             if (!dateRange.start || (dateRange.start && dateRange.end)) {
                               setDateRange({ start: day, end: null });
                             } else if (day > dateRange.start) {
                               setDateRange({ ...dateRange, end: day });
                             } else {
                               setDateRange({ start: day, end: null });
                             }
                           }}
                           className={`aspect-square flex items-center justify-center rounded-xl text-[10px] font-black transition-all ${
                             isBooked ? 'bg-slate-100 text-slate-300 cursor-not-allowed' :
                             (isStart || isEnd) ? 'bg-awder-ocre text-white shadow-lg shadow-awder-ocre/20 scale-110' :
                             isInRange ? 'bg-awder-ocre/10 text-awder-ocre' :
                             'bg-slate-50 text-slate-400 hover:bg-slate-100'
                           }`}
                         >
                           {day}
                         </button>
                       );
                     })}
                   </div>
                   <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-50">
                     <div className="space-y-1">
                       <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Arrivée</p>
                       <p className="text-xs font-black text-awder-brun">{dateRange.start ? `${dateRange.start} Mai 2026` : 'À choisir'}</p>
                     </div>
                     <ArrowRight className="w-4 h-4 text-slate-200" />
                     <div className="space-y-1 text-right">
                       <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Départ</p>
                       <p className="text-xs font-black text-awder-brun">{dateRange.end ? `${dateRange.end} Mai 2026` : 'À choisir'}</p>
                     </div>
                   </div>
                </div>
              </div>

              {/* Services à la carte */}
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-black text-awder-brun text-xl tracking-tight">Services à la carte</h3>
                  <span className="text-[10px] font-black text-awder-gold bg-awder-gold/10 px-3 py-1 rounded-full uppercase tracking-widest">Extra</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {ADD_ONS.map(service => (
                    <button 
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`p-6 rounded-[32px] border flex items-center justify-between transition-all active:scale-[0.98] ${selectedServices.includes(service.id) ? 'border-awder-ocre bg-awder-ocre/5 shadow-lg shadow-awder-ocre/10' : 'border-slate-100 bg-white'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${selectedServices.includes(service.id) ? 'bg-awder-ocre text-white' : 'bg-slate-50 text-slate-400'}`}>
                          {service.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-black text-awder-brun text-sm">{service.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Géré par Awder</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-sm ${selectedServices.includes(service.id) ? 'text-awder-ocre' : 'text-awder-brun'}`}>+{formatPrice(service.price)} F</p>
                        {selectedServices.includes(service.id) && <CheckCircle2 className="w-4 h-4 text-awder-ocre ml-auto mt-1" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sira-Djou Security Banner */}
              <div className="p-8 bg-awder-ocre/5 rounded-[40px] border border-awder-ocre/10 space-y-6">
                <div className="flex gap-5">
                  <div className="p-4 bg-awder-ocre rounded-2xl text-white h-fit shadow-xl shadow-awder-ocre/20">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-awder-ocre uppercase tracking-widest">Sira-Djou (Sécurité Awder)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      Une caution de {formatPrice(selectedListing.cautionAmount)} FCFA sera retenue temporairement. Elle vous sera libérée 24h après votre départ.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-white sticky bottom-0 z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
               {(() => {
                 const nights = dateRange.start && dateRange.end ? (dateRange.end - dateRange.start) : 0;
                 const servicesPrice = selectedServices.reduce((acc, s) => acc + (ADD_ONS.find(a => a.id === s)?.price || 0), 0);
                 const totalPrice = (selectedListing.price * (nights || 1)) + servicesPrice;
                 
                 const bookedDays = [14, 15, 20];
                 const hasConflict = dateRange.start && dateRange.end && Array.from({ length: dateRange.end - dateRange.start + 1 }).some((_, i) => bookedDays.includes((dateRange.start || 0) + i));
                 
                 const alreadyBooked = userBookings.some(b => 
                   b.listingId === selectedListing.id && 
                   b.status !== 'cancelled' &&
                   b.checkInStatus !== 'checked_out'
                 );

                 return (
                   <>
                     <div className="flex justify-between items-center mb-6 px-2">
                       <div className="space-y-0.5">
                         <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Total Séjour + Services</p>
                         {nights > 0 && (
                           <p className="text-[10px] font-black text-awder-gold uppercase tracking-widest">{nights} nuits à {formatPrice(selectedListing.price)} F</p>
                         )}
                       </div>
                       <p className="text-2xl font-black text-awder-ocre">
                         {formatPrice(totalPrice)} F
                       </p>
                     </div>
                     <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mb-4 italic">
                       {hasConflict ? 'Dates indisponibles' : 'Sécurité Sira-Djou Active'}
                     </p>
                     <button 
                       onClick={() => setShowPayment(true)}
                       disabled={alreadyBooked || hasConflict || nights === 0}
                       className={`w-full py-5 rounded-full font-black flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all text-lg tracking-tight ${alreadyBooked || hasConflict || nights === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-awder-ocre text-white shadow-awder-ocre/30'}`}
                     >
                       {nights === 0 ? (
                         <>
                           <Calendar className="w-6 h-6" />
                           Choisir vos dates
                         </>
                       ) : hasConflict ? (
                         <>
                           <ShieldAlert className="w-6 h-6" />
                           Déjà réservé
                         </>
                       ) : alreadyBooked ? (
                         <>
                           <Clock className="w-6 h-6" />
                           Séjour en cours
                         </>
                       ) : (
                         <>
                           <CreditCard className="w-6 h-6" />
                           Réserver mon séjour
                         </>
                       )}
                     </button>
                   </>
                 );
               })()}
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
            className="w-full max-w-md bg-white rounded-t-[60px] p-12 space-y-10"
          >
            <div className="space-y-3 text-center">
              <div className="w-16 h-1 w-16 bg-slate-100 rounded-full mx-auto mb-6"></div>
              <h3 className="text-3xl font-black text-awder-brun tracking-tighter">Paiement Sécurisé</h3>
              <p className="text-sm text-slate-400 font-bold leading-relaxed px-4">Sélectionnez votre moyen de paiement local.</p>
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
            </div>

            <button 
              onClick={() => setShowPayment(false)}
              className="w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-awder-brun transition-colors"
              disabled={loading}
            >
              Plus tard
            </button>
            
            {loading && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-12 h-12 border-4 border-awder-ocre border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-awder-ocre uppercase tracking-[0.4em] animate-pulse">Sira-Djou en cours...</p>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {activeTab === 'home' && userMode === 'hote' && (
        <HostDashboard 
          profile={profile} 
          notifications={notifications}
          onShowNotifications={() => setShowNotifications(true)}
          onShowSupport={() => setShowSupport(true)}
          onAddListing={() => {
            if (profile?.idVerificationStatus !== 'verified') {
              setShowIdVerification(true);
            } else {
              setShowAddListing(true);
            }
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
      
      {showWallet && <WalletOverlay onClose={() => setShowWallet(false)} />}
      {showTerriyan && <TerriyanOverlay onClose={() => setShowTerriyan(false)} />}
      {showPersonalInfo && <PersonalInfoOverlay profile={profile} onClose={() => setShowPersonalInfo(false)} />}
      {showSupport && <SupportOverlay onClose={() => setShowSupport(false)} />}

      {showAddListing && (
        <AddListingOverlay 
          onClose={() => setShowAddListing(false)}
          onSuccess={() => {
            setShowAddListing(false);
            // In a real app we'd refresh the host's listings
          }}
        />
      )}

      {activeTab === 'messages' && (
        <MessagesView 
          onSelectChat={(chat: any) => setActiveChat(chat)}
        />
      )}

      {activeChat && (
        <ChatOverlay 
          chat={activeChat} 
          messages={messages}
          onClose={() => setActiveChat(null)}
          onSendMessage={(text: string) => {
            setMessages([...messages, { id: Date.now().toString(), senderId: 'me', text, timestamp: new Date().toISOString() }]);
          }}
        />
      )}

      {activeTab === 'bookings' && (
        <div className="px-6 py-10 space-y-10 pb-32">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-awder-brun tracking-tighter leading-none">Mes Réserves</h2>
            <p className="text-xs text-slate-400 font-black uppercase tracking-[0.3em] italic">An bè koun kɛ !</p>
          </div>
          
          <div className="space-y-6">
            {user && userBookings.length > 0 ? userBookings.map((booking) => (
              <motion.div 
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-8 bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h4 className="font-black text-awder-brun text-xl leading-tight tracking-tight">{booking.listingTitle}</h4>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full w-fit">
                      {booking.status === 'paid_escrow' ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-awder-gold" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-awder-gold">Sira-Djou Sécurisé</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3 h-3 text-white/60" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/60">En attente</span>
                        </>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      booking.status === 'paid_escrow' ? 'bg-awder-gold/10 text-awder-gold' : 
                      booking.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-slate-50'
                    }`}>
                      {booking.status === 'paid_escrow' ? 'Fonds Séquestrés' : 'Voyage Terminé'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-awder-brun">{formatPrice(booking.totalPrice)} F</p>
                    <div className="flex items-center justify-end gap-1 text-[8px] font-black text-green-500 uppercase tracking-widest mt-1">
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
                  <div className="p-5 bg-awder-offwhite rounded-3xl border border-slate-50 space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Caution Sira-Ocre</p>
                    <p className={`text-sm font-black ${booking.cautionStatus === 'released' ? 'text-green-500' : 'text-awder-ocre'}`}>
                      {booking.cautionStatus === 'released' ? 'LIBÉRÉE' : `${formatPrice(booking.cautionAmount)} F`}
                    </p>
                  </div>
                  <div className="p-5 bg-awder-offwhite rounded-3xl border border-slate-50 space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut Arrivée</p>
                    <p className="text-sm font-black text-awder-brun uppercase tracking-tighter">
                      {booking.checkInStatus === 'checked_in' ? 'Présent' : booking.checkInStatus === 'checked_out' ? 'Parti' : 'Attendu'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {booking.status === 'paid_escrow' && booking.checkInStatus !== 'checked_in' && (
                    <button 
                      onClick={() => {
                        const bRef = doc(db, 'bookings', booking.id);
                        updateDoc(bRef, { checkInStatus: 'checked_in' });
                        fetchBookings();
                      }}
                      disabled={loading}
                      className="flex-1 py-4 bg-awder-ocre text-white rounded-[24px] font-black flex items-center justify-center gap-2 shadow-lg shadow-awder-ocre/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                      <Download className="w-4 h-4" />
                      Check-in
                    </button>
                  )}
                  {booking.checkInStatus === 'checked_in' && (
                    <button 
                      onClick={async () => {
                        const bRef = doc(db, 'bookings', booking.id);
                        await updateDoc(bRef, { checkInStatus: 'checked_out' });
                        
                        // Trigger notification for host
                        await addNotification(
                          booking.hostId,
                          'Check-out effectué',
                          `Le voyageur a quitté "${booking.listingTitle}"`,
                          'check_out'
                        );

                        fetchBookings();
                        setShowDiyaRating(booking);
                      }}
                      disabled={loading}
                      className="flex-1 py-4 bg-awder-brun text-white rounded-[24px] font-black flex items-center justify-center gap-2 shadow-lg shadow-awder-brun/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                      <Upload className="w-4 h-4" />
                      Check-out
                    </button>
                  )}
                </div>
              </motion.div>
            )) : (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-full border border-slate-100 flex items-center justify-center text-slate-200">
                  <Calendar className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <p className="text-awder-brun font-black text-lg">Aucune réserve active</p>
                  <p className="text-slate-400 text-sm font-medium px-12 leading-relaxed">Découvrez nos lieux d&apos;exception pour commencer l&apos;aventure.</p>
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
            className="w-full max-w-sm bg-white rounded-[48px] overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={() => setViewingReceipt(null)}
              className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
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
                  <p className="text-[10px] font-black text-awder-gold uppercase tracking-[0.4em]">Reçu de Séjour</p>
                  <p className="text-xs text-slate-400 font-bold">#AW-{viewingReceipt.id.slice(0,6).toUpperCase()}</p>
                </div>
                <div className="px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-green-100 w-fit mx-auto">
                  PAYÉ
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xl font-black text-awder-brun leading-tight">{viewingReceipt.listingTitle}</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-awder-ocre" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ACI 2000, Bamako</p>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-6 space-y-4 text-sm font-bold">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Séjour (1 nuit)</span>
                    <span>{formatPrice(viewingReceipt.totalPrice)} F</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Frais Awder & Protection</span>
                    <span>{formatPrice(Math.round(viewingReceipt.totalPrice * 0.12))} F</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-lg font-black text-awder-brun">TOTAL PAYÉ</span>
                    <span className="text-lg font-black text-awder-ocre">{formatPrice(Math.round(viewingReceipt.totalPrice * 1.12))} F</span>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl space-y-2 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Dépôt de Garantie (Caution)</p>
                    <ShieldCheck className="w-4 h-4 text-awder-gold" />
                  </div>
                  <p className="text-lg font-black text-awder-brun leading-none">{formatPrice(viewingReceipt.cautionAmount)} FCFA</p>
                  <p className="text-[9px] text-slate-400 font-bold italic mt-2">Bloqué temporairement • Libéré 24h après le check-out</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 py-4 border-t border-slate-100">
                <div className="w-24 h-24 bg-white border-2 border-slate-100 p-2 rounded-2xl flex items-center justify-center opacity-40">
                  <QrCode className="w-full h-full text-awder-brun" />
                </div>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Scan pour Check-in</span>
              </div>

              <div className="pt-4 text-center space-y-6">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-awder-brun italic">&quot;Aw dansɛ ! Votre aventure commence ici.&quot;</p>
                   <p className="text-[10px] font-black text-awder-brun italic tracking-widest">ߌ ߘߊ߲߬ߛߍ߬</p>
                </div>
                
                <div className="flex justify-center gap-4">
                  <button className="flex-1 py-4 bg-awder-brun text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-awder-brun/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Enregistrer
                  </button>
                </div>
                <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">I ni ce, an bɛ koun kɛ !</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Host Inscription Form Overlay */}
      {showHostForm && (
        <div className="fixed inset-0 z-[120] bg-awder-offwhite flex flex-col">
          <header className="px-6 py-6 border-b border-slate-100 bg-white flex justify-between items-center z-10">
            <button onClick={() => setShowHostForm(false)} className="p-2 -ml-2">
              <ChevronLeft className="w-6 h-6 text-awder-brun" />
            </button>
            <h2 className="text-lg font-black text-awder-brun tracking-tight uppercase">Devenir Hôte</h2>
            <div className="w-10"></div>
          </header>
          
          <main className="flex-1 overflow-y-auto px-8 py-10 space-y-10">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">Votre Espace, <span className="text-awder-ocre">Votre Revenu</span>.</h3>
              <p className="text-sm text-slate-400 font-bold leading-relaxed">Remplissez ce formulaire pour rejoindre la famille des Hôtes Koron.</p>
            </div>

            <div className="space-y-8">
              {/* Form Section 1 */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-awder-gold uppercase tracking-[0.3em]">1. Propriétaire</p>
                <input placeholder="Nom complet" className="w-full p-5 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" />
                <input placeholder="Téléphone (WhatsApp)" className="w-full p-5 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" />
                <div className="flex bg-slate-50 p-1.5 rounded-[24px] border border-slate-100">
                  <button className="flex-1 py-3 bg-white shadow-sm rounded-xl text-xs font-black text-awder-ocre">Wave/OM</button>
                  <button className="flex-1 py-3 text-xs font-black text-slate-400">Virement</button>
                </div>
              </div>

              {/* Form Section 2 */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-awder-gold uppercase tracking-[0.3em]">2. Le Lieu</p>
                <input placeholder="Nom du lieu (ex: Villa Or)" className="w-full p-5 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Ville" className="w-full p-5 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" />
                  <input placeholder="Quartier" className="w-full p-5 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" />
                </div>
              </div>

              {/* Form Section 3 */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-awder-gold uppercase tracking-[0.3em]">3. Équipements</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-white border border-slate-100 rounded-3xl flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md border-2 border-slate-200"></div>
                    <span className="text-xs font-bold text-slate-600">Piscine</span>
                  </div>
                  <div className="p-5 bg-white border border-slate-100 rounded-3xl flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md border-2 border-awder-ocre bg-awder-ocre"></div>
                    <span className="text-xs font-bold text-awder-ocre">Wifi</span>
                  </div>
                  <div className="p-5 bg-white border border-slate-200 rounded-3xl flex items-center gap-3 col-span-2">
                    <div className="w-5 h-5 rounded-md border-2 border-awder-ocre bg-awder-ocre"></div>
                    <span className="text-xs font-bold text-awder-ocre italic">Groupe Électrogène (Recommandé)</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleHostEnrollment}
                disabled={loading}
                className="w-full py-6 bg-awder-ocre text-white rounded-full font-black text-lg shadow-2xl shadow-awder-ocre/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Soumettre ma demande'}
              </button>
            </div>
            
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-10">
              I ni ce ! Nous allons valider votre profil et vous envoyer votre accès Hôte Fondateur sous 48h.
            </p>
          </main>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="px-6 py-10 space-y-10 pb-32">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-black text-awder-brun tracking-tighter">Profil</h2>
            <button 
              onClick={() => setHostActiveTab('overview')}
              className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 active:scale-90"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
          
          <div className={`p-8 rounded-t-[50px] rounded-br-[50px] shadow-2xl relative overflow-hidden group transition-all ${profile?.role === 'host' ? 'bg-awder-ocre shadow-awder-ocre/20' : 'bg-awder-brun shadow-awder-brun/20'}`}>
            <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-[100px] opacity-20 group-hover:scale-150 transition-transform duration-1000 ${profile?.role === 'host' ? 'bg-awder-gold' : 'bg-awder-gold'}`}></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white text-3xl font-black">
                  {profile?.displayName?.[0] || 'A'}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-2xl font-black tracking-tight">{profile?.displayName || 'Awder Voyageur'}</p>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full w-fit">
                    {profile?.role === 'host' ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-awder-gold" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white"> Hôte Koron Vérifié</span>
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 text-white/60" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/90"> Voyageur Awder</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-[32px] flex gap-2">
            <button 
              onClick={() => setUserMode('voyageur')}
              className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${userMode === 'voyageur' ? 'bg-awder-brun text-white shadow-xl' : 'text-slate-400'}`}
            >
              Voyageur
            </button>
            <button 
              onClick={() => {
                if (profile?.role === 'host') {
                  setUserMode('hote');
                } else {
                  setShowHostForm(true);
                }
              }}
              className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all relative overflow-hidden ${userMode === 'hote' ? 'bg-awder-ocre text-white shadow-xl' : (profile?.role === 'host' ? 'text-awder-ocre/60' : 'text-slate-400')}`}
            >
              {profile?.role === 'host' ? (
                <div className="flex items-center justify-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Hôte Koron
                </div>
              ) : (
                "Devenir Hôte"
              )}
            </button>
          </div>

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
          </div>

          <button className="w-full py-5 bg-red-50 text-red-500 rounded-[32px] font-black border border-red-100 active:scale-95 transition-all">
            Déconnexion
          </button>
        </div>
      )}
    </MobileLayout>
  );
}

const PaymentButton = ({ method, label, color, icon, loading, onClick }: any) => (
  <button 
    disabled={loading}
    onClick={onClick}
    className="w-full flex items-center justify-between p-6 bg-slate-50 border-2 border-transparent hover:border-awder-ocre rounded-[32px] transition-all group"
  >
    <div className="flex items-center gap-5">
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/5 transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className="text-left">
        <p className="font-black text-awder-brun">{label}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Sira-Djou Inclus</p>
      </div>
    </div>
  </button>
);

const HostDashboard = ({ profile, onAddListing, onViewBooking, onSwitchMode, activeSubTab, onSubTabChange, notifications, onShowNotifications, onShowSupport }: any) => {
  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  return (
    <div className="px-6 py-10 space-y-10 pb-32">
      <div className="flex justify-between items-end">
        <div className="space-y-2 flex-1">
          <p className="text-[10px] font-black text-awder-gold uppercase tracking-[0.3em]">{activeSubTab === 'overview' ? 'Hôte Koron' : 'Annaso • ' + activeSubTab}</p>
          <h2 className="text-4xl font-black text-awder-brun tracking-tighter leading-none">
            {activeSubTab === 'overview' && 'Mes Gains Awder'}
            {activeSubTab === 'listings' && 'Mes Annonces'}
            {activeSubTab === 'calendar' && 'Calendrier Koron'}
            {activeSubTab === 'settings' && 'Paramétrage'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onSwitchMode}
            className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 flex flex-col items-center gap-1 active:scale-95 transition-all"
          >
            <User className="w-5 h-5 text-slate-300" />
            <span className="text-[8px] font-black uppercase tracking-widest">VOYAGEUR</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
        <HostTabButton icon={<Activity className="w-4 h-4" />} label="Aperçu" active={activeSubTab === 'overview'} onClick={() => onSubTabChange('overview')} />
        <HostTabButton icon={<Home className="w-4 h-4" />} label="Annonces" active={activeSubTab === 'listings'} onClick={() => onSubTabChange('listings')} />
        <HostTabButton icon={<Calendar className="w-4 h-4" />} label="Calendrier" active={activeSubTab === 'calendar'} onClick={() => onSubTabChange('calendar')} />
        <HostTabButton icon={<Settings className="w-4 h-4" />} label="Paramètres" active={activeSubTab === 'settings'} onClick={() => onSubTabChange('settings')} />
      </div>

      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm space-y-6">
            <h3 className="font-black text-awder-brun text-xl tracking-tight">Configuration Hôte</h3>
            <div className="grid grid-cols-1 gap-4">
              <ProfileLink 
                icon={<BarChart3 className="w-6 h-6" />} 
                label="Mes Gains Awder" 
                onClick={() => onSubTabChange('overview')}
              />
              <ProfileLink 
                icon={<PlusCircle className="w-6 h-6" />} 
                label="Nouvelle Annonce" 
                onClick={onAddListing}
              />
              <ProfileLink 
                icon={<ShieldCheck className="w-6 h-6" />} 
                label="Vérification d'Identité" 
                badge={profile?.idVerificationStatus === 'verified' ? 'Validé' : 'À faire'}
              />
              <ProfileLink 
                icon={<Lock className="w-6 h-6" />} 
                label="Sécurité du Logement" 
              />
              <ProfileLink 
                icon={<Headphones className="w-6 h-6" />} 
                label="Contacter Support Awder" 
                onClick={onShowSupport}
              />
            </div>
          </div>
          
          <div className="p-8 bg-awder-brun text-white rounded-[40px] shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-awder-gold" />
              <h4 className="font-black text-lg">Score Diya: 4.8/5</h4>
            </div>
            <p className="text-xs text-white/60 font-medium">Votre accueil est légendaire ! Continuez ainsi pour rester Hôte Koron.</p>
          </div>
        </div>
      )}

      {activeSubTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-8 bg-awder-ocre rounded-[40px] space-y-2 shadow-2xl shadow-awder-ocre/20 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl group-hover:scale-150 transition-transform"></div>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest uppercase">Mes Gains Awder</p>
              <p className="text-2xl font-black">{formatPrice(profile?.totalGains || 450000)} F</p>
              <div className="flex items-center gap-1 text-white/80 font-black text-[10px]">
                <TrendingUp className="w-3 h-3" />
                <span>+12% vs Mars</span>
              </div>
            </div>
            <div className="p-8 bg-white border border-slate-100 rounded-[40px] space-y-2 shadow-sm relative overflow-hidden group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest select-none">Nouvelle Awder</p>
              <p className="text-2xl font-black text-awder-brun leading-none">12</p>
              <div className="flex items-center gap-1 text-awder-gold font-black text-[10px]">
                <Activity className="w-3 h-3" />
                <span>8 confirmées</span>
              </div>
            </div>
          </div>

          {/* Fil d'Activité / Notifications Log */}
          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-black text-awder-brun text-xl tracking-tight">Fil d&apos;Activité Hôte</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-awder-ocre animate-pulse"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Direct</span>
              </div>
            </div>
            <div className="space-y-4">
              {notifications && notifications.length > 0 ? notifications.slice(0, 5).map((n: any) => (
                <div 
                  key={n.id}
                  className={`p-6 rounded-[32px] border transition-all ${n.read ? 'bg-slate-50 border-transparent opacity-60' : 'bg-white border-awder-ocre/10 shadow-lg shadow-awder-ocre/5'}`}
                >
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-2xl h-fit ${n.type === 'booking_request' ? 'bg-awder-ocre text-white' : n.type === 'check_out' ? 'bg-awder-brun text-white' : 'bg-awder-gold text-white'}`}>
                      {n.type === 'booking_request' ? <Calendar className="w-4 h-4" /> : n.type === 'check_out' ? <ArrowUpRight className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-black text-awder-brun text-sm tracking-tight">{n.title}</h4>
                        <span className="text-[8px] font-black text-slate-300 uppercase">{format(new Date(n.createdAt), 'HH:mm')}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-10 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Calme plat sur Awder...</p>
                  <p className="text-[9px] text-slate-400 font-medium mt-2 italic">Vos notifications de gestion s&apos;afficheront ici.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'listings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {MOCK_LISTINGS.map((listing) => (
              <div key={listing.id} className="p-6 bg-white border border-slate-100 rounded-[40px] space-y-4 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden relative border border-slate-100">
                    <Image src={listing.images[0]} alt={listing.title} fill className="object-cover" referrerPolicy="no-referrer" />
                  </div>
              <div className="flex-1 space-y-1">
                    <h4 className="font-black text-awder-brun">{listing.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">{listing.location.city}</p>
                    <p className="text-[10px] font-black text-awder-ocre uppercase tracking-widest italic">Mes Annonces Awder</p>
                    <p className="text-sm font-black text-awder-brun tracking-tighter mt-1">{formatPrice(listing.price)} F / nuit</p>
                  </div>
                  <button className="p-3 self-start bg-slate-50 rounded-2xl text-slate-400">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 py-3 bg-awder-brun/5 text-awder-brun font-black text-[10px] uppercase tracking-widest rounded-2xl border border-awder-brun/10">Statistiques</button>
                  <button className="flex-1 py-3 bg-awder-gold/5 text-awder-gold font-black text-[10px] uppercase tracking-widest rounded-2xl border border-awder-gold/10">Promotion</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onAddListing} className="w-full py-6 bg-awder-brun text-white rounded-[32px] font-black text-lg flex items-center justify-center gap-4 shadow-2xl shadow-awder-brun/30 active:scale-95 transition-all">
            <Plus className="w-6 h-6" />
            Nouvelle Annonce
          </button>
        </div>
      )}

      {activeSubTab === 'calendar' && (
        <div className="space-y-8">
          <div className="p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-awder-brun">Gestion des Disponibilités</h4>
              <Info className="w-5 h-5 text-slate-300" />
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                <span key={d} className="text-[10px] font-black text-slate-300 uppercase">{d}</span>
              ))}
              {Array.from({ length: 31 }).map((_, i) => (
                <button 
                  key={i} 
                  className={`aspect-square flex items-center justify-center rounded-xl text-xs font-black transition-all ${[5, 12, 13, 22].includes(i+1) ? 'bg-awder-ocre/10 text-awder-ocre border border-awder-ocre/20' : i === 14 ? 'bg-awder-brun text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="flex gap-4 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-awder-ocre rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Réservé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-awder-brun rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bloqué</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-awder-gold/5 border border-awder-gold/20 rounded-[40px] space-y-4">
             <div className="flex items-center gap-3">
               <TrendingUp className="w-6 h-6 text-awder-gold" />
               <h4 className="font-black text-awder-brun">Tarification Automatisée</h4>
             </div>
             <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
               &quot;En fonction de la demande à ACI 2000 ce week-end, nous suggérons d&apos;ajuster votre prix à 52.000 F (+15%).&quot;
             </p>
             <button className="px-6 py-3 bg-awder-gold text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-awder-gold/20">Appliquer</button>
          </div>
        </div>
      )}

      {activeSubTab === 'guides' && (
        <div className="space-y-8">
           <div className="space-y-4">
             <h4 className="font-black text-awder-brun text-xl tracking-tight px-2">Mon Guide Local</h4>
             <p className="text-sm text-slate-400 font-medium px-2">Recommandez vos pépites secrètes à vos voyageurs.</p>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
             {[
               { icon: <MapPin />, title: "Restaurant Le Djenné", cat: "Restaurant", desc: "Le meilleur Tiep de la ville." },
               { icon: <Map />, title: "Marché Artisanal", cat: "Artisan", desc: "Produits authentiques sans prix touriste." }
             ].map((guide, idx) => (
               <div key={idx} className="p-6 bg-white border border-slate-100 rounded-[32px] space-y-4 shadow-sm">
                 <div className="flex justify-between items-start">
                   <div className="space-y-1">
                     <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-slate-100">{guide.cat}</span>
                     <h5 className="font-black text-awder-brun">{guide.title}</h5>
                   </div>
                   <button className="p-2 text-slate-300"><X className="w-4 h-4" /></button>
                 </div>
                 <p className="text-xs text-slate-400 font-medium">{guide.desc}</p>
               </div>
             ))}
             <button className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 flex flex-col items-center gap-2 hover:border-awder-ocre hover:bg-awder-ocre/5 transition-all">
               <PlusCircle className="w-6 h-6" />
               <span className="text-[10px] font-black uppercase tracking-widest">Nouveau Lieu</span>
             </button>
           </div>
        </div>
      )}

      {activeSubTab === 'overview' && (
        <button onClick={onAddListing} className="w-full py-6 bg-awder-brun text-white rounded-full font-black text-lg flex items-center justify-center gap-4 shadow-2xl shadow-awder-brun/30 active:scale-95 transition-all">
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
    className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border ${active ? 'bg-awder-brun text-white border-awder-brun shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100'}`}
  >
    {icon}
    {label}
  </button>
);

const IdentityOverlay = ({ onClose, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-[200] bg-awder-brun/98 backdrop-blur-xl flex flex-col p-8">
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10">
        <div className="w-24 h-24 bg-awder-gold rounded-full flex items-center justify-center text-awder-brun shadow-2xl shadow-awder-gold/30">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h3 className="text-3xl font-black text-white tracking-tighter">Identité Koron Active</h3>
          <p className="text-white/60 text-sm font-medium px-6 leading-relaxed">
            Pour garantir la sécurité de la communauté Awder, nous vérifions l&apos;identité de chaque hôte avant sa première publication.
          </p>
        </div>
        <div className="w-full space-y-4">
          <button 
            className="w-full py-6 bg-white rounded-full font-black text-awder-brun flex items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl"
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                setLoading(false);
                onSuccess();
              }, 2000);
            }}
          >
            {loading ? <Activity className="w-6 h-6 animate-spin" /> : <><Camera className="w-6 h-6" /> Scanner ma Pièce d&apos;Identité</>}
          </button>
          <button 
            onClick={onClose} 
            className="w-full py-4 bg-white/10 text-white rounded-full font-black text-xs uppercase tracking-widest border border-white/20 active:scale-95 transition-all"
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
  
  return (
    <div className="fixed inset-0 z-[200] bg-awder-ocre/98 backdrop-blur-xl flex flex-col p-8">
      <div className="flex-1 flex flex-col justify-center space-y-10">
        <div className="space-y-2 text-center text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Système de Notation</p>
          <h3 className="text-4xl font-black tracking-tighter">Diya Rating</h3>
        </div>
        
        <div className="space-y-8 bg-white/10 p-10 rounded-[48px] border border-white/20">
          <RatingSlider label="Global (Diya)" value={rating} onChange={setRating} />
          <RatingSlider label="Propreté" value={cleanliness} onChange={setCleanliness} />
          <RatingSlider label="Communication" value={communication} onChange={setCommunication} />
        </div>

        <button 
          onClick={onSuccess}
          className="w-full py-6 bg-white text-awder-ocre rounded-full font-black text-lg shadow-2xl active:scale-95 transition-all"
        >
          Valider la Note Diya
        </button>
      </div>
    </div>
  );
};

const RatingSlider = ({ label, value, onChange }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center text-white">
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <span className="font-black text-awder-gold">{value}/5</span>
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
         <h3 className="text-2xl font-black text-white tracking-tighter">Notifications Awder</h3>
         <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl text-white">
           <X className="w-6 h-6" />
         </button>
       </div>
       
       <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {notifications.length > 0 ? notifications.map((n: any) => (
           <button 
            key={n.id} 
            onClick={() => onMarkRead(n.id)}
            className={`w-full p-6 rounded-[32px] border text-left transition-all ${n.read ? 'bg-white/5 border-white/10' : 'bg-white border-white shadow-2xl'}`}
           >
             <div className="flex justify-between items-start gap-4">
               <div className="space-y-1">
                 <div className="flex items-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${n.type === 'booking_request' ? 'bg-awder-ocre' : n.type === 'check_out' ? 'bg-awder-brun' : 'bg-awder-gold'}`}></div>
                   <p className={`font-black text-[9px] uppercase tracking-widest ${n.read ? 'text-white/40' : 'text-awder-brun/60'}`}>{n.type.replace('_', ' ')}</p>
                 </div>
                 <h4 className={`font-black text-lg tracking-tight ${n.read ? 'text-white/60' : 'text-awder-brun'}`}>{n.title}</h4>
                 <p className={`text-sm font-medium leading-relaxed ${n.read ? 'text-white/40' : 'text-slate-500'}`}>{n.message}</p>
                 <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">{format(new Date(n.createdAt), 'dd MMM, HH:mm')}</p>
               </div>
               {!n.read && <div className="w-2 h-2 bg-awder-ocre rounded-full mt-2"></div>}
             </div>
           </button>
         )) : (
           <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/10">
               <Bell className="w-10 h-10" />
             </div>
             <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Aucune notification</p>
           </div>
         )}
       </div>
    </div>
  );
};

const WalletOverlay = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[300] bg-white flex flex-col">
    <div className="p-8 flex justify-between items-center border-b border-slate-50">
      <h3 className="text-3xl font-black text-awder-brun tracking-tighter">Mon Portefeuille</h3>
      <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-slate-400">
        <X className="w-6 h-6" />
      </button>
    </div>
    
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      {/* Main Balance Card */}
      <div className="p-10 bg-awder-brun rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform"></div>
        <div className="relative space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Solde Total Disponible</p>
          <p className="text-4xl font-black tracking-tighter">158 500 F</p>
          <div className="flex gap-2 pt-4">
            <button className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Recharger</button>
            <button className="flex-1 py-4 bg-awder-gold rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Retirer</button>
          </div>
        </div>
      </div>

      {/* Linked Accounts */}
      <div className="space-y-4">
        <h4 className="font-black text-awder-brun text-lg px-2">Comptes Liés</h4>
        <div className="grid grid-cols-1 gap-3">
          {[
            { label: 'Orange Money', color: 'bg-orange-500', balance: '45k F' },
            { label: 'Moov Money', color: 'bg-blue-600', balance: '12k F' },
            { label: 'Wave', color: 'bg-sky-400', balance: '101k F' }
          ].map(acc => (
            <div key={acc.label} className="p-6 bg-white border border-slate-100 rounded-[32px] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${acc.color} rounded-2xl`}></div>
                <div>
                  <p className="font-black text-awder-brun text-sm">{acc.label}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connecté</p>
                </div>
              </div>
              <p className="font-black text-awder-brun">{acc.balance}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent History */}
      <div className="space-y-4">
        <h4 className="font-black text-awder-brun text-lg px-2">Transactions Récentes</h4>
        <div className="space-y-3">
          {[
            { label: 'Réservation Maison Koron', date: 'Hier', amount: '-45 000 F', type: 'out' },
            { label: 'Transfert Wave', date: '28 Avr', amount: '+50 000 F', type: 'in' },
            { label: 'Caution Libérée', date: '25 Avr', amount: '+15 000 F', type: 'in' }
          ].map((t, i) => (
            <div key={i} className="p-5 bg-slate-50/50 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-black text-awder-brun text-xs">{t.label}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.date}</p>
              </div>
              <p className={`font-black text-sm ${t.type === 'in' ? 'text-green-500' : 'text-awder-ocre'}`}>{t.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const TerriyanOverlay = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[300] bg-white flex flex-col">
    <div className="p-8 flex justify-between items-center border-b border-slate-50">
      <div className="space-y-1">
        <h3 className="text-3xl font-black text-awder-brun tracking-tighter">Terriyan</h3>
        <p className="text-xs font-medium text-awder-gold italic">L&apos;amitié récompensée sur Awder</p>
      </div>
      <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-slate-400">
        <X className="w-6 h-6" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-6 space-y-8 text-center sm:text-left">
      <div className="p-10 bg-awder-gold rounded-[40px] text-white shadow-2xl relative overflow-hidden">
        <Star className="absolute top-10 right-10 w-20 h-20 text-white/20 rotate-12" />
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Niveau Actuel</p>
          <h4 className="text-4xl font-black tracking-tighter">Terriyan Koron</h4>
          <p className="text-xs font-medium opacity-80 leading-relaxed max-w-xs mx-auto sm:mx-0">
            Vous avez parrainé 5 amis et économisé 25 000 F en frais de service !
          </p>
        </div>
      </div>

      <div className="p-8 bg-slate-50 rounded-[40px] space-y-6">
        <h4 className="font-black text-awder-brun text-lg tracking-tight">Votre Code de Parrainage</h4>
        <div className="p-6 bg-white border-2 border-dashed border-awder-gold/30 rounded-3xl flex items-center justify-between">
          <span className="text-xl font-black text-awder-gold tracking-widest">AWDER-BKO-2026</span>
          <button className="p-3 bg-awder-gold text-white rounded-xl active:scale-90 transition-all font-black text-[10px] uppercase tracking-widest">Copier</button>
        </div>
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
          Chaque ami qui réserve avec votre code vous offre 5 000 F de crédit Awder.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <div className="p-6 border border-slate-100 rounded-[32px] flex items-center gap-6">
           <div className="w-14 h-14 bg-awder-ocre/10 rounded-full flex items-center justify-center text-awder-ocre">
             <Heart className="w-8 h-8" />
           </div>
           <div className="text-left flex-1">
             <p className="font-black text-awder-brun">Statut de Confiance</p>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vérifié par la communauté</p>
           </div>
         </div>
      </div>
    </div>
  </div>
);

const PersonalInfoOverlay = ({ profile, onClose }: { profile: any, onClose: () => void }) => (
  <div className="fixed inset-0 z-[300] bg-white flex flex-col">
    <div className="p-8 flex justify-between items-center border-b border-slate-50">
      <h3 className="text-3xl font-black text-awder-brun tracking-tighter">Profil & Infos</h3>
      <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-slate-400">
        <X className="w-6 h-6" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-col items-center gap-4 pb-4">
        <div className="w-24 h-24 bg-awder-brun rounded-full flex items-center justify-center text-white text-3xl font-black shadow-2xl relative">
          {profile?.name?.charAt(0) || 'A'}
          <button className="absolute bottom-0 right-0 p-2 bg-awder-gold text-white rounded-full border-4 border-white">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center">
          <h4 className="font-black text-xl text-awder-brun">{profile?.name || 'Utilisateur Awder'}</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Membre depuis Avril 2026</p>
        </div>
      </div>

      <div className="space-y-4">
        {[
          { label: 'Nom Complet', value: profile?.name, icon: <User className="w-4 h-4" /> },
          { label: 'Adresse Email', value: profile?.email, icon: <Mail className="w-4 h-4" /> },
          { label: 'Numéro de Téléphone', value: '+223 70 00 00 00', icon: <Phone className="w-4 h-4" /> },
          { label: 'Bio / Présentation', value: 'Adore voyager et découvrir le Mali.', icon: <FileText className="w-4 h-4" /> }
        ].map((field, i) => (
          <div key={i} className="p-6 bg-slate-50 rounded-[32px] space-y-2 border border-transparent hover:border-awder- gold transition-all">
            <div className="flex items-center gap-2 text-awder-ocre">
              {field.icon}
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{field.label}</p>
            </div>
            <p className="font-black text-awder-brun text-lg">{field.value || 'Non renseigné'}</p>
          </div>
        ))}
      </div>

      <button className="w-full py-5 bg-awder-brun text-white rounded-[32px] font-black shadow-xl active:scale-95 transition-all">
        Mettre à jour mon profil
      </button>
    </div>
  </div>
);

const SupportOverlay = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[300] bg-awder-ocre/5 backdrop-blur-xl flex items-end sm:items-center justify-center">
    <div className="bg-white w-full max-w-lg rounded-t-[50px] sm:rounded-[50px] shadow-[0_-20px_60px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col">
      <div className="p-10 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="text-4xl font-black text-awder-brun tracking-tighter tracking-tight">Support Awder</h3>
            <p className="text-xs font-medium text-slate-500 italic">Disponibilité : 08h - 22h, tous les jours.</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button className="w-full flex items-center gap-6 p-8 bg-awder-brun text-white rounded-[32px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all group">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-awder-gold">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="text-left">
              <p className="font-black text-lg leading-tight">Démarrer un Chat</p>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Temps moyen : 2 mins</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-6 p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:border-awder-ocre active:scale-95 transition-all group">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-awder-brun group-hover:bg-awder-ocre group-hover:text-white transition-all">
              <Phone className="w-8 h-8" />
            </div>
            <div className="text-left">
              <p className="font-black text-lg text-awder-brun leading-tight">Appel Téléphonique</p>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">+223 70 00 00 00</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-6 p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:border-awder-ocre active:scale-95 transition-all group">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-awder-brun group-hover:bg-awder-ocre group-hover:text-white transition-all">
              <Mail className="w-8 h-8" />
            </div>
            <div className="text-left">
              <p className="font-black text-lg text-awder-brun leading-tight">Envoyer un Ticket</p>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">service@awder.com</p>
            </div>
          </button>
        </div>

        <div className="p-8 bg-awder-gold text-white rounded-[40px] shadow-xl text-center flex flex-col items-center gap-3">
          <Star className="w-8 h-8 text-white/50" />
          <p className="text-xs font-black uppercase tracking-[0.2em] leading-relaxed">
            Votre satisfaction est notre Koron !
          </p>
        </div>
      </div>
    </div>
  </div>
);

const MessagesView = ({ onSelectChat }: any) => {
  const MOCK_CHATS = [
    { id: '1', name: 'Moussa Traoré', lastMsg: 'I ni ce ! C est possible de...', time: '14:30', avatar: 'MT', unread: 2 },
    { id: '2', name: 'Alou Maïga', lastMsg: 'Merci beaucoup !', time: 'Hier', avatar: 'AM', unread: 0 },
    { id: '3', name: 'Fatou Diallo', lastMsg: 'A quelle heure pour le check-in ?', time: 'Hier', avatar: 'FD', unread: 0 },
  ];

  return (
    <div className="px-6 py-10 space-y-10 pb-32">
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-awder-brun tracking-tighter leading-none">Messages</h2>
        <p className="text-xs text-slate-400 font-black uppercase tracking-[0.3em] italic">Discussions Awder</p>
      </div>

      <div className="space-y-2">
        {MOCK_CHATS.map((chat) => (
          <button 
            key={chat.id} 
            onClick={() => onSelectChat(chat)}
            className="w-full p-6 bg-white border border-slate-100 rounded-[32px] flex items-center gap-5 hover:border-awder-gold transition-all group"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center font-black text-awder-brun text-lg border border-slate-100 group-hover:bg-awder-gold/10 group-hover:text-awder-gold transition-colors">
              {chat.avatar}
            </div>
            <div className="flex-1 text-left space-y-1">
              <div className="flex justify-between items-center">
                <p className="font-black text-awder-brun">{chat.name}</p>
                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">{chat.time}</p>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[180px]">{chat.lastMsg}</p>
            </div>
            {chat.unread > 0 && (
              <div className="w-6 h-6 bg-awder-ocre rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-awder-ocre/20">
                {chat.unread}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const ChatOverlay = ({ chat, messages, onClose, onSendMessage }: any) => {
  const [input, setInput] = useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed inset-0 z-[130] bg-white flex flex-col">
      <header className="px-6 py-6 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-awder-brun" />
          </button>
          <div>
            <p className="font-black text-awder-brun leading-none">{chat.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En ligne</p>
            </div>
          </div>
        </div>
        <button className="p-3 bg-slate-50 rounded-2xl">
          <Settings className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-awder-offwhite">
        <div className="flex flex-col items-center py-10 space-y-4">
          <div className="w-20 h-20 bg-white border border-slate-100 rounded-full flex items-center justify-center text-2xl font-black text-awder-brun">
            {chat.avatar}
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-black text-awder-brun">C&apos;est le début de votre conversation avec {chat.name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Koron Sécurité Active</p>
          </div>
        </div>

        {messages.map((m: any) => (
          <div key={m.id} className={`flex ${m.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-5 rounded-[28px] ${
              m.senderId === 'me' 
                ? 'bg-awder-brun text-white rounded-tr-none shadow-xl shadow-awder-brun/10' 
                : 'bg-white text-awder-brun rounded-tl-none border border-slate-100'
            }`}>
              <p className="text-sm font-medium leading-relaxed">{m.text}</p>
              <p className={`text-[8px] font-black uppercase tracking-widest mt-2 ${m.senderId === 'me' ? 'text-white/40' : 'text-slate-300'}`}>
                {format(new Date(m.timestamp), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
      </main>

      <footer className="p-6 bg-white border-t border-slate-100 sticky bottom-0">
        <div className="relative flex items-center gap-3">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (onSendMessage(input), setInput(''))}
            placeholder="Écrivez votre message..." 
            className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-sm text-awder-brun pr-16"
          />
          <button 
            onClick={() => {
              if (input.trim()) {
                onSendMessage(input);
                setInput('');
              }
            }}
            className="absolute right-2 p-4 bg-awder-ocre text-white rounded-2xl shadow-lg shadow-awder-ocre/20 active:scale-90 transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};

const AddListingOverlay = ({ onClose, onSuccess }: any) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [listingData, setListingData] = useState({
    title: '',
    address: '',
    city: '',
    neighborhood: '',
    price: 45000,
    cautionAmount: 15000,
    type: 'accommodation' as 'accommodation' | 'event'
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const { profile } = useAuth();

  // Pre-fill host data asynchronously to avoid cascading renders
  React.useEffect(() => {
    if (profile) {
      setTimeout(() => {
        setListingData(prev => ({
          ...prev,
          title: profile.displayName ? `Logement de ${profile.displayName.split(' ')[0]}` : '',
          city: 'Bamako', 
          neighborhood: 'ACI 2000'
        }));
      }, 0);
    }
  }, [profile]);

  const handlePublish = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const finalData = {
        hostId: auth.currentUser?.uid,
        title: listingData.title || (listingData.type === 'accommodation' ? 'Logement Premium' : 'Espace Événementiel'),
        price: Number(listingData.price),
        cautionAmount: Number(listingData.cautionAmount),
        location: { 
          city: listingData.city || 'Bamako', 
          address: listingData.address || 'ACI 2000',
          neighborhood: listingData.neighborhood || ''
        },
        type: listingData.type,
        pricingType: listingData.type === 'accommodation' ? 'nightly' : 'hourly',
        images: images.length > 0 ? images : ['https://picsum.photos/seed/new/800/600'],
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'listings'), finalData);
      onSuccess();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'listings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-awder-offwhite flex flex-col">
      <header className="px-6 py-6 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm">
        <button onClick={onClose} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-awder-brun" />
        </button>
        <div className="flex flex-col items-center">
          <p className="text-[10px] font-black text-awder-gold uppercase tracking-[0.3em]">Étape {step} / 4</p>
          <h2 className="text-sm font-black text-awder-brun tracking-tight uppercase">Nouvelle Annonce</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-10 space-y-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">On commence <span className="text-awder-ocre">par le début</span>.</h3>
                <p className="text-sm text-slate-400 font-bold leading-relaxed">Quel type d&apos;espace proposez-vous ?</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => {
                    setListingData({ ...listingData, type: 'accommodation' });
                    setStep(2);
                  }}
                  className={`p-8 border-2 rounded-[40px] text-left space-y-2 shadow-xl transition-all ${listingData.type === 'accommodation' ? 'border-awder-gold bg-awder-gold/5 shadow-awder-gold/5' : 'border-slate-100 bg-white'}`}
                >
                  <div className="w-12 h-12 bg-awder-gold/10 rounded-2xl flex items-center justify-center text-awder-gold">
                    <Home className="w-6 h-6" />
                  </div>
                  <p className="font-black text-awder-brun">Logement Complet</p>
                  <p className="text-xs text-slate-400 font-medium">Villa, Appartement, Studio...</p>
                </button>
                <button 
                  onClick={() => {
                    setListingData({ ...listingData, type: 'event' });
                    setStep(2);
                  }}
                  className={`p-8 border-2 rounded-[40px] text-left space-y-2 transition-all ${listingData.type === 'event' ? 'border-awder-gold bg-awder-gold/5 shadow-awder-gold/5' : 'border-slate-100 bg-white'}`}
                >
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <p className="font-black text-awder-brun">Espace Événementiel</p>
                  <p className="text-xs text-slate-400 font-medium">Terrasse, Salle, Jardin...</p>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">Où se trouve <span className="text-awder-ocre">votre pépite</span> ?</h3>
                <p className="text-sm text-slate-400 font-bold leading-relaxed">Précisez l&apos;emplacement exact.</p>
              </div>
              <div className="space-y-4">
                <input 
                  placeholder="Nom de l'annonce (ex: Villa Mandingue)" 
                  value={listingData.title}
                  onChange={(e) => setListingData({ ...listingData, title: e.target.value })}
                  className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" 
                />
                <input 
                  placeholder="Adresse exacte" 
                  value={listingData.address}
                  onChange={(e) => setListingData({ ...listingData, address: e.target.value })}
                  className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    placeholder="Ville" 
                    value={listingData.city}
                    onChange={(e) => setListingData({ ...listingData, city: e.target.value })}
                    className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" 
                  />
                  <input 
                    placeholder="Quartier" 
                    value={listingData.neighborhood}
                    onChange={(e) => setListingData({ ...listingData, neighborhood: e.target.value })}
                    className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" 
                  />
                </div>
                <button onClick={() => setStep(3)} className="w-full py-6 bg-awder-brun text-white rounded-full font-black text-lg shadow-xl shadow-awder-brun/20">Continuer</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">Mettez votre lieu <span className="text-awder-ocre">en valeur</span>.</h3>
                <p className="text-sm text-slate-400 font-bold leading-relaxed">Ajoutez au moins 3 photos de qualité.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="aspect-square bg-white border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-awder-gold hover:bg-awder-gold/5 transition-all">
                  <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                  <Camera className="w-6 h-6 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajouter</span>
                </label>
                
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-[32px] overflow-hidden group">
                    <Image 
                      src={img} 
                      alt="Preview" 
                      fill 
                      sizes="(max-width: 768px) 50vw, 200px"
                      className="object-cover" 
                    />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setStep(4)} 
                disabled={images.length === 0}
                className={`w-full py-6 rounded-full font-black text-lg transition-all ${images.length > 0 ? 'bg-awder-brun text-white shadow-xl shadow-awder-brun/20' : 'bg-slate-100 text-slate-300'}`}
              >
                Continuer
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">On parle <span className="text-awder-ocre">argent</span>.</h3>
                <p className="text-sm text-slate-400 font-bold leading-relaxed">Définissez vos tarifs de base.</p>
              </div>
              <div className="space-y-4">
                <div className="p-8 bg-white border border-slate-100 rounded-[40px] space-y-4 shadow-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix par Nuit (FCFA)</p>
                    <input 
                      type="number" 
                      value={listingData.price}
                      onChange={(e) => setListingData({ ...listingData, price: Number(e.target.value) })}
                      className="w-full text-4xl font-black text-awder-brun bg-transparent outline-none" 
                    />
                  </div>
                  <div className="pt-4 border-t border-slate-50 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caution Sira-Djou (FCFA)</p>
                    <input 
                      type="number" 
                      value={listingData.cautionAmount}
                      onChange={(e) => setListingData({ ...listingData, cautionAmount: Number(e.target.value) })}
                      className="w-full text-2xl font-black text-awder-ocre bg-transparent outline-none" 
                    />
                  </div>
                </div>
                <button 
                  onClick={handlePublish}
                  disabled={loading}
                  className="w-full py-6 bg-awder-ocre text-white rounded-full font-black text-lg shadow-2xl shadow-awder-ocre/30 flex items-center justify-center gap-3"
                >
                  {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      Publier l&apos;annonce
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const ProfileLink = ({ icon, label, badge, highlight, onClick }: { icon: React.ReactNode, label: string, badge?: string, highlight?: boolean, onClick?: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-6 bg-white rounded-[32px] border ${highlight ? 'border-awder-gold/30 bg-awder-gold/5' : 'border-slate-100'} hover:border-awder-gold group transition-all`}>
    <div className="flex items-center gap-5 text-slate-600 group-hover:text-awder-brun">
      <div className={`p-3 rounded-2xl transition-colors ${highlight ? 'bg-awder-gold text-white' : 'bg-slate-50 group-hover:bg-awder-gold/10 group-hover:text-awder-gold'}`}>
        {icon}
      </div>
      <span className="text-sm font-black tracking-tight">{label}</span>
    </div>
    {badge && (
      <span className="px-3 py-1 bg-red-50 text-red-500 text-[10px] font-black rounded-full uppercase tracking-widest">
        {badge}
      </span>
    )}
  </button>
);
