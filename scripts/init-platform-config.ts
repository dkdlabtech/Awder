/**
 * Initialise la collection `platform/config` avec les valeurs par défaut Awder.
 *
 * Usage : npx tsx scripts/init-platform-config.ts
 *
 * À lancer UNE SEULE FOIS après le premier déploiement.
 * Les valeurs peuvent ensuite être ajustées depuis /admin/settings.
 *
 * Pré-requis : fichier service account JSON Firebase (le même que pour seed-firestore.ts)
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const FIRESTORE_DB_ID = 'ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef';

// Charge le service account JSON directement (même pattern que seed-firestore.ts)
const serviceAccountPath = path.join(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    path.join(
      __dirname,
      '..',
      '..',
      '..',
      'gen-lang-client-0375007552-firebase-adminsdk-fbsvc-136ad5eadb.json'
    )
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account JSON introuvable à:', serviceAccountPath);
  console.error('   Exportez GOOGLE_APPLICATION_CREDENTIALS=<chemin/vers/le/fichier.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app: App =
  getApps().find((a) => a.name === 'init-config') ??
  initializeApp({ credential: cert(serviceAccount) }, 'init-config');

const db = getFirestore(app, FIRESTORE_DB_ID);

async function main() {
  const ref = db.collection('platform').doc('config');
  const existing = await ref.get();

  if (existing.exists) {
    console.log('⚠️  platform/config existe déjà. Aucune modification.');
    console.log('Valeurs actuelles :', existing.data());
    return;
  }

  const config = {
    // Commissions — stratégie Awder
    hostCommissionRate: 0.05,      // 5 % sur l'hôte standard
    guestServiceFeeRate: 0.03,     // 3 % sur le voyageur (transparent)
    servicesCommissionRate: 0.15,  // 15 % sur les services tiers
    verifiedHostDiscount: 0.04,    // 4 % pour les hôtes "Awder Vérifié"

    // Promotion d'acquisition
    zeroCommissionPromo: false,
    zeroCommissionUntil: null,

    // Limites
    minBookingAmount: 5000,
    maxBookingAmount: 10_000_000,

    // Méta
    updatedAt: new Date().toISOString(),
    updatedBy: 'system-init',
  };

  await ref.set(config);
  console.log('✅ platform/config initialisé avec les valeurs Awder :');
  console.log('   • Commission hôte : 5%');
  console.log('   • Frais voyageur : 3%');
  console.log('   • Services tiers : 15%');
  console.log('   • Hôte vérifié : 4%');
  console.log('\nVous pouvez modifier ces valeurs dans /admin/settings.');
}

main().catch((e) => {
  console.error('❌ Erreur :', e.message);
  process.exit(1);
});
