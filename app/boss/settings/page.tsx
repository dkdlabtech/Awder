'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { bossDb as db } from '@/lib/firebase';
import { adminFetch } from '@/hooks/use-admin';
import { Save, Loader2, Info } from 'lucide-react';

interface ConfigForm {
  hostCommissionRate: number;
  guestServiceFeeRate: number;
  servicesCommissionRate: number;
  verifiedHostDiscount: number;
  zeroCommissionPromo: boolean;
  zeroCommissionUntil: string;
  minBookingAmount: number;
  maxBookingAmount: number;
}

const DEFAULTS: ConfigForm = {
  hostCommissionRate: 0.05,
  guestServiceFeeRate: 0.03,
  servicesCommissionRate: 0.15,
  verifiedHostDiscount: 0.04,
  zeroCommissionPromo: false,
  zeroCommissionUntil: '',
  minBookingAmount: 5000,
  maxBookingAmount: 10_000_000,
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<ConfigForm>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'platform', 'config'))
      .then((s) => {
        if (s.exists()) {
          const data = s.data() as any;
          setForm({
            hostCommissionRate: data.hostCommissionRate ?? DEFAULTS.hostCommissionRate,
            guestServiceFeeRate: data.guestServiceFeeRate ?? DEFAULTS.guestServiceFeeRate,
            servicesCommissionRate: data.servicesCommissionRate ?? DEFAULTS.servicesCommissionRate,
            verifiedHostDiscount: data.verifiedHostDiscount ?? DEFAULTS.verifiedHostDiscount,
            zeroCommissionPromo: data.zeroCommissionPromo ?? false,
            zeroCommissionUntil: data.zeroCommissionUntil
              ? new Date(
                  typeof data.zeroCommissionUntil === 'string'
                    ? data.zeroCommissionUntil
                    : data.zeroCommissionUntil.toDate()
                )
                  .toISOString()
                  .slice(0, 10)
              : '',
            minBookingAmount: data.minBookingAmount ?? DEFAULTS.minBookingAmount,
            maxBookingAmount: data.maxBookingAmount ?? DEFAULTS.maxBookingAmount,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const onChange = <K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await adminFetch('/api/boss/config', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          zeroCommissionUntil: form.zeroCommissionUntil
            ? new Date(form.zeroCommissionUntil).toISOString()
            : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur');
      }
      setMsg({ type: 'ok', text: 'Paramètres sauvegardés.' });
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-zinc-500">Chargement…</div>;

  const PercentInput = ({
    label,
    value,
    onChange,
    description,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    description?: string;
  }) => (
    <div>
      <label className="text-sm font-medium text-zinc-900">{label}</label>
      {description && <p className="text-xs text-zinc-500 mt-0.5 mb-2">{description}</p>}
      <div className="relative max-w-[160px]">
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={Math.round(value * 1000) / 10}
          onChange={(e) => onChange(parseFloat(e.target.value) / 100)}
          className="w-full pl-3 pr-8 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Paramètres de la plateforme</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ajustez les commissions et les limites. Les modifications prennent effet immédiatement.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-sm">
        <Info className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="text-blue-900">
          <strong>Stratégie Awder :</strong> 5% sur l'hôte (vs 14-16% Airbnb) + 3% sur le voyageur (transparent). Les hôtes "Awder Vérifié" bénéficient d'une commission réduite à 4% à vie.
        </div>
      </div>

      {/* Commissions */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-5">
        <h2 className="text-base font-semibold text-zinc-900">Commissions</h2>

        <PercentInput
          label="Commission hôte standard"
          value={form.hostCommissionRate}
          onChange={(v) => onChange('hostCommissionRate', v)}
          description="Prélevée sur le montant que touche l'hôte (recommandé: 5%)"
        />

        <PercentInput
          label="Commission hôte 'Awder Vérifié'"
          value={form.verifiedHostDiscount}
          onChange={(v) => onChange('verifiedHostDiscount', v)}
          description="Tarif réduit pour les hôtes visités par un agent (recommandé: 4%)"
        />

        <PercentInput
          label="Frais de service voyageur"
          value={form.guestServiceFeeRate}
          onChange={(v) => onChange('guestServiceFeeRate', v)}
          description="Affichés clairement avant paiement (recommandé: 3%)"
        />

        <PercentInput
          label="Commission services tiers"
          value={form.servicesCommissionRate}
          onChange={(v) => onChange('servicesCommissionRate', v)}
          description="Sur chef, conciergerie, ménage (recommandé: 15%)"
        />
      </div>

      {/* Promotion */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Promotion d'acquisition</h2>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.zeroCommissionPromo}
            onChange={(e) => onChange('zeroCommissionPromo', e.target.checked)}
            className="w-4 h-4 text-orange-600"
          />
          <span className="text-sm text-zinc-900">
            Activer "0% de commission" pour tous les hôtes
          </span>
        </label>

        {form.zeroCommissionPromo && (
          <div>
            <label className="text-sm text-zinc-900 block mb-1">Jusqu'à la date</label>
            <input
              type="date"
              value={form.zeroCommissionUntil}
              onChange={(e) => onChange('zeroCommissionUntil', e.target.value)}
              className="px-3 py-2 text-sm border border-zinc-300 rounded-md"
            />
          </div>
        )}
      </div>

      {/* Limites */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Limites de réservation</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-900 block mb-1">Montant minimum (FCFA)</label>
            <input
              type="number"
              value={form.minBookingAmount}
              onChange={(e) => onChange('minBookingAmount', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-900 block mb-1">Montant maximum (FCFA)</label>
            <input
              type="number"
              value={form.maxBookingAmount}
              onChange={(e) => onChange('maxBookingAmount', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
        {msg && (
          <span className={`text-sm ${msg.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
