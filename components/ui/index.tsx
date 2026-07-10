'use client';

/**
 * Awder UI — composants partagés « Terres du Sahel »
 * Règles : ocre = action, or = confiance ; serif pour les titres ;
 * rayons mesurés (cartes 16px, contrôles 12px) ; zéro émoji d'UI.
 */

import React from 'react';
import { ShieldCheck, Zap, Droplets, Wifi } from 'lucide-react';

/* ============ Logo arche Awder ============ */
export function AwderLogo({ className = 'w-8 h-10', withWordmark = false, wordmarkClass = 'text-lg' }: { className?: string; withWordmark?: boolean; wordmarkClass?: string }) {
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 120" fill="none" className={className} aria-hidden="true">
        <path d="M18 120 V52 Q18 20 50 6 Q82 20 82 52 V120" stroke="#A64B2A" strokeWidth="7" strokeLinejoin="round" />
        <path d="M36 120 V60 Q36 40 50 30 Q64 40 64 60 V120" stroke="#A64B2A" strokeWidth="4.5" />
        <path d="M44 120 V70 Q44 60 50 55 Q56 60 56 70 V120" fill="#C2A350" />
      </svg>
      {withWordmark && <span className={`awder-wordmark ${wordmarkClass}`}>AWDER</span>}
    </span>
  );
}

/* ============ Bouton ============ */
type ButtonVariant = 'primary' | 'trust' | 'ghost' | 'dark';
export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base = 'font-semibold text-[15px] rounded-xl px-6 py-3.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2';
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-awder-ocre text-white shadow-[0_10px_22px_-8px_rgba(166,75,42,0.55)] hover:bg-awder-ocre-deep',
    trust: 'bg-awder-gold text-awder-brun-deep hover:bg-awder-gold-soft',
    ghost: 'bg-transparent text-awder-brun border-[1.5px] border-awder-brun/25 hover:border-awder-brun',
    dark: 'bg-awder-brun text-white hover:bg-awder-brun-deep',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/* ============ Badge ============ */
