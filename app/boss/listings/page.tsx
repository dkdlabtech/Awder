'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminFetch } from '@/hooks/use-admin';
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Home as HomeIcon,
  Calendar,
  Zap,
  Droplet,
  Wifi,
  Award,
  Loader2,
} from 'lucide-react';

type Tab = 'pending_review' | 'approved' | 'rejected';

function formatXOF(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

export default function AdminListingsPage() {
  const [tab, setTab] = useState<Tab>('pending_review');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [hostInfo, setHostInfo] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Subscribe to listings by moderation status
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'listings'),
      where('moderationStatus', '==', tab),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setActionError(`Erreur de chargement : ${err.message}`); // affiche à l'écran
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tab]);

  // Charger les infos de l'hôte quand on sélectionne une annonce
  useEffect(() => {
    if (!selected?.hostId) {
      setHostInfo(null);
      return;
    }
    getDoc(doc(db, 'users', selected.hostId))
      .then((s) => setHostInfo(s.exists() ? s.data() : null))
      .catch(() => setHostInfo(null));
  }, [selected?.hostId]);

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await adminFetch('/api/boss/listings/moderate', {
        method: 'POST',
        body: JSON.stringify({ listingId: selected.id, decision: 'approve' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur');
      }
      setSelected(null);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      setActionError('Veuillez préciser la raison du rejet.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const res = await adminFetch('/api/boss/listings/moderate', {
        method: 'POST',
        body: JSON.stringify({
          listingId: selected.id,
          decision: 'reject',
          reason: rejectReason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur');
      }
      setSelected(null);
      setRejectReason('');
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Modération des annonces</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Approuvez ou rejetez les annonces avant qu'elles ne soient visibles sur la plateforme.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 flex gap-6 text-sm">
        {(
          [
            { key: 'pending_review', label: 'En attente' },
            { key: 'approved', label: 'Approuvées' },
            { key: 'rejected', label: 'Rejetées' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`py-3 border-b-2 transition ${
              tab === t.key
                ? 'border-orange-600 text-orange-700 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-sm text-zinc-500 bg-zinc-50 rounded-lg">
          Aucune annonce dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelected(l)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition text-left flex items-center gap-4"
            >
              <div className="w-16 h-16 rounded-md bg-zinc-100 overflow-hidden flex-shrink-0 relative">
                {l.images?.[0] ? (
                  <Image src={l.images[0]} alt={l.title} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <HomeIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900 truncate">{l.title}</div>
                <div className="text-xs text-zinc-500 flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {l.location?.city}
                  </span>
                  <span>{formatXOF(l.price)}/{l.pricingType === 'hourly' ? 'h' : 'nuit'}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {l.createdAt
                      ? new Date(
                          typeof l.createdAt === 'string' ? l.createdAt : l.createdAt.toDate()
                        ).toLocaleDateString('fr-FR')
                      : '—'}
                  </span>
                </div>
              </div>
              {l.moderationStatus === 'rejected' && (
                <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">
                  {l.rejectionReason ?? 'Rejeté'}
                </span>
              )}
              {l.isVerified && (
                <Award className="w-4 h-4 text-emerald-600" aria-label="Awder Vérifié" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Modal de détail */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-zinc-900">{selected.title}</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Images */}
              {selected.images?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selected.images.slice(0, 6).map((img: string, i: number) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-zinc-100">
                      <Image src={img} alt={`photo ${i + 1}`} fill className="object-cover" sizes="200px" />
                    </div>
                  ))}
                </div>
              )}

              {/* Infos clés */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Prix</div>
                  <div className="font-medium">
                    {formatXOF(selected.price)} / {selected.pricingType === 'hourly' ? 'heure' : 'nuit'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Caution</div>
                  <div className="font-medium">{formatXOF(selected.cautionAmount ?? 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Type</div>
                  <div className="font-medium capitalize">{selected.type}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Capacité</div>
                  <div className="font-medium">{selected.capacity ?? '—'} personnes</div>
                </div>
              </div>

              {/* Description */}
              {selected.description && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Description</div>
                  <p className="text-sm text-zinc-700 whitespace-pre-line">{selected.description}</p>
                </div>
              )}

              {/* Localisation */}
              <div>
                <div className="text-xs text-zinc-500 mb-1">Localisation</div>
                <div className="text-sm text-zinc-700">
                  {selected.location?.address}, {selected.location?.neighborhood && `${selected.location.neighborhood}, `}
                  {selected.location?.city}
                </div>
                {selected.location?.landmarks?.length > 0 && (
                  <div className="text-xs text-zinc-500 mt-1">
                    Repères : {selected.location.landmarks.join(' · ')}
                  </div>
                )}
              </div>

              {/* Infrastructure (différenciateurs Awder) */}
              {selected.infrastructure && (
                <div className="bg-zinc-50 rounded-lg p-4">
                  <div className="text-xs font-medium text-zinc-700 mb-3">Continuité de service</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span>
                        {selected.infrastructure.hasGenerator
                          ? `Groupe électrogène (${selected.infrastructure.generatorAutonomyHours ?? '?'}h)`
                          : 'Pas de groupe'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-blue-600" />
                      <span>
                        {selected.infrastructure.hasWaterReserve
                          ? `Réserve d'eau (${selected.infrastructure.waterCapacityLiters ?? '?'}L)`
                          : 'Pas de réserve'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-emerald-600" />
                      <span>
                        Wifi {selected.infrastructure.wifiSpeedMbps ?? '?'} Mbps
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Infos hôte */}
              {hostInfo && (
                <div className="border-t border-zinc-200 pt-4">
                  <div className="text-xs text-zinc-500 mb-2">Hôte</div>
                  <div className="text-sm">
                    <span className="font-medium">{hostInfo.displayName}</span>
                    {hostInfo.phoneNumber && (
                      <span className="text-zinc-500"> · {hostInfo.phoneNumber}</span>
                    )}
                    {hostInfo.email && <span className="text-zinc-500"> · {hostInfo.email}</span>}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Vérification : <span className="font-medium">{hostInfo.verificationLevel ?? 'none'}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              {selected.moderationStatus === 'pending_review' && (
                <div className="border-t border-zinc-200 pt-4 space-y-3">
                  {actionError && (
                    <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{actionError}</div>
                  )}

                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">
                      Raison du rejet (si vous rejetez)
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="ex: Photos non conformes, infrastructure non vérifiable..."
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Approuver
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading || !rejectReason.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
