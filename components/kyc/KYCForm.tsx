'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { uploadUserImage } from '@/lib/upload';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Clock,
  X,
  Info,
  IdCard,
  User,
} from 'lucide-react';

interface KYCFormProps {
  userId: string;
  currentStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  onComplete?: () => void;
  onCancel?: () => void;
  /** Si true, message expliquant pourquoi le KYC est demandé (déclenché à la publication). */
  triggeredByPublication?: boolean;
}

type DocType = 'cni' | 'passport' | 'driver_license';

const DOC_LABELS: Record<DocType, string> = {
  cni: "Carte Nationale d'Identité",
  passport: 'Passeport',
  driver_license: 'Permis de conduire',
};

export default function KYCForm({
  userId,
  currentStatus = 'none',
  onComplete,
  onCancel,
  triggeredByPublication = false,
}: KYCFormProps) {
  const [docType, setDocType] = useState<DocType>('cni');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const idCardInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Si déjà en cours ou vérifié, afficher un message d'état
  if (currentStatus === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <Clock className="w-12 h-12 text-amber-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-amber-900 mb-1">
          Vérification en cours
        </h3>
        <p className="text-sm text-amber-800 mb-4">
          Vos documents ont été soumis. Notre équipe les vérifie sous 24h ouvrées.
          Vous serez notifié sur WhatsApp et par email.
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-amber-700 underline"
          >
            Retour
          </button>
        )}
      </div>
    );
  }

  if (currentStatus === 'verified') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-emerald-900 mb-1">
          Identité vérifiée ✓
        </h3>
        <p className="text-sm text-emerald-800">
          Votre profil est validé. Vous pouvez publier vos annonces librement.
        </p>
      </div>
    );
  }

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
    previewSetter: (s: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (JPG, PNG, HEIC).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image trop volumineuse (max 10 Mo).');
      return;
    }
    setError(null);
    setter(file);
    const reader = new FileReader();
    reader.onload = (ev) => previewSetter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!idCardFile || !selfieFile) {
      setError('Veuillez fournir les deux documents.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload des images vers Cloudinary
      const [idCardUrl, selfieUrl] = await Promise.all([
        uploadUserImage(idCardFile, userId, 'idcard'),
        uploadUserImage(selfieFile, userId, 'selfie'),
      ]);

      // 2. Mise à jour du profil utilisateur via API (avec ID token pour respecter les rules)
      const user = auth.currentUser;
      if (!user) throw new Error('Non authentifié.');
      const idToken = await user.getIdToken();

      const res = await fetch('/api/host/kyc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          docType,
          idCardUrl,
          selfieUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Échec de la soumission.');
      }

      setStep(3);
      setTimeout(() => {
        onComplete?.();
      }, 2500);
    } catch (e: any) {
      setError(e.message ?? 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  // Écran de confirmation finale
  if (step === 3) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-emerald-900 mb-2">
          Documents reçus !
        </h3>
        <p className="text-sm text-emerald-800">
          Notre équipe va vérifier votre identité sous 24h ouvrées.
          <br />
          Vous serez notifié sur WhatsApp dès validation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* En-tête contextuel */}
      {triggeredByPublication && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-900">
            <strong>Dernière étape avant publication.</strong>
            <p className="mt-1 text-orange-800">
              Awder vérifie l'identité de tous les hôtes pour protéger les voyageurs.
              Cela prend 2 minutes — vos documents sont sécurisés et ne sont jamais partagés.
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-zinc-900">Vérification d'identité</h2>
        <p className="text-sm text-zinc-600 mt-1">
          2 photos suffisent. Documents sécurisés, validés sous 24h.
        </p>
      </div>

      {/* Étapes */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span
          className={`flex items-center gap-1 ${
            step >= 1 ? 'text-zinc-900 font-medium' : ''
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              step >= 1 ? 'bg-orange-600 text-white' : 'bg-zinc-200'
            }`}
          >
            1
          </span>
          Type de document
        </span>
        <span className="text-zinc-300">→</span>
        <span
          className={`flex items-center gap-1 ${
            step >= 2 ? 'text-zinc-900 font-medium' : ''
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              step >= 2 ? 'bg-orange-600 text-white' : 'bg-zinc-200'
            }`}
          >
            2
          </span>
          Documents
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex gap-2 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Étape 1 : Type de document */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-900 mb-2 block">
              Choisissez votre document
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['cni', 'passport', 'driver_license'] as DocType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  className={`p-3 rounded-lg border text-sm transition ${
                    docType === t
                      ? 'border-orange-600 bg-orange-50 text-orange-700 font-medium'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-700'
                  }`}
                >
                  <IdCard className="w-4 h-4 mx-auto mb-1" />
                  {DOC_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
          >
            Continuer
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700"
            >
              Plus tard
            </button>
          )}
        </div>
      )}

      {/* Étape 2 : Upload des documents */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Pièce d'identité */}
          <div>
            <label className="text-sm font-medium text-zinc-900 mb-2 block">
              Photo de votre {DOC_LABELS[docType]}
            </label>
            <input
              ref={idCardInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileChange(e, setIdCardFile, setIdCardPreview)}
              className="hidden"
            />
            {idCardPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={idCardPreview} alt="Pièce d'identité" className="w-full h-48 object-cover" />
                <button
                  onClick={() => {
                    setIdCardFile(null);
                    setIdCardPreview(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => idCardInputRef.current?.click()}
                className="w-full p-6 border-2 border-dashed border-zinc-300 rounded-lg hover:border-orange-400 hover:bg-orange-50/50 transition flex flex-col items-center gap-2"
              >
                <Upload className="w-6 h-6 text-zinc-400" />
                <span className="text-sm text-zinc-600">
                  Toucher pour prendre en photo ou choisir
                </span>
                <span className="text-xs text-zinc-400">JPG, PNG · max 10 Mo</span>
              </button>
            )}
          </div>

          {/* Selfie */}
          <div>
            <label className="text-sm font-medium text-zinc-900 mb-2 block">
              Selfie en tenant votre document
            </label>
            <p className="text-xs text-zinc-500 mb-2">
              Votre visage et le document doivent être visibles sur la même photo.
            </p>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => handleFileChange(e, setSelfieFile, setSelfiePreview)}
              className="hidden"
            />
            {selfiePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selfiePreview} alt="Selfie" className="w-full h-48 object-cover" />
                <button
                  onClick={() => {
                    setSelfieFile(null);
                    setSelfiePreview(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => selfieInputRef.current?.click()}
                className="w-full p-6 border-2 border-dashed border-zinc-300 rounded-lg hover:border-orange-400 hover:bg-orange-50/50 transition flex flex-col items-center gap-2"
              >
                <Camera className="w-6 h-6 text-zinc-400" />
                <span className="text-sm text-zinc-600">
                  Toucher pour prendre un selfie
                </span>
                <span className="text-xs text-zinc-400">Caméra avant</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(1)}
              disabled={submitting}
              className="flex-1 py-3 border border-zinc-300 text-zinc-700 rounded-lg font-medium hover:bg-zinc-50 disabled:opacity-50"
            >
              Retour
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !idCardFile || !selfieFile}
              className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Soumettre
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
