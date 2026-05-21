'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/hooks/use-auth';
import { db, auth } from '@/lib/firebase';
import { addDoc, collection, updateDoc } from 'firebase/firestore';
import { uploadListingImages } from '@/lib/upload';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';
import {
  ChevronLeft, Home as HomeIcon, Calendar, Camera, X, CheckCircle2,
} from 'lucide-react';

interface AddListingOverlayProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddListingOverlay({ onClose, onSuccess }: AddListingOverlayProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [listingData, setListingData] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    neighborhood: '',
    price: 45000,
    cautionAmount: 15000,
    type: 'accommodation' as 'accommodation' | 'event',
    amenities: [] as string[],
  });

  React.useEffect(() => {
    if (profile) {
      setTimeout(() => {
        setListingData(prev => ({
          ...prev,
          title: profile.displayName ? `Logement de ${profile.displayName.split(' ')[0]}` : '',
          city: 'Bamako',
          neighborhood: 'ACI 2000',
        }));
      }, 0);
    }
  }, [profile]);

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

  const handlePublish = async () => {
    if (!profile || !auth.currentUser) return;
    setLoading(true);
    try {
      const baseData = {
        hostId: auth.currentUser.uid,
        title: listingData.title || (listingData.type === 'accommodation' ? 'Logement Premium' : 'Espace Événementiel'),
        description: listingData.description || '',
        price: Number(listingData.price),
        cautionAmount: Number(listingData.cautionAmount),
        location: {
          city: listingData.city || 'Bamako',
          address: listingData.address || 'ACI 2000',
          neighborhood: listingData.neighborhood || '',
        },
        type: listingData.type,
        pricingType: listingData.type === 'accommodation' ? 'nightly' : 'hourly',
        amenities: listingData.amenities,
        images: [] as string[],
        isVerified: false,
        isActive: false,
        moderationStatus: 'pending_review',
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'listings'), baseData);

      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadListingImages(imageFiles, docRef.id);
      } else {
        imageUrls = ['https://picsum.photos/seed/new/800/600'];
      }

      await updateDoc(docRef, { images: imageUrls });
      onSuccess();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'listings');
    } finally {
      setLoading(false);
    }
  };

  const AMENITIES = [
    'Wifi', 'Climatisation', 'Piscine', 'Parking', 'Cuisine équipée',
    'TV', 'Sécurité 24/7', 'Groupe Électrogène', 'Eau chaude',
    'Sono', 'Éclairage', 'Projecteur HD', 'Visioconférence',
  ];

  return (
    <div className="fixed inset-0 z-[150] bg-awder-offwhite flex flex-col">
      <header className="px-6 py-6 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm">
        <button onClick={onClose} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-awder-brun" />
        </button>
        <div className="flex flex-col items-center">
          <p className="text-[10px] font-black text-awder-gold uppercase tracking-[0.3em]">
            Étape {step} / 5
          </p>
          <h2 className="text-sm font-black text-awder-brun tracking-tight uppercase">Nouvelle Annonce</h2>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-10 space-y-10">
        <AnimatePresence mode="wait">
          {/* Étape 1 — Type */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">
                  On commence <span className="text-awder-ocre">par le début</span>.
                </h3>
                <p className="text-sm text-slate-400 font-bold">Quel type d&apos;espace proposez-vous ?</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { type: 'accommodation', label: 'Logement Complet', desc: 'Villa, Appartement, Studio...', icon: <HomeIcon className="w-6 h-6" /> },
                  { type: 'event', label: 'Espace Événementiel', desc: 'Terrasse, Salle, Jardin...', icon: <Calendar className="w-6 h-6" /> },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => { setListingData(p => ({ ...p, type: opt.type as any })); setStep(2); }}
                    className={`p-8 border-2 rounded-[40px] text-left space-y-2 shadow-xl transition-all ${listingData.type === opt.type ? 'border-awder-gold bg-awder-gold/5' : 'border-slate-100 bg-white'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${listingData.type === opt.type ? 'bg-awder-gold/10 text-awder-gold' : 'bg-slate-50 text-slate-400'}`}>
                      {opt.icon}
                    </div>
                    <p className="font-black text-awder-brun">{opt.label}</p>
                    <p className="text-xs text-slate-400 font-medium">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Étape 2 — Localisation */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">
                Où se trouve <span className="text-awder-ocre">votre pépite</span> ?
              </h3>
              <div className="space-y-4">
                {[
                  { placeholder: "Nom de l'annonce (ex: Villa Mandingue)", key: 'title' },
                  { placeholder: 'Adresse exacte', key: 'address' },
                ].map((f) => (
                  <input
                    key={f.key}
                    placeholder={f.placeholder}
                    value={(listingData as any)[f.key]}
                    onChange={(e) => setListingData(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun"
                  />
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Ville" value={listingData.city} onChange={(e) => setListingData(p => ({ ...p, city: e.target.value }))} className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" />
                  <input placeholder="Quartier" value={listingData.neighborhood} onChange={(e) => setListingData(p => ({ ...p, neighborhood: e.target.value }))} className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun" />
                </div>
                <button onClick={() => setStep(3)} className="w-full py-6 bg-awder-brun text-white rounded-full font-black text-lg shadow-xl shadow-awder-brun/20">Continuer</button>
              </div>
            </motion.div>
          )}

          {/* Étape 3 — Description + équipements */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">
                Racontez <span className="text-awder-ocre">votre lieu</span>.
              </h3>
              <div className="space-y-4">
                <textarea
                  placeholder="Décrivez votre espace, son ambiance, ses points forts..."
                  value={listingData.description}
                  onChange={(e) => setListingData(p => ({ ...p, description: e.target.value }))}
                  rows={6}
                  className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:border-awder-gold font-bold text-awder-brun resize-none"
                />
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Équipements</p>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES.map((a) => {
                      const selected = listingData.amenities.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setListingData(p => ({ ...p, amenities: selected ? p.amenities.filter(x => x !== a) : [...p.amenities, a] }))}
                          className={`px-4 py-2 rounded-full text-xs font-black border-2 transition-all ${selected ? 'bg-awder-gold border-awder-gold text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => setStep(4)} className="w-full py-6 bg-awder-brun text-white rounded-full font-black text-lg shadow-xl shadow-awder-brun/20">Continuer</button>
              </div>
            </motion.div>
          )}

          {/* Étape 4 — Photos */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">
                Mettez votre lieu <span className="text-awder-ocre">en valeur</span>.
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="aspect-square bg-white border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-awder-gold">
                  <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                  <Camera className="w-6 h-6 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajouter</span>
                </label>
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-[32px] overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="Aperçu" className="absolute inset-0 w-full h-full object-cover" />
                    <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(5)} disabled={images.length === 0} className={`w-full py-6 rounded-full font-black text-lg transition-all ${images.length > 0 ? 'bg-awder-brun text-white shadow-xl shadow-awder-brun/20' : 'bg-slate-100 text-slate-300'}`}>
                Continuer
              </button>
            </motion.div>
          )}

          {/* Étape 5 — Prix */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h3 className="text-3xl font-black text-awder-brun leading-tight tracking-tighter">
                On parle <span className="text-awder-ocre">argent</span>.
              </h3>
              <div className="space-y-4">
                <div className="p-8 bg-white border border-slate-100 rounded-[40px] space-y-4 shadow-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix par Nuit (FCFA)</p>
                    <input type="number" value={listingData.price} onChange={(e) => setListingData(p => ({ ...p, price: Number(e.target.value) }))} className="w-full text-4xl font-black text-awder-brun bg-transparent outline-none" />
                  </div>
                  <div className="pt-4 border-t border-slate-50 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caution Sira-Djou (FCFA)</p>
                    <input type="number" value={listingData.cautionAmount} onChange={(e) => setListingData(p => ({ ...p, cautionAmount: Number(e.target.value) }))} className="w-full text-2xl font-black text-awder-ocre bg-transparent outline-none" />
                  </div>
                </div>
                <button onClick={handlePublish} disabled={loading} className="w-full py-6 bg-awder-ocre text-white rounded-full font-black text-lg shadow-2xl shadow-awder-ocre/30 flex items-center justify-center gap-3">
                  {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                    <><CheckCircle2 className="w-6 h-6" /> Publier l&apos;annonce</>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
