'use client';

/**
 * Devenir hôte Awder — formulaire structuré 3 sections + activation immédiate.
 *  1. Propriétaire (nom, WhatsApp, mode de versement)
 *  2. Le lieu (nom, ville, quartier, indications d'accès, note vocale, GPS validé)
 *  3. Équipements
 * Brouillon sauvegardé en continu (localStorage) et reprenable à tout moment.
 * À la soumission : rôle hôte activé + création d'annonce PRÉ-REMPLIE.
 * Le KYC reste exigé à la publication de l'annonce.
 */

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { uploadVoiceNote } from '@/lib/upload';
import {
  ChevronLeft, MapPin, Mic, Square, Trash2, Loader2, CheckCircle2,
  Wallet, Landmark, ShieldCheck, Zap, RotateCcw, X,
} from 'lucide-react';

interface BecomeHostFlowProps {
  userId: string;
  userName?: string;
  onClose: () => void;
  /** Reçoit les données saisies pour pré-remplir la création d'annonce. */
  onActivated: (prefill: any) => void;
}

const AMENITIES = ['Wifi', 'Climatisation', 'Piscine', 'Parking', 'Cuisine équipée', 'TV', 'Sécurité 24/7', 'Groupe Électrogène', 'Eau chaude'];

type FormState = {
  fullName: string;
  whatsapp: string;
  payout: 'mobile_money' | 'bank';
  placeName: string;
  city: string;
  neighborhood: string;
  directions: string;
  coordinates: { lat: number; lng: number } | null;
  gpsValidated: boolean;
  amenities: string[];
  section: 1 | 2 | 3;
};

const emptyForm = (userName?: string): FormState => ({
  fullName: userName || '',
  whatsapp: '',
  payout: 'mobile_money',
  placeName: '',
  city: 'Bamako',
  neighborhood: '',
  directions: '',
  coordinates: null,
  gpsValidated: false,
  amenities: [],
  section: 1,
});

