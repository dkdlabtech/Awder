'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminFetch } from '@/hooks/use-admin';
import {
  Search,
  ShieldCheck,
  ShieldX,
  User as UserIcon,
  Phone,
  Mail,
  Award,
  Loader2,
  IdCard,
  Camera,
  ExternalLink,
  Clock,
} from 'lucide-react';

type Filter = 'all' | 'host' | 'guest' | 'banned' | 'pending_kyc';

const DOC_LABELS: Record<string, string> = {
  cni: "Carte Nationale d'Identité",
  passport: 'Passeport',
  driver_license: 'Permis de conduire',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [banReason, setBanReason] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = users.filter((u) => {
    if (filter === 'host' && u.role !== 'host') return false;
    if (filter === 'guest' && u.role !== 'guest') return false;
    if (filter === 'banned' && !u.isBanned) return false;
    if (filter === 'pending_kyc' && u.idVerificationStatus !== 'pending') return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [u.displayName, u.email, u.phoneNumber, u.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  const handleAction = async (
    action:
      | 'verify_kyc'
      | 'reject_kyc'
      | 'ban'
      | 'unban'
      | 'grant_verified'
      | 'revoke_verified'
  ) => {
    if (!selected) return;
    if (action === 'ban' && !banReason.trim()) {
      setActionError('Précisez la raison du bannissement.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const res = await adminFetch('/api/boss/users/action', {
        method: 'POST',
        body: JSON.stringify({
          userId: selected.id,
          action,
          reason: action === 'ban' ? banReason : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur');
      }
      setSelected(null);
      setBanReason('');
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Compteur de KYC en attente (pour le badge)
  const pendingKycCount = users.filter((u) => u.idVerificationStatus === 'pending').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Utilisateurs</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Vérifiez les KYC, accordez le label "Awder Vérifié" ou bannissez en cas d'abus.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email, téléphone…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-1 text-sm flex-wrap">
          {(
            [
              { key: 'all', label: 'Tous' },
              { key: 'host', label: 'Hôtes' },
              { key: 'guest', label: 'Voyageurs' },
              { key: 'pending_kyc', label: 'KYC en attente' },
              { key: 'banned', label: 'Bannis' },
            ] as { key: Filter; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 ${
                filter === t.key
                  ? 'bg-orange-100 text-orange-700 font-medium'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {t.label}
              {t.key === 'pending_kyc' && pendingKycCount > 0 && (
                <span className="bg-orange-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingKycCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-zinc-500 bg-zinc-50 rounded-lg">
          Aucun utilisateur.
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
          {filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelected(u)}
              className="w-full px-5 py-3 flex items-center gap-4 hover:bg-zinc-50 text-left"
            >
              <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900 truncate">
                    {u.displayName ?? 'Sans nom'}
                  </span>
                  {u.verificationLevel === 'visited' && (
                    <Award className="w-3.5 h-3.5 text-emerald-600" aria-label="Visité" />
                  )}
                  {u.verificationLevel === 'premium' && (
                    <Award className="w-3.5 h-3.5 text-purple-600" aria-label="Premium" />
                  )}
                  {u.isBanned && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-700 rounded">banni</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 truncate">
                  {u.email ?? u.phoneNumber ?? '—'} ·{' '}
                  <span className="capitalize">{u.role}</span>
                </div>
              </div>
              {u.idVerificationStatus === 'pending' && (
                <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  KYC à vérifier
                </span>
              )}
              {u.idVerificationStatus === 'verified' && (
                <ShieldCheck className="w-4 h-4 text-emerald-600" aria-label="KYC validé" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Modal détail utilisateur */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {selected.displayName ?? 'Utilisateur'}
                </h2>
                <p className="text-xs text-zinc-500">UID : {selected.id}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-400 hover:text-zinc-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Coordonnées */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selected.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <span className="truncate">{selected.email}</span>
                  </div>
                )}
                {selected.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-zinc-400" />
                    <span>{selected.phoneNumber}</span>
                  </div>
                )}
                <div>
                  <div className="text-xs text-zinc-500">Rôle</div>
                  <div className="font-medium capitalize">{selected.role}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Niveau vérification</div>
                  <div className="font-medium">
                    {selected.verificationLevel ?? 'none'}
                  </div>
                </div>
              </div>

              {/* SECTION KYC — Documents soumis */}
              {(selected.idCardUrl || selected.selfieUrl) && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-orange-600" />
                      Documents d'identité soumis
                    </h3>
                    {selected.idVerificationStatus === 'pending' && (
                      <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded font-medium">
                        À VÉRIFIER
                      </span>
                    )}
                    {selected.idVerificationStatus === 'verified' && (
                      <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-medium">
                        ✓ VALIDÉ
                      </span>
                    )}
                    {selected.idVerificationStatus === 'rejected' && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded font-medium">
                        REJETÉ
                      </span>
                    )}
                  </div>

                  {selected.idDocType && (
                    <p className="text-xs text-zinc-600 mb-3">
                      Type : <strong>{DOC_LABELS[selected.idDocType] ?? selected.idDocType}</strong>
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {/* Pièce d'identité */}
                    {selected.idCardUrl && (
                      <div>
                        <div className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                          <IdCard className="w-3 h-3" />
                          Pièce d'identité
                        </div>
                        <button
                          onClick={() => setZoomedImage(selected.idCardUrl)}
                          className="block w-full h-32 rounded-md overflow-hidden border border-zinc-200 hover:border-orange-400 transition bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selected.idCardUrl}
                            alt="Pièce d'identité"
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <a
                          href={selected.idCardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-600 hover:underline mt-1 inline-flex items-center gap-1"
                        >
                          Original <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Selfie */}
                    {selected.selfieUrl && (
                      <div>
                        <div className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          Selfie avec document
                        </div>
                        <button
                          onClick={() => setZoomedImage(selected.selfieUrl)}
                          className="block w-full h-32 rounded-md overflow-hidden border border-zinc-200 hover:border-orange-400 transition bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selected.selfieUrl}
                            alt="Selfie"
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <a
                          href={selected.selfieUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-600 hover:underline mt-1 inline-flex items-center gap-1"
                        >
                          Original <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {selected.kycSubmittedAt && (
                    <p className="text-xs text-zinc-500 mt-3">
                      Soumis le{' '}
                      {new Date(selected.kycSubmittedAt).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              )}

              {/* Si l'utilisateur n'a JAMAIS soumis de KYC */}
              {!selected.idCardUrl && selected.role === 'host' && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                  <strong>Hôte sans KYC</strong>
                  <p className="text-xs mt-1">
                    Cet hôte n'a pas encore soumis ses documents. Il ne pourra publier
                    aucune annonce tant qu'il n'aura pas été vérifié.
                  </p>
                </div>
              )}

              {/* Bannissement */}
              {selected.isBanned && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                  <div className="font-medium">Compte banni</div>
                  <div className="text-xs mt-1">
                    Raison : {selected.banReason ?? 'non spécifiée'}
                  </div>
                </div>
              )}

              {actionError && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  {actionError}
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-zinc-200 pt-4 space-y-3">
                {/* KYC */}
                {selected.idVerificationStatus === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('verify_kyc')}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 disabled:opacity-50 font-medium"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      Valider l'identité
                    </button>
                    <button
                      onClick={() => handleAction('reject_kyc')}
                      disabled={actionLoading}
                      className="flex-1 px-3 py-2.5 bg-red-100 text-red-700 text-sm rounded-md hover:bg-red-200 font-medium"
                    >
                      Rejeter
                    </button>
                  </div>
                )}

                {/* Awder Vérifié (badge premium) */}
                {!selected.isBanned &&
                  selected.role === 'host' &&
                  selected.idVerificationStatus === 'verified' && (
                    <div className="flex gap-2">
                      {selected.verificationLevel !== 'visited' &&
                      selected.verificationLevel !== 'premium' ? (
                        <button
                          onClick={() => handleAction('grant_verified')}
                          disabled={actionLoading}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50"
                        >
                          <Award className="w-4 h-4" /> Accorder "Awder Vérifié"
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction('revoke_verified')}
                          disabled={actionLoading}
                          className="flex-1 px-3 py-2 bg-zinc-200 text-zinc-700 text-sm rounded-md hover:bg-zinc-300"
                        >
                          Retirer "Awder Vérifié"
                        </button>
                      )}
                    </div>
                  )}

                {/* Ban / Unban */}
                {!selected.isBanned ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Raison du bannissement…"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={() => handleAction('ban')}
                      disabled={actionLoading || !banReason.trim()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldX className="w-4 h-4" />
                      )}
                      Bannir cet utilisateur
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAction('unban')}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" /> Lever le bannissement
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal zoom photo */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomedImage}
            alt="Document"
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center text-2xl"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
