'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { bossDb as db } from '@/lib/firebase';
import {
  TrendingUp,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Home as HomeIcon,
  ArrowUpRight,
  Banknote,
} from 'lucide-react';

interface KPIs {
  totalEscrow: number;
  totalCommission: number;
  pendingListings: number;
  openDisputes: number;
  activeBookings: number;
  totalUsers: number;
  totalHosts: number;
  completedBookings: number;
}

function formatXOF(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  href,
  accent = 'zinc',
}: {
  label: string;
  value: string | number;
  icon: any;
  trend?: string;
  href?: string;
  accent?: 'zinc' | 'emerald' | 'amber' | 'red' | 'blue';
}) {
  const accents: Record<string, string> = {
    zinc: 'bg-zinc-100 text-zinc-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  const inner = (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 hover:border-zinc-300 transition">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${accents[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {href && <ArrowUpRight className="w-4 h-4 text-zinc-400" />}
      </div>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      {trend && <div className="text-xs text-zinc-500 mt-1">{trend}</div>}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function BossDashboard() {
  const [kpis, setKpis] = useState<KPIs>({
    totalEscrow: 0,
    totalCommission: 0,
    pendingListings: 0,
    openDisputes: 0,
    activeBookings: 0,
    totalUsers: 0,
    totalHosts: 0,
    completedBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    async function loadKPIs() {
      try {
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        const totalEscrow = walletsSnap.docs.reduce(
          (sum, doc) => sum + (doc.data().escrow ?? 0),
          0
        );

        const txSnap = await getDocs(
          query(
            collection(db, 'transactions'),
            where('type', '==', 'commission'),
            where('status', '==', 'completed')
          )
        );
        const totalCommission = txSnap.docs.reduce(
          (sum, doc) => sum + (doc.data().amount ?? 0),
          0
        );

        const listingsSnap = await getDocs(
          query(collection(db, 'listings'), where('moderationStatus', '==', 'pending_review'))
        );
        const pendingListings = listingsSnap.size;

        let openDisputes = 0;
        try {
          const dSnap = await getDocs(
            query(collection(db, 'disputes'), where('status', '==', 'open'))
          );
          openDisputes = dSnap.size;
        } catch {}

        const activeSnap = await getDocs(
          query(collection(db, 'bookings'), where('status', '==', 'paid_escrow'))
        );
        const activeBookings = activeSnap.size;

        const completedSnap = await getDocs(
          query(collection(db, 'bookings'), where('status', '==', 'completed'))
        );
        const completedBookings = completedSnap.size;

        const usersSnap = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnap.size;
        const totalHosts = usersSnap.docs.filter((d) => d.data().role === 'host').length;

        setKpis({
          totalEscrow,
          totalCommission,
          pendingListings,
          openDisputes,
          activeBookings,
          totalUsers,
          totalHosts,
          completedBookings,
        });

        try {
          const recentSnap = await getDocs(
            query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(10))
          );
          setRecentActivity(recentSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch {}
      } catch (e) {
        console.error('KPI load error:', e);
      } finally {
        setLoading(false);
      }
    }
    loadKPIs();
  }, []);

  if (loading) {
    return <div className="text-sm text-zinc-500">Chargement des indicateurs…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Vue d'ensemble</h1>
        <p className="text-sm text-zinc-500 mt-1">État de la plateforme Awder en temps réel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Escrow total (séquestre Sira-Djou)"
          value={formatXOF(kpis.totalEscrow)}
          icon={Lock}
          trend="Fonds bloqués actuellement"
          accent="amber"
        />
        <KPICard
          label="Commission Awder cumulée"
          value={formatXOF(kpis.totalCommission)}
          icon={TrendingUp}
          trend="Revenus plateforme"
          accent="emerald"
          href="/boss/transactions"
        />
        <KPICard
          label="Réservations actives"
          value={kpis.activeBookings}
          icon={CheckCircle2}
          trend={`${kpis.completedBookings} terminées au total`}
          accent="blue"
        />
        <KPICard
          label="Utilisateurs inscrits"
          value={kpis.totalUsers}
          icon={Users}
          trend={`dont ${kpis.totalHosts} hôtes`}
          accent="zinc"
          href="/boss/users"
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-700 mb-3">À traiter</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KPICard
            label="Annonces en attente de modération"
            value={kpis.pendingListings}
            icon={HomeIcon}
            accent={kpis.pendingListings > 0 ? 'amber' : 'zinc'}
            href="/boss/listings"
          />
          <KPICard
            label="Litiges ouverts"
            value={kpis.openDisputes}
            icon={AlertTriangle}
            accent={kpis.openDisputes > 0 ? 'red' : 'zinc'}
            href="/boss/disputes"
          />
        </div>
      </div>

      {recentActivity.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-700 mb-3">Activité financière récente</h2>
          <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
            {recentActivity.slice(0, 8).map((tx) => (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-900">{tx.description}</div>
                    <div className="text-xs text-zinc-500">
                      {tx.type} · {tx.status}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium text-zinc-900">{formatXOF(tx.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
