'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { bossDb as db } from '@/lib/firebase';
import { Sparkles, Plus, Trash2, Loader2, Star, UserRound } from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  type: string;
  city: string;
  neighborhood?: string;
  description?: string;
  discount?: string;
  distance?: string;
  sponsored?: boolean;
  active?: boolean;
}

const TYPES = ['Restaurant', 'Plat local', 'Marché', 'Distraction / Loisir', 'Sortie / Nightlife', 'Attraction', 'Expérience', 'Réduction'];
const empty = { title: '', type: 'Restaurant', city: 'Bamako', neighborhood: '', description: '', discount: '', distance: '', sponsored: false, active: true };

interface Ambassador {
  id: string;
  name: string;
  city: string;
  neighborhood?: string;
  specialty?: string;
  bio?: string;
  whatsapp?: string;
  verified?: boolean;
  active?: boolean;
}
const emptyAmb = { name: '', city: 'Bamako', neighborhood: '', specialty: '', bio: '', whatsapp: '', verified: false, active: true };

export default function BossDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [ambs, setAmbs] = useState<Ambassador[]>([]);
  const [ambForm, setAmbForm] = useState<any>(emptyAmb);
  const [ambSaving, setAmbSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'localDeals'), orderBy('createdAt', 'desc'));
    const unsub1 = onSnapshot(q, (snap) => {
      setDeals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Deal)));
    }, (e) => setError(e.message));
    const unsub2 = onSnapshot(query(collection(db, 'guideAmbassadors'), orderBy('createdAt', 'desc')), (snap) => {
      setAmbs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ambassador)));
    }, (e) => setError(e.message));
    return () => { unsub1(); unsub2(); };
  }, []);

  const addAmb = async () => {
    if (!ambForm.name.trim() || !ambForm.city.trim()) { setError('Nom et ville requis.'); return; }
    setAmbSaving(true); setError('');
    try {
      await addDoc(collection(db, 'guideAmbassadors'), { ...ambForm, createdAt: new Date().toISOString() });
      setAmbForm(emptyAmb);
    } catch (e: any) { setError(e.message); }
    finally { setAmbSaving(false); }
  };
  const toggleAmb = async (a: Ambassador) => {
    try { await updateDoc(doc(db, 'guideAmbassadors', a.id), { active: !a.active }); } catch (e: any) { setError(e.message); }
  };
  const removeAmb = async (a: Ambassador) => {
    if (!confirm(`Supprimer l'ambassadeur « ${a.name} » ?`)) return;
    try { await deleteDoc(doc(db, 'guideAmbassadors', a.id)); } catch (e: any) { setError(e.message); }
  };

  const add = async () => {
    if (!form.title.trim() || !form.city.trim()) { setError('Titre et ville requis.'); return; }
    setSaving(true); setError('');
    try {
      await addDoc(collection(db, 'localDeals'), { ...form, createdAt: new Date().toISOString() });
      setForm(empty);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (d: Deal) => {
    try { await updateDoc(doc(db, 'localDeals', d.id), { active: !d.active }); } catch (e: any) { setError(e.message); }
  };
  const remove = async (d: Deal) => {
    if (!confirm(`Supprimer « ${d.title} » ?`)) return;
    try { await deleteDoc(doc(db, 'localDeals', d.id)); } catch (e: any) { setError(e.message); }
  };

  const input = 'w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 grid place-items-center"><Sparkles className="w-5 h-5" /></div>
        <div>
          <h1 className="text-xl font-semibold text-white">Bons plans géolocalisés</h1>
          <p className="text-sm text-zinc-400">Adresses et réductions montrées aux voyageurs de chaque ville (après réservation).</p>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300">{error}</div>}

      {/* Formulaire d'ajout */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-white">Ajouter un bon plan</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className={input} placeholder="Nom (ex: Restaurant Le Bafing)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className={input} placeholder="Ville (doit correspondre aux annonces)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className={input} placeholder="Quartier (optionnel)" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
          <input className={input} placeholder="Distance (ex: à 5 min à pied)" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} />
          <input className={input} placeholder="Réduction (ex: -10% sur présentation Awder)" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        </div>
        <textarea className={input} rows={2} placeholder="Description courte" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={form.sponsored} onChange={(e) => setForm({ ...form, sponsored: e.target.checked })} />
          <Star className="w-4 h-4 text-orange-400" /> Partenaire sponsorisé (badge + priorité d'affichage)
        </label>
        <button onClick={add} disabled={saving} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter
        </button>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-white">{deals.length} bon{deals.length > 1 ? 's' : ''} plan{deals.length > 1 ? 's' : ''}</p>
        {deals.map((d) => (
          <div key={d.id} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white text-sm truncate">{d.title}</p>
                {d.sponsored && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded text-[10px]">Partenaire</span>}
                {d.discount && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">{d.discount}</span>}
              </div>
              <p className="text-xs text-zinc-400 truncate">{[d.type, d.city, d.neighborhood].filter(Boolean).join(' · ')}</p>
            </div>
            <button onClick={() => toggleActive(d)} className={`text-xs px-2.5 py-1 rounded-md ${d.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-700/50 text-zinc-400'}`}>
              {d.active ? 'Actif' : 'Inactif'}
            </button>
            <button onClick={() => remove(d)} className="text-zinc-500 hover:text-red-400 p-1" aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {deals.length === 0 && <p className="text-sm text-zinc-500 py-6 text-center">Aucun bon plan pour l&apos;instant. Ajoutez-en un ci-dessus.</p>}
      </div>

      {/* ─── Ambassadeurs Guide ─── */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 grid place-items-center"><UserRound className="w-5 h-5" /></div>
        <div>
          <h2 className="text-xl font-semibold text-white">Ambassadeurs guides</h2>
          <p className="text-sm text-zinc-400">Des locaux (personnes physiques) qui accompagnent les voyageurs de chaque ville.</p>
        </div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-white">Ajouter un ambassadeur</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className={input} placeholder="Nom complet" value={ambForm.name} onChange={(e) => setAmbForm({ ...ambForm, name: e.target.value })} />
          <input className={input} placeholder="Spécialité (ex: guide culturel, gastronomie)" value={ambForm.specialty} onChange={(e) => setAmbForm({ ...ambForm, specialty: e.target.value })} />
          <input className={input} placeholder="Ville" value={ambForm.city} onChange={(e) => setAmbForm({ ...ambForm, city: e.target.value })} />
          <input className={input} placeholder="Quartier (optionnel)" value={ambForm.neighborhood} onChange={(e) => setAmbForm({ ...ambForm, neighborhood: e.target.value })} />
          <input className={input} placeholder="WhatsApp (+223…)" value={ambForm.whatsapp} onChange={(e) => setAmbForm({ ...ambForm, whatsapp: e.target.value })} />
        </div>
        <textarea className={input} rows={2} placeholder="Bio courte" value={ambForm.bio} onChange={(e) => setAmbForm({ ...ambForm, bio: e.target.value })} />
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={ambForm.verified} onChange={(e) => setAmbForm({ ...ambForm, verified: e.target.checked })} />
          Ambassadeur vérifié (badge Koron)
        </label>
        <button onClick={addAmb} disabled={ambSaving} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50">
          {ambSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter l&apos;ambassadeur
        </button>
      </div>

      <div className="space-y-2">
        {ambs.map((a) => (
          <div key={a.id} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-3">
            <div className="w-9 h-9 shrink-0 rounded-full bg-zinc-700 text-zinc-200 grid place-items-center text-sm font-medium">{(a.name || 'G')[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white text-sm truncate">{a.name}</p>
                {a.verified && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded text-[10px]">Koron</span>}
              </div>
              <p className="text-xs text-zinc-400 truncate">{[a.specialty, a.city, a.neighborhood].filter(Boolean).join(' · ')}</p>
            </div>
            <button onClick={() => toggleAmb(a)} className={`text-xs px-2.5 py-1 rounded-md ${a.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-700/50 text-zinc-400'}`}>
              {a.active ? 'Actif' : 'Inactif'}
            </button>
            <button onClick={() => removeAmb(a)} className="text-zinc-500 hover:text-red-400 p-1" aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {ambs.length === 0 && <p className="text-sm text-zinc-500 py-6 text-center">Aucun ambassadeur pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
