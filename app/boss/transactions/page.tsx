'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { bossDb as db } from '@/lib/firebase';
import { Banknote, TrendingUp, ArrowDownToLine, RefreshCcw, Percent } from 'lucide-react';

function formatXOF(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

const TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  payment: { label: 'Paiement', icon: Banknote, color: 'text-blue-600' },
  escrow_release: { label: 'Versement hôte', icon: ArrowDownToLine, color: 'text-emerald-600' },
  commission: { label: 'Commission Awder', icon: Percent, color: 'text-orange-600' },
  withdrawal: { label: 'Retrait', icon: ArrowDownToLine, color: 'text-zinc-600' },
  refund: { label: 'Remboursement', icon: RefreshCcw, color: 'text-amber-600' },
  service_fee: { label: 'Frais service', icon: TrendingUp, color: 'text-purple-600' },
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    const constraints: any[] = [orderBy('createdAt', 'desc'), limit(100)];
    if (typeFilter !== 'all') {
      constraints.unshift(where('type', '==', typeFilter));
    }
    const q = query(collection(db, 'transactions'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [typeFilter]);

  // Stats par type
  const stats = transactions.reduce((acc, t) => {
    if (!acc[t.type]) acc[t.type] = { count: 0, total: 0 };
    acc[t.type].count += 1;
    acc[t.type].total += t.amount ?? 0;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Transactions financières</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Historique complet des flux : paiements, commissions, remboursements, retraits.
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(stats).map(([type, s]: [string, any]) => {
          const info = TYPE_LABELS[type] ?? { label: type, icon: Banknote, color: 'text-zinc-600' };
          const Icon = info.icon;
          return (
            <div key={type} className="bg-white border border-zinc-200 rounded-lg p-3">
              <div className={`flex items-center gap-2 mb-1 ${info.color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{info.label}</span>
              </div>
              <div className="text-base font-semibold text-zinc-900">{formatXOF(s.total)}</div>
              <div className="text-xs text-zinc-500">{s.count} opérations</div>
            </div>
          );
        })}
      </div>

      {/* Filtre */}
      <div className="flex gap-1 text-sm overflow-x-auto">
        {['all', 'payment', 'escrow_release', 'commission', 'refund', 'service_fee', 'withdrawal'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              typeFilter === t ? 'bg-orange-100 text-orange-700 font-medium' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {t === 'all' ? 'Tout' : TYPE_LABELS[t]?.label ?? t}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-sm text-zinc-500 bg-zinc-50 rounded-lg">
          Aucune transaction.
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
          {transactions.map((tx) => {
            const info = TYPE_LABELS[tx.type] ?? { label: tx.type, icon: Banknote, color: 'text-zinc-600' };
            const Icon = info.icon;
            return (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center ${info.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-900 truncate">{tx.description}</div>
                    <div className="text-xs text-zinc-500">
                      {info.label} · {tx.status} ·{' '}
                      {tx.createdAt
                        ? new Date(
                            typeof tx.createdAt === 'string' ? tx.createdAt : tx.createdAt.toDate()
                          ).toLocaleString('fr-FR')
                        : '—'}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium text-zinc-900 ml-3 flex-shrink-0">
                  {formatXOF(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
