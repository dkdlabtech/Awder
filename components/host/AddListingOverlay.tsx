'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/hooks/use-auth';
import { db, auth } from '@/lib/firebase';
import { addDoc, doc, collection, updateDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { uploadListingImages, uploadVoiceNote } from '@/lib/upload';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';
import {
  ChevronLeft, Home as HomeIcon, Calendar, Camera, X, CheckCircle2, Loader2, MapPin, Mic, Square, Trash2,
  Zap, Droplets, Wifi, UtensilsCrossed, Plus, TrendingUp, Send, CreditCard, RotateCcw
} from 'lucide-react';
import KYCForm from '@/components/kyc/KYCForm';
import { formatPrice } from '@/lib/utils';
import { MapPicker } from '@/components/ui/MapPicker';

interface AddListingOverlayProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // Brouillon ou annonce à modifier
}

type HostTip = { name: string; kind: 'plat' | 'resto' | 'marche' | 'experience'; note: string };

const TOTAL_STEPS = 5;

/** Construit l'état du formulaire depuis un doc Firestore (brouillon ou annonce). */
function stateFromDoc(d: any) {
  return {
    title: d?.title || '',
    description: d?.description || '',
    address: d?.location?.address || '',
    city: d?.location?.city || 'Bamako',
    neighborhood: d?.location?.neighborhood || 'ACI 2000',
    price: d?.price || 45000,
    cautionAmount: d?.cautionAmount ?? 15000,
    type: d?.type || 'accommodation',
    amenities: d?.amenities || [],
    coordinates: d?.location?.coordinates || null,
    directions: d?.location?.directions || d?.directions || '',
    taxiInstructions: d?.location?.taxiInstructions || '',
    hasGenerator: d?.infrastructure?.hasGenerator ?? false,
    hasWaterReserve: d?.infrastructure?.hasWaterReserve ?? false,
    wifiSpeedMbps: d?.infrastructure?.wifiSpeedMbps ?? 0,
    cancellationPolicy: d?.cancellationPolicy ?? 'moderate',
    voiceNoteUrl: d?.location?.voiceNoteUrl ?? '',
    bookingMode: (d?.bookingMode as 'instant' | 'request') ?? 'instant',
    hostTips: (d?.hostTips as HostTip[]) ?? [],
    capacity: d?.capacity ?? 2,
    bedrooms: d?.bedrooms ?? 1,
    // ✨ Champs spécifiques « Salle d'événements »
    eventEquipment: (d?.eventEquipment as string[]) ?? [],
    eventEquipmentExtra: d?.eventEquipmentExtra ?? '',
    eventRules: d?.eventRules ?? '',
  };
}

// Inventaire type d'une salle d'événements (checklist)
const EVENT_EQUIPMENT = ['Sonorisation', 'Éclairage scénique', 'Chaises', 'Tables', 'Scène / Podium', 'Vidéoprojecteur', 'Écran', 'Climatisation', 'Groupe électrogène', 'Cuisine / Traiteur', 'Vestiaire', 'Parking', 'Sécurité / Gardien', 'Décoration'];

