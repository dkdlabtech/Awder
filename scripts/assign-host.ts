/**
 * Assigne la "Villa Test Koron" à l'utilisateur dkdlab.tech@gmail.com
 * pour permettre de tester le flux hôte.
 * Usage: npx tsx scripts/assign-host.ts
 */
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach((line) => {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/\\n/g, '\n');
});

const app: App =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!,
    }),
  });

const db = getFirestore(app, 'ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef');
const TARGET_EMAIL = 'dkdlab.tech@gmail.com';

(async () => {
  // 1. Trouver l'utilisateur par email
  const usersSnap = await db.collection('users').where('email', '==', TARGET_EMAIL).get();
  if (usersSnap.empty) {
    console.error(`❌ Aucun utilisateur avec l'email ${TARGET_EMAIL}. Connectez-vous d'abord dans l'app avec cet email.`);
    process.exit(1);
  }
  const userDoc = usersSnap.docs[0];
  const uid = userDoc.id;
  const displayName = userDoc.data().displayName || 'Hôte Awder';
  console.log(`✓ Utilisateur trouvé : ${displayName} (${uid})`);

  // 2. Promouvoir en hôte vérifié
  await userDoc.ref.update({
    role: 'host',
    isVerified: true,
    idVerificationStatus: 'verified',
    updatedAt: new Date().toISOString(),
  });
  console.log('✓ Promu hôte vérifié.');

  // 3. Trouver la Villa Test Koron
  const listingsSnap = await db.collection('listings').where('title', '==', 'Villa Test Koron').get();
  let target = listingsSnap.docs[0];
  if (!target) {
    // fallback : titre contenant "Test Koron"
    const all = await db.collection('listings').get();
    target = all.docs.find(d => (d.data().title || '').includes('Test Koron')) as any;
  }
  if (!target) {
    console.error('❌ Villa Test Koron introuvable.');
    process.exit(1);
  }

  await target.ref.update({
    hostId: uid,
    hostName: displayName,
    moderationStatus: 'approved',
    isActive: true,
    updatedAt: new Date().toISOString(),
  });
  console.log(`✓ "${target.data().title}" assignée à ${displayName}.`);
  console.log('\n🎉 Terminé ! Connectez-vous avec', TARGET_EMAIL, 'puis Profil → Hôte Koron.');
  process.exit(0);
})().catch((e) => { console.error('❌', e); process.exit(1); });