export default function BecomeHostFlow({ userId, userName, onClose, onActivated }: BecomeHostFlowProps) {
  const draftKey = `awder_host_application_${userId}`;

  const [form, setForm] = useState<FormState>(() => emptyForm(userName));
  const [resumable, setResumable] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Reprise de brouillon */
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setResumable(JSON.parse(raw));
    } catch { /* brouillon illisible : on repart à zéro */ }
  }, [draftKey]);

  /* Autosave continu du brouillon */
  React.useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch { /* stockage plein */ }
    }, 500);
    return () => clearTimeout(t);
  }, [form, draftKey]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));

  /* Note vocale */
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState('');
  const mrRef = React.useRef<MediaRecorder | null>(null);
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
        setVoiceUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mrRef.current = mr;
      setRecording(true);
    } catch {
      alert('Micro indisponible. Vérifiez les autorisations du navigateur.');
    }
  };
  const stopRecording = () => { mrRef.current?.stop(); setRecording(false); };
  const clearVoice = () => { setVoiceBlob(null); setVoiceUrl(''); };

  /* GPS : capture puis validation explicite par l'hôte */
  const captureGPS = () => {
    if (!navigator.geolocation) { setError('GPS indisponible sur cet appareil.'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('coordinates', { lat: pos.coords.latitude, lng: pos.coords.longitude });
        set('gpsValidated', false);
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); setError('Position refusée — autorisez la localisation.'); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const sectionValid = (s: number) =>
    s === 1 ? form.fullName.trim().length > 1 && form.whatsapp.trim().length >= 8 :
    s === 2 ? form.placeName.trim().length > 1 && form.city.trim().length > 1 :
    true;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Note vocale → Storage (si enregistrée)
      let uploadedVoice = '';
      if (voiceBlob && auth.currentUser) {
        try { uploadedVoice = await uploadVoiceNote(voiceBlob, `${auth.currentUser.uid}-hostapp-${Date.now()}`); }
        catch { /* non bloquant */ }
      }

      // 2. Activation du rôle hôte (champs autorisés par les règles uniquement)
      await updateDoc(doc(db, 'users', userId), {
        role: 'host',
        phoneNumber: form.whatsapp.trim(),
        updatedAt: new Date().toISOString(),
      });

      // 3. Brouillon consommé
      localStorage.removeItem(draftKey);

      // 4. Pré-remplissage de la création d'annonce
      onActivated({
        title: form.placeName.trim(),
        location: {
          city: form.city.trim(),
          neighborhood: form.neighborhood.trim(),
          address: form.neighborhood.trim() || form.city.trim(),
          directions: form.directions.trim(),
          coordinates: form.coordinates,
          voiceNoteUrl: uploadedVoice,
        },
        directions: form.directions.trim(),
        amenities: form.amenities,
        hostPayoutPref: form.payout,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Activation impossible. Réessayez.');
      setSubmitting(false);
    }
  };

  const inputCls = "w-full p-4 bg-white border border-awder-sable rounded-xl outline-none focus:border-awder-gold font-medium text-awder-brun placeholder:text-awder-grisbrun/60";
  const progress = ((form.section - 1) / 3) * 100 + (sectionValid(form.section) ? 20 : 8);

  return (
    <div className="fixed inset-0 z-[130] bg-awder-offwhite flex flex-col">
      <header className="px-5 py-4 border-b border-awder-sable bg-white flex justify-between items-center">
        <button
          onClick={() => form.section > 1 ? set('section', (form.section - 1) as any) : onClose()}
          className="p-2 -ml-2" aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6 text-awder-brun" />
        </button>
        <div className="flex flex-col items-center">
          <p className="awder-label text-awder-gold">Section {form.section} / 3</p>
          <h2 className="text-sm font-semibold text-awder-brun">Devenir hôte</h2>
        </div>
        <button onClick={onClose} className="text-xs font-semibold text-awder-grisbrun p-2">Plus tard</button>
      </header>
      <div className="h-1 bg-awder-sable">
        <div className="h-full bg-awder-gold transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>

      {/* Bandeau reprise de brouillon */}
      {resumable && (
        <div className="mx-5 mt-4 p-4 bg-white border border-awder-gold/40 rounded-2xl shadow-[var(--shadow-warm-sm)] flex items-center gap-3">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-awder-gold/15 text-awder-gold grid place-items-center"><RotateCcw className="w-5 h-5" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-awder-brun">Reprendre votre inscription ?</p>
            <p className="text-xs text-awder-grisbrun truncate">{resumable.placeName || resumable.fullName || 'Brouillon enregistré'}</p>
          </div>
          <button onClick={() => { setForm(resumable); setResumable(null); }} className="px-3.5 py-2 bg-awder-ocre text-white rounded-lg text-xs font-semibold shrink-0">Reprendre</button>
          <button onClick={() => { localStorage.removeItem(draftKey); setResumable(null); }} className="p-2 text-awder-grisbrun" aria-label="Ignorer"><X className="w-4 h-4" /></button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-7 space-y-6">
        {form.section === 1 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-[26px] font-semibold text-awder-brun leading-tight">Parlez-nous <span className="text-awder-ocre italic">de vous</span>.</h3>
              <p className="text-sm text-awder-grisbrun">Vos gains arriveront directement sur votre portefeuille Awder, protégés par Sira-Djou.</p>
            </div>
            <input placeholder="Nom complet" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} className={inputCls} />
            <input placeholder="Téléphone WhatsApp (+223…)" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} className={inputCls} />
            <div className="space-y-2">
              <p className="awder-label text-awder-gold">Mode de versement préféré</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'mobile_money' as const, icon: <Wallet className="w-4 h-4" />, label: 'Wave / OM / Moov' },
                  { id: 'bank' as const, icon: <Landmark className="w-4 h-4" />, label: 'Virement bancaire' },
                ]).map((p) => (
                  <button key={p.id} type="button" onClick={() => set('payout', p.id)}
                    className={`p-4 rounded-2xl border text-left space-y-2 transition-all ${form.payout === p.id ? 'border-awder-gold bg-awder-gold/5' : 'border-awder-sable bg-white'}`}>
                    <span className={`w-9 h-9 rounded-lg grid place-items-center ${form.payout === p.id ? 'bg-awder-gold/15 text-awder-gold' : 'bg-awder-sable/60 text-awder-grisbrun'}`}>{p.icon}</span>
                    <p className="font-semibold text-xs text-awder-brun">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => set('section', 2)} disabled={!sectionValid(1)}
              className={`w-full py-4 rounded-xl font-semibold text-base transition-all active:scale-[0.98] ${sectionValid(1) ? 'bg-awder-brun text-white shadow-[var(--shadow-warm-md)]' : 'bg-awder-sable text-awder-grisbrun'}`}>
              Continuer
            </button>
          </div>
        )}

        {form.section === 2 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-[26px] font-semibold text-awder-brun leading-tight">Votre <span className="text-awder-ocre italic">lieu</span>.</h3>
              <p className="text-sm text-awder-grisbrun">Ces informations pré-rempliront votre première annonce.</p>
            </div>
            <input placeholder="Nom du lieu (ex : Villa Or)" value={form.placeName} onChange={(e) => set('placeName', e.target.value)} className={inputCls} />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Ville" value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} />
              <input placeholder="Quartier" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} className={inputCls} />
            </div>
            <textarea rows={3} placeholder='Indications d&apos;accès : « derrière la pharmacie, portail vert à 50 m du grand manguier »'
              value={form.directions} onChange={(e) => set('directions', e.target.value)} className={`${inputCls} resize-none text-sm`} />

            {/* Note vocale d'itinéraire */}
            <div className="p-4 bg-white border border-awder-sable rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-awder-ocre" />
                <p className="font-semibold text-sm text-awder-brun">Note vocale d&apos;itinéraire</p>
              </div>
              {!voiceUrl ? (
                <button type="button" onClick={recording ? stopRecording : startRecording}
                  className={`w-full py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-awder-ocre/10 text-awder-ocre'}`}>
                  {recording ? <><Square className="w-4 h-4" /> Arrêter</> : <><Mic className="w-4 h-4" /> Enregistrer le chemin à voix haute</>}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <audio controls src={voiceUrl} className="flex-1 h-10" />
                  <button type="button" onClick={clearVoice} className="p-3 bg-red-50 text-red-500 rounded-xl" aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>

            {/* GPS : capture + validation explicite */}
            <div className="p-4 bg-white border border-awder-sable rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-awder-ocre" />
                <p className="font-semibold text-sm text-awder-brun">Position GPS exacte</p>
              </div>
              <p className="text-xs text-awder-grisbrun leading-relaxed">
                Capturez la position depuis le lieu. Elle ne sera montrée aux voyageurs qu&apos;<strong className="font-semibold text-awder-brun">après paiement sécurisé</strong>.
              </p>
              {!form.coordinates ? (
                <button type="button" onClick={captureGPS} disabled={gpsLoading}
                  className="w-full py-3.5 bg-awder-brun text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MapPin className="w-4 h-4" /> Capturer ma position</>}
                </button>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 bg-awder-sable/40 rounded-xl">
                    <span className="font-mono text-[11px] text-awder-brun">{form.coordinates.lat.toFixed(5)}, {form.coordinates.lng.toFixed(5)}</span>
                    <a href={`https://www.google.com/maps?q=${form.coordinates.lat},${form.coordinates.lng}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-awder-ocre underline underline-offset-2">Vérifier sur la carte</a>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={captureGPS} className="flex-1 py-2.5 border border-awder-sable rounded-xl text-xs font-semibold text-awder-grisbrun">Recapturer</button>
                    <button type="button" onClick={() => set('gpsValidated', true)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${form.gpsValidated ? 'bg-awder-bogolan/15 text-awder-bogolan border border-awder-bogolan/30' : 'bg-awder-gold text-awder-brun-deep'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> {form.gpsValidated ? 'Position validée' : 'Je valide cette position'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => set('section', 3)} disabled={!sectionValid(2)}
              className={`w-full py-4 rounded-xl font-semibold text-base transition-all active:scale-[0.98] ${sectionValid(2) ? 'bg-awder-brun text-white shadow-[var(--shadow-warm-md)]' : 'bg-awder-sable text-awder-grisbrun'}`}>
              Continuer
            </button>
          </div>
        )}

        {form.section === 3 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-[26px] font-semibold text-awder-brun leading-tight">Vos <span className="text-awder-ocre italic">équipements</span>.</h3>
              <p className="text-sm text-awder-grisbrun">Cochez ce que votre lieu propose — modifiable ensuite.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const on = form.amenities.includes(a);
                return (
                  <button key={a} type="button"
                    onClick={() => set('amenities', on ? form.amenities.filter(x => x !== a) : [...form.amenities, a])}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${on ? 'bg-awder-gold border-awder-gold text-awder-brun-deep' : 'bg-white border-awder-sable text-awder-grisbrun'}`}>
                    {a}
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-awder-gold/8 border border-awder-gold/25 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-awder-gold shrink-0 mt-0.5" />
              <p className="text-xs text-awder-brun leading-relaxed">
                <strong className="font-semibold">Commission 5 %</strong> seulement (vs 14-16 % ailleurs), paiements garantis par le séquestre
                <span className="font-display font-semibold italic text-awder-ocre"> Awder</span> Sira-Djou. La vérification d&apos;identité (2 photos, 2 min) se fera au moment de publier.
              </p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">{error}</div>}

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-4 bg-awder-ocre text-white rounded-xl font-semibold text-base shadow-[0_10px_22px_-8px_rgba(166,75,42,0.55)] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-60">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5" /> Activer mon espace hôte</>}
            </button>
            <p className="text-xs text-awder-grisbrun text-center">Votre première annonce s&apos;ouvrira pré-remplie avec ces informations.</p>
          </div>
        )}
      </main>
    </div>
  );
}