export function AddListingOverlay({ onClose, onSuccess, initialData }: AddListingOverlayProps) {
  const { profile } = useAuth();

  const [step, setStep] = useState(initialData ? (initialData.lastStep || 2) : 1);
  const [loading, setLoading] = useState(false);
  const [showKyc, setShowKyc] = useState(false);
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Brouillon repris automatiquement (si pas d'initialData explicite)
  const [resumableDraft, setResumableDraft] = useState<any>(null);

  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [listingData, setListingData] = useState(stateFromDoc(initialData));

  // Id du doc Firestore — créé dès l'étape 1 pour l'autosave
  const draftIdRef = React.useRef<string | null>(initialData?.id ?? null);
  const [hasDraft, setHasDraft] = useState<boolean>(!!initialData?.id);

  React.useEffect(() => {
    if (profile && !initialData) {
      setTimeout(() => {
        setListingData(prev => ({
          ...prev,
          title: prev.title || (profile.displayName ? `Logement de ${profile.displayName.split(' ')[0]}` : ''),
        }));
      }, 0);
    }
  }, [profile, initialData]);

  /* ✨ Reprise de brouillon : au montage, si nouvelle annonce, chercher un draft existant */
  React.useEffect(() => {
    if (initialData || !auth.currentUser) return;
    (async () => {
      try {
        const q = query(
          collection(db, 'listings'),
          where('hostId', '==', auth.currentUser!.uid),
          where('moderationStatus', '==', 'draft'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
          setResumableDraft(d);
        }
      } catch { /* silencieux : la reprise est un bonus */ }
    })();
  }, [initialData]);

  const resumeDraft = () => {
    if (!resumableDraft) return;
    draftIdRef.current = resumableDraft.id;
    setHasDraft(true);
    setListingData(stateFromDoc(resumableDraft));
    setImages((resumableDraft.images || []).filter((u: string) => u.startsWith('https://')));
    setStep(resumableDraft.lastStep || 2);
    setResumableDraft(null);
  };

  const discardDraftPrompt = () => setResumableDraft(null);

  /** % de complétion réel du brouillon. */
  const completion = React.useMemo(() => {
    let score = 0;
    if (listingData.type) score += 15;
    if (listingData.title && listingData.address) score += 20;
    if (listingData.description) score += 20;
    if (images.length > 0) score += 25;
    if (listingData.price > 0) score += 20;
    return Math.min(100, score);
  }, [listingData, images]);

  /** Payload Firestore commun (sans images). */
  const buildPayload = React.useCallback((status: 'draft' | 'published', existingUrls: string[], voiceUrl: string) => {
    const autoBadges: string[] = [];
    if (listingData.hasGenerator) autoBadges.push('sans_coupure_elec');
    if (listingData.hasWaterReserve) autoBadges.push('sans_coupure_eau');
    if (Number(listingData.wifiSpeedMbps) >= 20) autoBadges.push('wifi_pro');

    return {
      hostId: auth.currentUser!.uid,
      hostName: profile?.displayName || 'Hôte Awder',
      title: listingData.title || (listingData.type === 'accommodation' ? 'Logement Premium' : 'Espace Événementiel'),
      description: listingData.description || '',
      price: Number(listingData.price),
      cautionAmount: Number(listingData.cautionAmount),
      location: {
        city: listingData.city || 'Bamako',
        address: listingData.address || 'ACI 2000',
        neighborhood: listingData.neighborhood || '',
        coordinates: listingData.coordinates,
        directions: listingData.directions || '',
        taxiInstructions: listingData.taxiInstructions || '',
        voiceNoteUrl: voiceUrl || '',
      },
      cancellationPolicy: listingData.cancellationPolicy || 'moderate',
      directions: listingData.directions || '',
      infrastructure: {
        hasGenerator: !!listingData.hasGenerator,
        hasWaterReserve: !!listingData.hasWaterReserve,
        wifiSpeedMbps: Number(listingData.wifiSpeedMbps) || 0,
      },
      badges: autoBadges,
      images: existingUrls,
      type: listingData.type,
      pricingType: listingData.type === 'accommodation' ? 'nightly' : 'hourly',
      amenities: listingData.amenities,
      /* ✨ Capacité d'accueil */
      capacity: Number(listingData.capacity) || 1,
      bedrooms: Number(listingData.bedrooms) || 0,
      /* ✨ Salle d'événements */
      eventEquipment: listingData.eventEquipment,
      eventEquipmentExtra: listingData.eventEquipmentExtra || '',
      eventRules: listingData.eventRules || '',
      /* ✨ Mode de réservation choisi par l'hôte */
      bookingMode: listingData.bookingMode,
      /* ✨ Bons plats à côté — bonnes adresses de l'hôte */
      hostTips: listingData.hostTips,
      // isVerified est contrôlé UNIQUEMENT par l'admin (jamais envoyé par le client).
      isActive: false,
      moderationStatus: status === 'published' ? 'pending_review' : 'draft',
      lastStep: step,
      completion,
    };
  }, [listingData, profile, initialData, step, completion]);

  /* ✨ AUTOSAVE — crée le draft dès la 1re avancée, puis sauvegarde (debounce 1.2 s) */
  const autosaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosave = React.useCallback(() => {
    if (!auth.currentUser) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        setAutosaveState('saving');
        const existingUrls = images.filter((u) => u.startsWith('https://'));
        const payload = { ...buildPayload('draft', existingUrls, listingData.voiceNoteUrl), updatedAt: new Date().toISOString() };
        // Ne pas rétrograder une annonce déjà publiée en brouillon
        if (initialData?.moderationStatus && initialData.moderationStatus !== 'draft') {
          delete (payload as any).moderationStatus;
        }
        if (draftIdRef.current) {
          await updateDoc(doc(db, 'listings', draftIdRef.current), payload);
        } else {
          const ref = await addDoc(collection(db, 'listings'), { ...payload, createdAt: new Date().toISOString() });
          draftIdRef.current = ref.id;
          setHasDraft(true);
        }
        setAutosaveState('saved');
      } catch {
        setAutosaveState('idle');
      }
    }, 1200);
  }, [buildPayload, images, listingData.voiceNoteUrl, initialData]);

  // Autosave à chaque modification après la 1re étape
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (step >= 2 || draftIdRef.current) autosave();
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [listingData, step, autosave]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const arr = Array.from(files);
      const previews = arr.map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...previews]);
      setImageFiles(prev => [...prev, ...arr]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  /* ✨ Enregistreur de note vocale d'itinéraire */
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string>(listingData.voiceNoteUrl || '');
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setVoiceBlob(blob);
        setVoicePreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      alert("Micro indisponible. Vérifiez les autorisations du navigateur.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const clearVoice = () => {
    setVoiceBlob(null);
    setVoicePreviewUrl('');
    setListingData((p: any) => ({ ...p, voiceNoteUrl: '' }));
  };

  /* Capture GPS → la carte s'affiche pour AJUSTER le pin avant de valider */
  const captureGPS = () => {
    if (!navigator.geolocation) { setStep(3); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setListingData(prev => ({
          ...prev,
          coordinates: { lat: position.coords.latitude, lng: position.coords.longitude }
        }));
        setLoading(false);
      },
      (error) => {
        console.warn("GPS ignoré ou refusé :", error);
        setLoading(false);
        setStep(3); // sans GPS on continue quand même
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  /* Sauvegarde finale (publication ou brouillon explicite) */
  const handleSave = async (status: 'draft' | 'published', skipKycCheck = false) => {
    if (!profile || !auth.currentUser) return;

    if (status === 'published' && !skipKycCheck) {
      const kycStatus = profile?.idVerificationStatus;
      if (kycStatus === 'pending') {
        alert("Votre dossier KYC est en cours d'examen par l'équipe Awder. Vous pourrez publier dès qu'il sera approuvé.");
        return;
      }
      if (kycStatus !== 'verified') {
        setShowKyc(true);
        return;
      }
    }

    setLoading(true);
    try {
      const existingUrls = images.filter((u) => u.startsWith('https://'));

      let voiceUrl = listingData.voiceNoteUrl || '';
      if (voiceBlob) {
        try {
          voiceUrl = await uploadVoiceNote(voiceBlob, auth.currentUser.uid + '-' + Date.now());
        } catch (err) {
          console.warn('Upload note vocale échoué (non bloquant):', err);
        }
      }

      const baseData = buildPayload(status, existingUrls, voiceUrl);
      let docId = draftIdRef.current;

      if (docId) {
        await updateDoc(doc(db, 'listings', docId), { ...baseData, updatedAt: new Date().toISOString() });
      } else {
        const docRef = await addDoc(collection(db, 'listings'), { ...baseData, createdAt: new Date().toISOString() });
        docId = docRef.id;
        draftIdRef.current = docId;
      }

      let imageUrls: string[] = existingUrls;
      if (imageFiles.length > 0) {
        const newImageUrls = await uploadListingImages(imageFiles, docId);
        imageUrls = [...existingUrls, ...newImageUrls];
        await updateDoc(doc(db, 'listings', docId), { images: imageUrls });
      } else if (status === 'published' && imageUrls.length === 0) {
        imageUrls = ['https://picsum.photos/seed/new/800/600'];
        await updateDoc(doc(db, 'listings', docId), { images: imageUrls });
      }

      onSuccess();
    } catch (e) {
      handleFirestoreError(e, draftIdRef.current ? OperationType.UPDATE : OperationType.CREATE, 'listings');
    } finally {
      setLoading(false);
    }
  };

  /* ✨ Simulateur de revenus (étape prix) */
  const revenueEstimate = React.useMemo(() => {
    const price = Number(listingData.price) || 0;
    const isNightly = listingData.type === 'accommodation';
    const unitsPerMonth = isNightly ? 15 : 40; // hypothèse : 50 % d'occupation / ~10 créneaux semaine
    return { monthly: price * unitsPerMonth, units: unitsPerMonth, isNightly };
  }, [listingData.price, listingData.type]);

  const inputCls = "w-full p-4 bg-white border border-awder-sable rounded-xl outline-none focus:border-awder-gold font-medium text-awder-brun placeholder:text-awder-grisbrun/60";

  return (
    <div className="fixed inset-0 z-[150] bg-awder-offwhite flex flex-col">
      <header className="px-5 py-4 border-b border-awder-sable bg-white flex justify-between items-center">
        <button
          onClick={() => showKyc ? setShowKyc(false) : onClose()}
          className="p-2 -ml-2"
          aria-label="Fermer"
        >
          <ChevronLeft className="w-6 h-6 text-awder-brun" />
        </button>

        {showKyc ? (
          <h2 className="text-sm font-semibold text-awder-brun">Vérification requise</h2>
        ) : (
          <div className="flex flex-col items-center">
            <p className="awder-label text-awder-gold">Étape {step} / {TOTAL_STEPS}</p>
            <h2 className="text-sm font-semibold text-awder-brun">
              {hasDraft ? "Votre annonce" : "Nouvelle annonce"}
            </h2>
          </div>
        )}

        {/* Indicateur d'autosave */}
        <div className="w-16 text-right">
          {autosaveState === 'saving' && <span className="awder-label text-awder-grisbrun">Sauve…</span>}
          {autosaveState === 'saved' && <span className="awder-label text-awder-bogolan">Sauvé</span>}
        </div>
      </header>

      {/* Barre de progression réelle */}
      {!showKyc && (
        <div className="h-1 bg-awder-sable">
          <div className="h-full bg-awder-gold transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
      )}

      {/* ✨ Bandeau de reprise de brouillon */}
      <AnimatePresence>
        {resumableDraft && !showKyc && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-5 mt-4 p-4 bg-white border border-awder-gold/40 rounded-2xl shadow-[var(--shadow-warm-sm)] flex items-center gap-3"
          >
            <span className="w-10 h-10 shrink-0 rounded-xl bg-awder-gold/15 text-awder-gold grid place-items-center">
              <RotateCcw className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-awder-brun truncate">Reprendre « {resumableDraft.title || 'votre annonce'} » ?</p>
              <p className="text-xs text-awder-grisbrun">Brouillon complété à {resumableDraft.completion ?? 40} %</p>
            </div>
            <button onClick={resumeDraft} className="px-3.5 py-2 bg-awder-ocre text-white rounded-lg text-xs font-semibold shrink-0">Reprendre</button>
            <button onClick={discardDraftPrompt} className="p-2 text-awder-grisbrun" aria-label="Ignorer"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
        {showKyc ? (
          <motion.div key="kyc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <KYCForm
              userId={auth.currentUser!.uid}
              triggeredByPublication={true}
              onComplete={() => {
                setShowKyc(false);
                handleSave('published', true);
              }}
              onCancel={() => setShowKyc(false)}
            />
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Étape 1 — Type */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">
                <div className="space-y-1.5">
                  <h3 className="text-[28px] font-semibold text-awder-brun leading-tight tracking-tight">
                    On commence <span className="text-awder-ocre italic">par le début</span>.
                  </h3>
                  <p className="text-sm text-awder-grisbrun">Quel type d&apos;espace proposez-vous ?</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { type: 'accommodation', label: 'Logement complet', desc: 'Villa, appartement, studio…', icon: <HomeIcon className="w-6 h-6" /> },
                    { type: 'event', label: 'Espace événementiel', desc: 'Terrasse, salle, jardin…', icon: <Calendar className="w-6 h-6" /> },
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => { setListingData(p => ({ ...p, type: opt.type as any })); setStep(2); }}
                      className={`p-6 border rounded-2xl text-left space-y-2 shadow-[var(--shadow-warm-sm)] transition-all ${listingData.type === opt.type ? 'border-awder-gold bg-awder-gold/5' : 'border-awder-sable bg-white'}`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${listingData.type === opt.type ? 'bg-awder-gold/12 text-awder-gold' : 'bg-awder-sable/60 text-awder-grisbrun'}`}>
                        {opt.icon}
                      </div>
                      <p className="font-semibold text-awder-brun">{opt.label}</p>
                      <p className="text-xs text-awder-grisbrun">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Étape 2 — Localisation et GPS */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">
                <h3 className="text-[28px] font-semibold text-awder-brun leading-tight tracking-tight">
                  Où se trouve <span className="text-awder-ocre italic">votre pépite</span> ?
                </h3>
                <div className="space-y-3.5">
                  <input
                    placeholder="Nom de l'annonce (ex : Villa Mandingue)"
                    value={listingData.title}
                    onChange={(e) => setListingData(p => ({ ...p, title: e.target.value }))}
                    className={inputCls}
                  />
                  <input
                    placeholder="Adresse exacte"
                    value={listingData.address}
                    onChange={(e) => setListingData(p => ({ ...p, address: e.target.value }))}
                    className={inputCls}
                  />
                  <div className="grid grid-cols-2 gap-3.5">
                    <input placeholder="Ville" value={listingData.city} onChange={(e) => setListingData(p => ({ ...p, city: e.target.value }))} className={inputCls} />
                    <input placeholder="Quartier" value={listingData.neighborhood} onChange={(e) => setListingData(p => ({ ...p, neighborhood: e.target.value }))} className={inputCls} />
                  </div>

                  {!listingData.coordinates ? (
                    <>
                      <button
                        onClick={captureGPS}
                        disabled={loading}
                        className="w-full py-4 bg-awder-brun text-white rounded-xl font-semibold text-base shadow-[var(--shadow-warm-md)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <>
                            <MapPin className="w-5 h-5" />
                            Capturer ma position
                          </>
                        )}
                      </button>
                      <p className="text-xs text-center text-awder-grisbrun mt-1">
                        La position exacte n&apos;est montrée aux voyageurs qu&apos;après paiement sécurisé.
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="awder-label text-awder-gold">Ajustez le pin si besoin, puis validez</p>
                      <MapPicker
                        lat={listingData.coordinates.lat}
                        lng={listingData.coordinates.lng}
                        onChange={(c) => setListingData((p: any) => ({ ...p, coordinates: c }))}
                      />
                      <div className="flex gap-2">
                        <button onClick={captureGPS} disabled={loading}
                          className="flex-1 py-3 border border-awder-sable rounded-xl text-sm font-semibold text-awder-grisbrun">
                          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Recapturer'}
                        </button>
                        <button onClick={() => setStep(3)}
                          className="flex-[2] py-3 bg-awder-brun text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                          <CheckCircle2 className="w-4 h-4" /> Valider l&apos;emplacement
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Étape 3 — Description + équipements + garanties + accès + annulation + bons plats */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">
                <h3 className="text-[28px] font-semibold text-awder-brun leading-tight tracking-tight">
                  Racontez <span className="text-awder-ocre italic">votre lieu</span>.
                </h3>
                <div className="space-y-4">
                  {/* ✨ Capacité d'accueil — adaptée au type */}
                  {listingData.type === 'event' ? (
                    <div className="p-4 bg-white border border-awder-sable rounded-2xl space-y-1.5">
                      <p className="awder-label text-awder-grisbrun">Capacité d&apos;accueil (personnes max)</p>
                      <input
                        type="number" min={1}
                        value={listingData.capacity}
                        onChange={(e) => setListingData((p: any) => ({ ...p, capacity: Number(e.target.value) }))}
                        className="w-full text-3xl font-display font-semibold text-awder-brun bg-transparent outline-none"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="p-4 bg-white border border-awder-sable rounded-2xl space-y-1.5">
                        <p className="awder-label text-awder-grisbrun">Voyageurs max</p>
                        <input
                          type="number" min={1}
                          value={listingData.capacity}
                          onChange={(e) => setListingData((p: any) => ({ ...p, capacity: Number(e.target.value) }))}
                          className="w-full text-2xl font-display font-semibold text-awder-brun bg-transparent outline-none"
                        />
                      </div>
                      <div className="p-4 bg-white border border-awder-sable rounded-2xl space-y-1.5">
                        <p className="awder-label text-awder-grisbrun">Chambres</p>
                        <input
                          type="number" min={0}
                          value={listingData.bedrooms}
                          onChange={(e) => setListingData((p: any) => ({ ...p, bedrooms: Number(e.target.value) }))}
                          className="w-full text-2xl font-display font-semibold text-awder-brun bg-transparent outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <textarea
                    placeholder="Décrivez votre espace, son ambiance, ses points forts…"
                    value={listingData.description}
                    onChange={(e) => setListingData(p => ({ ...p, description: e.target.value }))}
                    rows={5}
                    className={`${inputCls} resize-none`}
                  />
                  <div className="space-y-3">
                    <p className="awder-label text-awder-grisbrun">Équipements</p>
                    <div className="flex flex-wrap gap-2">
                      {['Wifi', 'Climatisation', 'Piscine', 'Parking', 'Cuisine équipée', 'TV', 'Sécurité 24/7', 'Groupe Électrogène', 'Eau chaude', 'Sono', 'Éclairage', 'Projecteur HD', 'Visioconférence'].map((a) => {
                        const selected = listingData.amenities.includes(a);
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setListingData((p: any) => ({ ...p, amenities: selected ? p.amenities.filter((x: string) => x !== a) : [...p.amenities, a] }))}
                            className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${selected ? 'bg-awder-gold border-awder-gold text-awder-brun-deep' : 'bg-white border-awder-sable text-awder-grisbrun'}`}
                          >
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ✨ Module Salle d'événements — inventaire + consignes */}
                  {listingData.type === 'event' && (
                    <>
                      <div className="space-y-3 pt-2">
                        <div>
                          <p className="awder-label text-awder-gold">Inventaire du matériel inclus</p>
                          <p className="text-xs text-awder-grisbrun mt-1">Cochez ce qui est fourni avec la salle.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {EVENT_EQUIPMENT.map((eq) => {
                            const on = listingData.eventEquipment.includes(eq);
                            return (
                              <button
                                key={eq}
                                type="button"
                                onClick={() => setListingData((p: any) => ({ ...p, eventEquipment: on ? p.eventEquipment.filter((x: string) => x !== eq) : [...p.eventEquipment, eq] }))}
                                className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${on ? 'bg-awder-ocre/10 border-awder-ocre/40 text-awder-ocre' : 'bg-white border-awder-sable text-awder-grisbrun'}`}
                              >
                                {eq}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          placeholder="Autre matériel (ex : 200 chaises Chiavari, 20 tables rondes)"
                          value={listingData.eventEquipmentExtra}
                          onChange={(e) => setListingData((p: any) => ({ ...p, eventEquipmentExtra: e.target.value }))}
                          className={`${inputCls} text-sm`}
                        />
                      </div>

                      <div className="space-y-2 pt-2">
                        <div>
                          <p className="awder-label text-awder-gold">Consignes &amp; règlement</p>
                          <p className="text-xs text-awder-grisbrun mt-1">Vos conditions d&apos;utilisation (horaires, bruit, nettoyage, interdictions…).</p>
                        </div>
                        <textarea
                          rows={4}
                          placeholder="Ex : Musique jusqu'à minuit. Nettoyage à la charge du locataire. Pas de pétards. Caution récupérée après état des lieux."
                          value={listingData.eventRules}
                          onChange={(e) => setListingData((p: any) => ({ ...p, eventRules: e.target.value }))}
                          className={`${inputCls} resize-none text-sm`}
                        />
                      </div>
                    </>
                  )}

                  {/* ✨ Garanties Awder (Sira-Yiriwa) */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="awder-label text-awder-gold">Garanties Awder · Sira-Yiriwa</p>
                      <p className="text-xs text-awder-grisbrun mt-1">Ces garanties rassurent énormément les voyageurs.</p>
                    </div>
                    {[
                      { key: 'hasGenerator' as const, icon: <Zap className="w-4 h-4" />, title: "Sans coupure d'électricité", sub: 'Groupe électrogène ou solaire' },
                      { key: 'hasWaterReserve' as const, icon: <Droplets className="w-4 h-4" />, title: "Sans coupure d'eau", sub: "Château d'eau / réserve / suppresseur" },
                    ].map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setListingData((p: any) => ({ ...p, [g.key]: !p[g.key] }))}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${listingData[g.key] ? 'border-awder-gold bg-awder-gold/5' : 'border-awder-sable bg-white'}`}
                      >
                        <div className="text-left flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-lg grid place-items-center ${listingData[g.key] ? 'bg-awder-gold/15 text-awder-gold' : 'bg-awder-sable/60 text-awder-grisbrun'}`}>{g.icon}</span>
                          <div>
                            <p className="font-semibold text-sm text-awder-brun">{g.title}</p>
                            <p className="text-xs text-awder-grisbrun">{g.sub}</p>
                          </div>
                        </div>
                        <div className={`w-11 h-6 rounded-full p-0.5 transition-all shrink-0 ${listingData[g.key] ? 'bg-awder-gold' : 'bg-awder-sable'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full transition-all ${listingData[g.key] ? 'translate-x-5' : ''}`} />
                        </div>
                      </button>
                    ))}
                    <div className="p-4 bg-white border border-awder-sable rounded-2xl space-y-2">
                      <p className="font-semibold text-sm text-awder-brun flex items-center gap-2"><Wifi className="w-4 h-4 text-awder-gold" /> Débit wifi (Mbps)</p>
                      <input
                        type="number"
                        min={0}
                        placeholder="Ex : 25 (laissez 0 si pas de wifi)"
                        value={listingData.wifiSpeedMbps || ''}
                        onChange={(e) => setListingData((p: any) => ({ ...p, wifiSpeedMbps: Number(e.target.value) }))}
                        className="w-full p-3 bg-awder-sable/40 border border-awder-sable rounded-xl outline-none focus:border-awder-gold font-medium text-awder-brun text-sm"
                      />
                      <p className="text-xs text-awder-grisbrun">≥ 20 Mbps = badge « Wifi Pro » pour les voyageurs d&apos;affaires.</p>
                    </div>
                  </div>

                  {/* ✨ Indications d'accès */}
                  <div className="space-y-3 pt-2">
                    <p className="awder-label text-awder-gold">Indications d&apos;accès</p>
                    <textarea
                      placeholder='Repères visuels : « derrière la pharmacie Koulouba, portail vert à 50 m du grand manguier »'
                      value={listingData.directions}
                      onChange={(e) => setListingData((p: any) => ({ ...p, directions: e.target.value }))}
                      rows={3}
                      className={`${inputCls} resize-none text-sm`}
                    />
                    <input
                      placeholder="Instructions pour le taxi (ex : dire « ACI 2000, rue 390 »)"
                      value={listingData.taxiInstructions}
                      onChange={(e) => setListingData((p: any) => ({ ...p, taxiInstructions: e.target.value }))}
                      className={`${inputCls} text-sm`}
                    />

                    {/* ✨ Note vocale d'itinéraire */}
                    <div className="p-4 bg-white border border-awder-sable rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-awder-ocre" />
                        <p className="font-semibold text-sm text-awder-brun">Note vocale d&apos;itinéraire</p>
                      </div>
                      <p className="text-xs text-awder-grisbrun leading-relaxed">Décrivez le chemin à voix haute — le voyageur pourra l&apos;écouter.</p>
                      {!voicePreviewUrl ? (
                        <button
                          type="button"
                          onClick={recording ? stopRecording : startRecording}
                          className={`w-full py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-awder-ocre/10 text-awder-ocre'}`}
                        >
                          {recording ? <><Square className="w-4 h-4" /> Arrêter</> : <><Mic className="w-4 h-4" /> Enregistrer</>}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <audio controls src={voicePreviewUrl} className="flex-1 h-10" />
                          <button type="button" onClick={clearVoice} className="p-3 bg-red-50 text-red-500 rounded-xl" aria-label="Supprimer la note vocale">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✨ Bons plats à côté — bonnes adresses de l'hôte */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="awder-label text-awder-gold">Bons plats à côté</p>
                      <p className="text-xs text-awder-grisbrun mt-1">Vos bonnes adresses autour du lieu — très utile pour la diaspora qui ne connaît pas le quartier.</p>
                    </div>
                    {listingData.hostTips.map((tip: HostTip, idx: number) => (
                      <div key={idx} className="p-4 bg-white border border-awder-sable rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="w-8 h-8 rounded-lg bg-awder-ocre/10 text-awder-ocre grid place-items-center"><UtensilsCrossed className="w-4 h-4" /></span>
                          <button type="button" onClick={() => setListingData((p: any) => ({ ...p, hostTips: p.hostTips.filter((_: any, i: number) => i !== idx) }))} className="p-1.5 text-awder-grisbrun" aria-label="Retirer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          placeholder="Nom (ex : Chez Fanta — tigadèguèna)"
                          value={tip.name}
                          onChange={(e) => setListingData((p: any) => ({ ...p, hostTips: p.hostTips.map((t: HostTip, i: number) => i === idx ? { ...t, name: e.target.value } : t) }))}
                          className={`${inputCls} text-sm p-3`}
                        />
                        <div className="flex gap-2">
                          {(['plat', 'resto', 'marche', 'experience'] as const).map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setListingData((p: any) => ({ ...p, hostTips: p.hostTips.map((t: HostTip, i: number) => i === idx ? { ...t, kind: k } : t) }))}
                              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${tip.kind === k ? 'bg-awder-ocre/10 border-awder-ocre/40 text-awder-ocre' : 'bg-white border-awder-sable text-awder-grisbrun'}`}
                            >
                              {k === 'plat' ? 'Plat' : k === 'resto' ? 'Resto' : k === 'marche' ? 'Marché' : 'Expérience'}
                            </button>
                          ))}
                        </div>
                        <input
                          placeholder="Note (ex : à 5 min à pied, ~2 500 F)"
                          value={tip.note}
                          onChange={(e) => setListingData((p: any) => ({ ...p, hostTips: p.hostTips.map((t: HostTip, i: number) => i === idx ? { ...t, note: e.target.value } : t) }))}
                          className={`${inputCls} text-sm p-3`}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setListingData((p: any) => ({ ...p, hostTips: [...p.hostTips, { name: '', kind: 'resto', note: '' }] }))}
                      className="w-full py-3 border border-dashed border-awder-grisbrun/40 rounded-xl text-awder-grisbrun text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Ajouter une bonne adresse
                    </button>
                  </div>

                  {/* ✨ Politique d'annulation */}
                  <div className="space-y-3 pt-2">
                    <p className="awder-label text-awder-gold">Politique d&apos;annulation</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'flexible', label: 'Flexible', desc: 'Remboursement intégral jusqu\'à 24 h avant.' },
                        { id: 'moderate', label: 'Modérée', desc: 'Remboursement 50 % si annulation < 48 h.' },
                        { id: 'strict', label: 'Stricte', desc: 'Aucun remboursement < 7 jours avant.' },
                      ].map((pol) => (
                        <button
                          key={pol.id}
                          type="button"
                          onClick={() => setListingData((p: any) => ({ ...p, cancellationPolicy: pol.id }))}
                          className={`p-4 rounded-2xl border text-left transition-all ${listingData.cancellationPolicy === pol.id ? 'border-awder-gold bg-awder-gold/5' : 'border-awder-sable bg-white'}`}
                        >
                          <p className="font-semibold text-sm text-awder-brun">{pol.label}</p>
                          <p className="text-xs text-awder-grisbrun">{pol.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setStep(4)} className="w-full py-4 bg-awder-brun text-white rounded-xl font-semibold text-base shadow-[var(--shadow-warm-md)] active:scale-[0.98] transition-all">Continuer</button>
                </div>
              </motion.div>
            )}

            {/* Étape 4 — Photos */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">
                <div className="space-y-1.5">
                  <h3 className="text-[28px] font-semibold text-awder-brun leading-tight tracking-tight">
                    Mettez votre lieu <span className="text-awder-ocre italic">en valeur</span>.
                  </h3>
                  <p className="text-sm text-awder-grisbrun">Conseil : 5 photos minimum, lumière naturelle. La première devient votre couverture.</p>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <label className="aspect-square bg-white border border-dashed border-awder-grisbrun/40 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-awder-gold transition-colors">
                    <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                    <Camera className="w-6 h-6 text-awder-grisbrun" />
                    <span className="awder-label text-awder-grisbrun">Ajouter</span>
                  </label>
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="Aperçu" className="absolute inset-0 w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-awder-brun/70 text-white rounded-full text-[10px] font-semibold backdrop-blur-sm">Couverture</span>
                      )}
                      <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all" aria-label="Retirer la photo">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(5)} disabled={images.length === 0} className={`w-full py-4 rounded-xl font-semibold text-base transition-all active:scale-[0.98] ${images.length > 0 ? 'bg-awder-brun text-white shadow-[var(--shadow-warm-md)]' : 'bg-awder-sable text-awder-grisbrun'}`}>
                  Continuer
                </button>
              </motion.div>
            )}

            {/* Étape 5 — Prix, mode de réservation, publication */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">
                <h3 className="text-[28px] font-semibold text-awder-brun leading-tight tracking-tight">
                  On parle <span className="text-awder-ocre italic">argent</span>.
                </h3>
                <div className="space-y-5">
                  <div className="p-6 bg-white border border-awder-sable rounded-2xl space-y-4 shadow-[var(--shadow-warm-sm)]">
                    <div className="space-y-1">
                      <p className="awder-label text-awder-grisbrun">Prix par {listingData.type === 'accommodation' ? 'nuit' : 'heure'} (FCFA)</p>
                      <input type="number" value={listingData.price} onChange={(e) => setListingData(p => ({ ...p, price: Number(e.target.value) }))} className="w-full text-3xl font-display font-semibold text-awder-brun bg-transparent outline-none" />
                    </div>
                    <div className="pt-4 border-t border-awder-sable space-y-1">
                      <p className="awder-label text-awder-grisbrun">Caution Sira-Djou (FCFA)</p>
                      <input type="number" value={listingData.cautionAmount} onChange={(e) => setListingData(p => ({ ...p, cautionAmount: Number(e.target.value) }))} className="w-full text-2xl font-display font-semibold text-awder-ocre bg-transparent outline-none" />
                    </div>
                  </div>

                  {/* ✨ Simulateur de revenus */}
                  {Number(listingData.price) > 0 && (
                    <div className="p-5 bg-awder-bogolan/10 border border-awder-bogolan/25 rounded-2xl flex items-center gap-4">
                      <span className="w-11 h-11 shrink-0 rounded-xl bg-awder-bogolan/15 text-awder-bogolan grid place-items-center"><TrendingUp className="w-5 h-5" /></span>
                      <div>
                        <p className="font-display font-semibold text-xl text-awder-bogolan tracking-tight">≈ {formatPrice(revenueEstimate.monthly)} F / mois</p>
                        <p className="text-xs text-awder-grisbrun mt-0.5">
                          Estimation pour {revenueEstimate.units} {revenueEstimate.isNightly ? 'nuits' : 'heures'} réservées par mois.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ✨ Mode de réservation — choix de l'hôte */}
                  <div className="space-y-3">
                    <p className="awder-label text-awder-gold">Mode de réservation</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'instant' as const, icon: <CreditCard className="w-4 h-4" />, label: 'Instantanée', desc: 'Le voyageur paie et réserve directement. Plus de réservations.' },
                        { id: 'request' as const, icon: <Send className="w-4 h-4" />, label: 'Sur demande', desc: 'Vous acceptez ou refusez chaque demande avant paiement.' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setListingData((p: any) => ({ ...p, bookingMode: m.id }))}
                          className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${listingData.bookingMode === m.id ? 'border-awder-gold bg-awder-gold/5' : 'border-awder-sable bg-white'}`}
                        >
                          <span className={`w-9 h-9 shrink-0 rounded-lg grid place-items-center ${listingData.bookingMode === m.id ? 'bg-awder-gold/15 text-awder-gold' : 'bg-awder-sable/60 text-awder-grisbrun'}`}>{m.icon}</span>
                          <div>
                            <p className="font-semibold text-sm text-awder-brun">{m.label}</p>
                            <p className="text-xs text-awder-grisbrun mt-0.5">{m.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleSave('published')}
                      disabled={loading}
                      className="w-full py-4 bg-awder-ocre text-white rounded-xl font-semibold text-base shadow-[0_10px_22px_-8px_rgba(166,75,42,0.55)] flex items-center justify-center gap-2.5 hover:bg-awder-ocre-deep transition-colors active:scale-[0.98]"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <><CheckCircle2 className="w-5 h-5" /> Publier l&apos;annonce</>
                      )}
                    </button>

                    <button
                      onClick={() => handleSave('draft')}
                      disabled={loading}
                      className="w-full py-3.5 bg-white border border-awder-sable text-awder-grisbrun rounded-xl font-semibold text-sm hover:border-awder-brun hover:text-awder-brun transition-colors"
                    >
                      Enregistrer comme brouillon
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
