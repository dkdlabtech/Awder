/**
 * Migration des listings existants pour la Phase A.
 *
 * Ajoute `moderationStatus: 'approved'` et `isActive: true` aux listings
 * qui n'ont pas encore ces champs (créés avant le déploiement de la Phase A).
 *
 * Usage : npx tsx scripts/migrate-listings.ts
 *
 * Idempotent — peut être relancé sans risque, ne touche que les listings
 * dont les champs sont absents.
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const FIRESTORE_DB_ID = 'ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef';

// Charge le service account JSON directement
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
  getApps().find((a) => a.name === 'migrate') ??
  initializeApp({ credential: cert(serviceAccount) }, 'migrate');

const db = getFirestore(app, FIRESTORE_DB_ID);

async function main() {
  console.log('🔍 Recherche des listings à migrer...\n');

  const snap = await db.collection('listings').get();
  console.log(`📊 Total des listings : ${snap.size}`);

  let migrated = 0;
  let alreadyOk = 0;
  const batch = db.batch();

  for (const doc of snap.docs) {
    const data = doc.data();
    const updates: Record<string, any> = {};

    if (data.moderationStatus === undefined) {
      // Les anciens listings sont considérés comme approuvés par défaut
      updates.moderationStatus = 'approved';
    }
    if (data.isActive === undefined) {
      updates.isActive = true;
    }
    if (data.isVerified === undefined) {
      updates.isVerified = false;
    }

    if (Object.keys(updates).length > 0) {
      console.log(`  → Migration : ${doc.id} (${data.title ?? 'sans titre'})`);
      batch.update(doc.ref, updates);
      migrated++;
    } else {
      alreadyOk++;
    }
  }

  if (migrated > 0) {
    await batch.commit();
    console.log(`\n✅ ${migrated} listing(s) migré(s).`);
  }
  if (alreadyOk > 0) {
    console.log(`✓ ${alreadyOk} listing(s) déjà à jour.`);
  }
  if (migrated === 0 && alreadyOk === 0) {
    console.log('⚠️  Aucun listing trouvé dans la base.');
  }
  console.log('\n🎉 Migration terminée.');
}

main().catch((e) => {
  console.error('❌ Erreur :', e.message);
  process.exit(1);
});
