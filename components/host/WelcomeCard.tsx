'use client';

/**
 * Carte de bienvenue Awder — générée pour la déco de l'hôte.
 * Personnalisée avec le prénom du voyageur, imprimable (window.print → PDF).
 * Style « Terres du Sahel » : crème, logo arche + AWDER en ocre, script, botanique dorée.
 */

import React from 'react';
import { X, Printer } from 'lucide-react';

interface WelcomeCardProps {
  guestName: string;
  hostName: string;
  onClose: () => void;
}

export function WelcomeCard({ guestName, hostName, onClose }: WelcomeCardProps) {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const w = window.open('', '_blank', 'width=900,height=650');
    if (!w) { alert('Autorisez les fenêtres pop-up pour imprimer la carte.'); return; }
    w.document.write(`<!doctype html><html><head><title>Carte de bienvenue Awder</title>
      <style>
        @page { size: landscape; margin: 0; }
        body { margin: 0; display: grid; place-items: center; min-height: 100vh; background: #fff; }
      </style></head><body>${node.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  const firstName = (guestName || 'Cher voyageur').split(' ')[0];
  const hostFirstName = (hostName || 'Votre hôte').split(' ')[0];

  return (
    <div className="fixed inset-0 z-[200] bg-awder-brun-deep/92 backdrop-blur-md flex flex-col items-center justify-center p-4 gap-5 overflow-y-auto">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h3 className="font-display font-semibold text-white text-lg">Carte de bienvenue</h3>
        <button onClick={onClose} className="p-2.5 bg-white/10 rounded-full text-white" aria-label="Fermer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* La carte (échelle écran ; s'imprime en paysage) */}
      <div
        ref={printRef}
        style={{
          width: 'min(92vw, 640px)',
          aspectRatio: '1.42 / 1',
          background: '#FBF8F2',
          borderRadius: 8,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'var(--font-body, system-ui, sans-serif)',
          color: '#5C463F',
          boxShadow: '0 30px 70px -30px rgba(53,33,28,.6)',
        }}
      >
        {/* double cadre doré */}
        <div style={{ position: 'absolute', inset: 14, border: '1px solid #CBB27B', borderRadius: 4, opacity: .6, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 20, border: '1px solid #CBB27B', borderRadius: 3, opacity: .4, pointerEvents: 'none' }} />

        {/* arches décoratives gauche */}
        <svg viewBox="0 0 200 260" fill="none" stroke="#C2A350" strokeWidth="1.4"
          style={{ position: 'absolute', left: -8, top: '22%', width: '20%', opacity: .45 }} aria-hidden="true">
          <path d="M10 260 V120 Q10 60 70 30 Q130 60 130 120 V260" />
          <path d="M34 260 V132 Q34 82 78 56 Q122 82 122 132 V260" />
          <path d="M58 260 V146 Q58 104 86 84 Q114 104 114 146 V260" />
        </svg>

        {/* branche botanique droite */}
        <svg viewBox="0 0 230 300" fill="none" stroke="#C2A350" strokeWidth="1.3"
          style={{ position: 'absolute', right: 4, top: 20, width: '24%', opacity: .85 }} aria-hidden="true">
          <path d="M150 300 C150 230 150 150 120 70 C108 40 92 18 70 4" />
          <g fill="#D8BE78" stroke="none" opacity=".8">
            <ellipse cx="142" cy="238" rx="26" ry="9" transform="rotate(-32 142 238)" />
            <ellipse cx="158" cy="210" rx="27" ry="9" transform="rotate(28 158 210)" />
            <ellipse cx="132" cy="196" rx="25" ry="8.5" transform="rotate(-38 132 196)" />
            <ellipse cx="150" cy="168" rx="26" ry="9" transform="rotate(24 150 168)" />
            <ellipse cx="120" cy="150" rx="24" ry="8" transform="rotate(-42 120 150)" />
            <ellipse cx="136" cy="122" rx="24" ry="8.5" transform="rotate(20 136 122)" />
            <ellipse cx="104" cy="104" rx="22" ry="7.5" transform="rotate(-46 104 104)" />
            <ellipse cx="118" cy="78" rx="21" ry="8" transform="rotate(16 118 78)" />
          </g>
        </svg>

        {/* contenu */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', padding: '5% 15% 4%',
        }}>
          <svg viewBox="0 0 100 120" fill="none" style={{ width: '9%', marginBottom: 2 }} aria-hidden="true">
            <path d="M18 120 V52 Q18 20 50 6 Q82 20 82 52 V120" stroke="#A64B2A" strokeWidth="6" strokeLinejoin="round" />
            <path d="M36 120 V60 Q36 40 50 30 Q64 40 64 60 V120" stroke="#A64B2A" strokeWidth="4" />
            <path d="M44 120 V70 Q44 60 50 55 Q56 60 56 70 V120" fill="#C2A350" />
          </svg>
          <p style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 600, color: '#A64B2A', letterSpacing: '.42em', textIndent: '.42em', fontSize: 'clamp(14px, 3.4vw, 24px)', margin: '2px 0' }}>AWDER</p>

          <p style={{ fontFamily: 'var(--font-script, cursive)', color: '#A64B2A', fontSize: 'clamp(30px, 8vw, 56px)', lineHeight: .95, margin: '4px 0 0' }}>Bienvenue</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 'clamp(8px, 1.6vw, 11px)', letterSpacing: '.22em', textTransform: 'uppercase', color: '#B4934A' }}>Cher(ère)</span>
            <span style={{ fontFamily: 'var(--font-script, cursive)', fontSize: 'clamp(20px, 5vw, 34px)', borderBottom: '1px solid #CBB27B', padding: '0 12px 2px', lineHeight: 1 }}>{firstName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '58%', margin: 'clamp(8px, 2.4vw, 16px) 0', color: '#B4934A' }} aria-hidden="true">
            <span style={{ height: 1, flex: 1, background: '#CBB27B' }} />
            <svg viewBox="0 0 24 24" fill="#A64B2A" style={{ width: 13, height: 13 }}><path d="M12 21s-7-4.6-9.2-9C1.3 8.6 3 5 6.5 5 9 5 10.6 6.8 12 8.8 13.4 6.8 15 5 17.5 5 21 5 22.7 8.6 21.2 12 19 16.4 12 21 12 21z" /></svg>
            <span style={{ height: 1, flex: 1, background: '#CBB27B' }} />
          </div>

          <p style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(11px, 2.6vw, 17px)', lineHeight: 1.5, maxWidth: '32ch', margin: 0 }}>
            Nous sommes ravis de vous accueillir. Nous avons préparé ce lieu avec soin pour que vous vous y sentiez comme chez vous.
          </p>
          <p style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(10px, 2.3vw, 15px)', lineHeight: 1.5, maxWidth: '32ch', margin: 'clamp(6px, 1.8vw, 12px) 0 0', opacity: .85 }}>
            N&apos;hésitez pas à nous contacter si vous avez la moindre question ou besoin.
          </p>

          <p style={{ fontFamily: 'var(--font-script, cursive)', fontSize: 'clamp(16px, 4vw, 26px)', color: '#A64B2A', margin: 'clamp(8px, 2.4vw, 16px) 0 0' }}>
            Profitez pleinement de votre séjour !
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(10px, 2.4vw, 16px)', margin: 'clamp(4px, 1.4vw, 10px) 0 0' }}>
            <svg viewBox="0 0 24 24" fill="#A64B2A" style={{ width: 12, height: 12 }}><path d="M12 21s-7-4.6-9.2-9C1.3 8.6 3 5 6.5 5 9 5 10.6 6.8 12 8.8 13.4 6.8 15 5 17.5 5 21 5 22.7 8.6 21.2 12 19 16.4 12 21 12 21z" /></svg>
            Votre hôte, {hostFirstName}
          </p>
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="px-7 py-3.5 bg-awder-ocre text-white rounded-xl font-semibold text-sm flex items-center gap-2.5 shadow-[0_10px_22px_-8px_rgba(166,75,42,0.6)] active:scale-[0.98] transition-all"
      >
        <Printer className="w-4 h-4" /> Imprimer / Enregistrer en PDF
      </button>
      <p className="text-white/60 text-xs text-center max-w-xs">Imprimez-la en paysage et placez-la dans le logement avant l&apos;arrivée de {firstName}.</p>
    </div>
  );
}
