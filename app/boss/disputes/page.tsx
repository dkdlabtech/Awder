'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { bossDb as db } from '@/lib/firebase';
import { adminFetch } from '@/hooks/use-admin';
import { AlertTriangle, MessageCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type Tab = 'open' | 'investigating' | 'resolved';

const REASON_LABELS: Record<string, string> = {
  listing_misleading: 'Annonce trompeuse',
  electricity_outage: 'Coupures électricité',
  water_outage: 'Coupures eau',
  cleanliness: 'Insalubrité',
  host_no_show: 'Hôte injoignable',
  guest_damage: 'Dégâts voyageur',
  payment_issue: 'Problème paiement',
  other: 'Autre',
};

export default function AdminDisputesPage() {
  const [tab, setTab] = useState<Tab>('open');
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [bookingInfo, setBookingInfo] = useState<any>(null);
  const [resolution, setResolution] = useState<string>('no_action');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionAmount, setResolutionAmount] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'disputes'),
      where('status', '==', tab),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDisputes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tab]);

  useEffect(() => {
    if (!selected?.bookingId) {
      setBookingInfo(null);
      return;
    }
    getDoc(doc(db, 'bookings', selected.bookingId))
      .then((s) => setBookingInfo(s.exists() ? { id: s.id, ...s.data() } : null))
      .catch(() => setBookingInfo(null));
  }, [selected?.bookingId]);

  const resolve = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await adminFetch('/api/boss/disputes/resolve', {
        method: 'POST',
        body: JSON.stringify({
          disputeId: selected.id,
          resolution,
          resolutionAmount,
          adminNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur');
      }
      setSelected(null);
      setAdminNotes('');
      setResolutionAmount(0);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Litiges</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Médiation des conflits voyageur/hôte. Vous pouvez rembourser, libérer les fonds ou saisir la caution.
        </p>
      </div>

      <div className="border-b border-zinc-200 flex gap-6 text-sm">
        {(
          [
            { key: 'open', label: 'Ouverts' },
            { key: 'investigating', label: 'En cours' },
            { key: 'resolved', label: 'Résolus' },
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
      ) : disputes.length === 0 ? (
        <div className="text-center py-12 text-sm text-zinc-500 bg-zinc-50 rounded-lg">
          Aucun litige dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-2">
          {disputes.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelected(d)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition text-left flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-md bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900">
                  {REASON_LABELS[d.reason] ?? d.reason}
                </div>
                <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{d.description}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  Ouvert par {d.openedByRole} ·{' '}
                  {d.createdAt
                    ? new Date(
                        typeof d.createdAt === 'string' ? d.createdAt : d.createdAt.toDate()
                      ).toLocaleDateString('fr-FR')
                    : '—'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-zinc-900">
                Litige — {REASON_LABELS[selected.reason]}
              </h2>
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-600 text-2xl">
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <div className="text-xs text-zinc-500 mb-1">Description</div>
                <p className="text-sm text-zinc-700 whitespace-pre-line">{selected.description}</p>
              </div>

              {selected.evidenceUrls?.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 mb-2">Preuves</div>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.evidenceUrls.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-md overflow-hidden bg-zinc-100 block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`preuve ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {bookingInfo && (
                <div className="bg-zinc-50 rounded-lg p-4">
                  <div className="text-xs text-zinc-500 mb-2">Réservation concernée</div>
                  <div className="text-sm font-medium">{bookingInfo.listingTitle}</div>
                  <div className="text-xs text-zinc-600 mt-1">
                    Montant : {bookingInfo.totalPrice?.toLocaleString('fr-FR')} FCFA · Statut :{' '}
                    {bookingInfo.status} · Check-in : {bookingInfo.checkInStatus}
                  </div>
                </div>
              )}

              {selected.status !== 'resolved' && (
                <div className="border-t border-zinc-200 pt-4 space-y-3">
                  {actionError && (
                    <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{actionError}</div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-zinc-900 block mb-1">Résolution</label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
                    >
                      <option value="no_action">Aucune action (litige non fondé)</option>
                      <option value="refund_guest">Rembourser le voyageur (total)</option>
                      <option value="partial_refund">Remboursement partiel</option>
                      <option value="release_to_host">Libérer les fonds à l'hôte</option>
                      <option value="claim_caution">Saisir la caution (au profit de l'hôte)</option>
                    </select>
                  </div>

                  {resolution === 'partial_refund' && (
                    <div>
                      <label className="text-sm font-medium text-zinc-900 block mb-1">
                        Montant à rembourser (FCFA)
                      </label>
                      <input
                        type="number"
                        value={resolutionAmount}
                        onChange={(e) => setResolutionAmount(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-zinc-900 block mb-1">Notes admin</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      placeholder="Justification de la décision…"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
                    />
                  </div>

                  <button
                    onClick={resolve}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Appliquer la résolution
                  </button>
                </div>
              )}

              {selected.status === 'resolved' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-sm text-emerald-900">
                  <div className="font-medium">Litige résolu</div>
                  <div className="text-xs mt-1">Résolution : {selected.resolution}</div>
                  {selected.adminNotes && (
                    <div className="text-xs mt-1 italic">"{selected.adminNotes}"</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
