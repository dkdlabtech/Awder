'use client';

/**
 * Générique de lancement Awder — fond sable clair + motif bogolan (style maquette),
 * logo arche qui se dessine, wordmark AWDER en ocre, accueil en script.
 * Affiché ~5 s au démarrage puis fondu. Une seule fois par session.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BogolanBackdrop } from './index';

const SPLASH_DURATION_MS = 5000;

export function SplashScreen() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('awder_splash_seen')) return;
    const show = setTimeout(() => setVisible(true), 0);
    const hide = setTimeout(() => {
      sessionStorage.setItem('awder_splash_seen', '1');
      setVisible(false);
    }, SPLASH_DURATION_MS);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: '#efeae1' }}
        >
          {/* Motif bogolan — même style que la maquette validée */}
          <BogolanBackdrop color="rgba(78,52,46,0.06)" />

          <div className="relative flex flex-col items-center gap-5 px-8 text-center">
            {/* Logo arche — tracé animé */}
            <motion.svg
              viewBox="0 0 100 120"
              className="w-24 h-28"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              aria-hidden="true"
            >
              <motion.path
                d="M18 120 V52 Q18 20 50 6 Q82 20 82 52 V120"
                stroke="#A64B2A" strokeWidth="6" fill="none" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />
              <motion.path
                d="M36 120 V60 Q36 40 50 30 Q64 40 64 60 V120"
                stroke="#A64B2A" strokeWidth="4" fill="none"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.35 }}
              />
              <motion.path
                d="M44 120 V70 Q44 60 50 55 Q56 60 56 70 V120"
                fill="#C2A350"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
              />
            </motion.svg>

            <motion.p
              className="awder-wordmark text-3xl"
              initial={{ opacity: 0, letterSpacing: '0.7em' }}
              animate={{ opacity: 1, letterSpacing: '0.4em' }}
              transition={{ duration: 1, delay: 0.7 }}
            >
              AWDER
            </motion.p>

            <motion.p
              className="font-script text-3xl text-awder-brun"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.5 }}
            >
              Bienvenue chez vous
            </motion.p>

            <motion.p
              className="text-[15px] text-awder-grisbrun max-w-[26ch] leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 2.2 }}
            >
              Votre chez-vous, partout chez nous.
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