type BadgeVariant = 'koron' | 'success' | 'guarantee' | 'neutral' | 'category';
export function Badge({ variant = 'neutral', icon, children, className = '' }: { variant?: BadgeVariant; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const variants: Record<BadgeVariant, string> = {
    koron: 'bg-awder-gold text-awder-brun-deep',
    success: 'bg-awder-bogolan/15 text-awder-bogolan border border-awder-bogolan/30',
    guarantee: 'bg-awder-gold/15 text-awder-gold border border-awder-gold/35',
    neutral: 'bg-awder-sable text-awder-grisbrun',
    category: 'bg-white/90 text-awder-ocre',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${variants[variant]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

/* Badge Koron avec bouclier intégré */
export function KoronBadge({ className = '' }: { className?: string }) {
  return (
    <Badge variant="koron" className={className} icon={<ShieldCheck className="w-3.5 h-3.5" />}>
      Hôte Koron
    </Badge>
  );
}

/* ============ StatCard ============ */
export function StatCard({ label, value, accent = false, className = '' }: { label: string; value: React.ReactNode; accent?: boolean; className?: string }) {
  return (
    <div className={`bg-white border border-awder-sable rounded-2xl p-4 ${className}`}>
      <p className="awder-label text-awder-grisbrun">{label}</p>
      <p className={`font-display font-semibold text-2xl mt-1.5 tracking-tight ${accent ? 'text-awder-ocre' : 'text-awder-brun'}`}>{value}</p>
    </div>
  );
}

/* ============ SectionHeader ============ */
export function SectionHeader({ title, sub, action, className = '' }: { title: string; sub?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-end justify-between gap-3 ${className}`}>
      <div>
        <h3 className="font-display font-semibold text-xl text-awder-brun tracking-tight">{title}</h3>
        {sub && <p className="awder-label text-awder-gold mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ============ BogolanBackdrop — motif mud-cloth subtil ============ */
const BOGOLAN_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='84' height='84' viewBox='0 0 84 84'%3E%3Cg fill='none' stroke='%23000' stroke-width='2'%3E%3Cpath d='M0 42h84M42 0v84'/%3E%3Cpath d='M12 12l18 18-18 18M72 12L54 30l18 18'/%3E%3C/g%3E%3Cg fill='%23000'%3E%3Ccircle cx='42' cy='42' r='3'/%3E%3Ccircle cx='6' cy='6' r='2'/%3E%3Ccircle cx='78' cy='6' r='2'/%3E%3Ccircle cx='6' cy='78' r='2'/%3E%3Ccircle cx='78' cy='78' r='2'/%3E%3C/g%3E%3C/svg%3E")`;

export function BogolanBackdrop({ color = 'rgba(78,52,46,0.05)', className = '' }: { color?: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundColor: color,
        WebkitMaskImage: BOGOLAN_URI,
        maskImage: BOGOLAN_URI,
        WebkitMaskSize: '84px 84px',
        maskSize: '84px 84px',
      }}
    />
  );
}

/* ============ EmptyState — avec chaleur ============ */
export function EmptyState({ icon, title, sub, action, className = '' }: { icon: React.ReactNode; title: string; sub?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden text-center py-14 px-6 bg-awder-sable/50 rounded-2xl ${className}`}>
      <BogolanBackdrop />
      <div className="relative">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-white text-awder-ocre flex items-center justify-center shadow-[var(--shadow-warm-sm)]">
          {icon}
        </div>
        <p className="font-display font-semibold text-lg text-awder-brun mt-4">{title}</p>
        {sub && <p className="text-sm text-awder-grisbrun mt-1 max-w-[32ch] mx-auto">{sub}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

/* ============ TrustStrip — bandeau séquestre Sira-Djou ============ */
export function TrustStrip({ text, className = '' }: { text?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-2xl bg-awder-ocre/[0.06] border border-awder-ocre/15 ${className}`}>
      <ShieldCheck className="w-5 h-5 text-awder-ocre shrink-0" />
      <p className="text-[13px] leading-snug text-awder-brun">
        {text ?? (
          <>Paiement gardé en séquestre par <span className="font-display font-semibold italic text-awder-ocre">Awder</span> Sira-Djou, libéré à l&apos;hôte après votre séjour.</>
        )}
      </p>
    </div>
  );
}

/* ============ GuaranteeRow — Sira-Yiriwa ============ */
export type GuaranteeKind = 'power' | 'water' | 'wifi';
const GUARANTEE_ICONS: Record<GuaranteeKind, React.ReactNode> = {
  power: <Zap className="w-5 h-5" />,
  water: <Droplets className="w-5 h-5" />,
  wifi: <Wifi className="w-5 h-5" />,
};

export function GuaranteeRow({ kind, title, sub, className = '' }: { kind: GuaranteeKind; title: string; sub: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3.5 p-3.5 bg-white border border-awder-sable rounded-2xl ${className}`}>
      <span className="w-10 h-10 shrink-0 rounded-xl bg-awder-gold/15 text-awder-gold grid place-items-center">
        {GUARANTEE_ICONS[kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm text-awder-brun">{title}</p>
        <p className="text-xs text-awder-grisbrun">{sub}</p>
      </div>
      <ShieldCheck className="w-[18px] h-[18px] text-awder-gold shrink-0" />
    </div>
  );
}

/* ============ VoiceNotePlayer ============ */
export function VoiceNotePlayer({ src, className = '' }: { src: string; className?: string }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-awder-sable ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Mettre en pause' : 'Écouter la note vocale'}
        className="w-10 h-10 shrink-0 rounded-full bg-awder-ocre text-white grid place-items-center active:scale-95 transition-transform"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="flex items-center gap-[3px] flex-1 h-6" aria-hidden="true">
        {[10, 16, 22, 13, 19, 24, 15, 21, 11, 18, 23, 14, 20, 10, 16, 22, 12, 18, 24, 13].map((h, i) => (
          <span key={i} className="w-[3px] rounded-full bg-awder-ocre/55" style={{ height: `${h}px` }} />
        ))}
      </div>
      <span className="font-mono text-[11px] text-awder-grisbrun">Itinéraire</span>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
