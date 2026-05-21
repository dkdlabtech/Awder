/**
 * Promouvoir un utilisateur en admin Boss + créer/définir son mot de passe.
 *
 * Usage :
 *   npx tsx scripts/set-admin.ts <email> [mot-de-passe]
 *
 * Exemples :
 *   npx tsx scripts/set-admin.ts oumarag007@gmail.com MonMotDePasseSecret123
 *
 * Effets :
 *   - Crée le compte si l'email n'existe pas
 *   - Met à jour le mot de passe si fourni (au moins 8 caractères)
 *   - Pose le custom claim Firebase Auth { admin: true }
 *   - Met à jour users/{uid}.role = 'admin' dans Firestore
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const FIRESTORE_DB_ID = 'ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef';

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
  getApps().find((a) => a.name === 'set-admin') ??
  initializeApp({ credential: cert(serviceAccount) }, 'set-admin');

const auth = getAuth(app);
const db = getFirestore(app, FIRESTORE_DB_ID);

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email) {
    console.error('❌ Usage : npx tsx scripts/set-admin.ts <email> [mot-de-passe]');
    console.error('');
    console.error('   Exemples :');
    console.error('     npx tsx scripts/set-admin.ts admin@awder.com MaSuperSecret123');
    console.error('     npx tsx scripts/set-admin.ts admin@awder.com   (sans changer le mdp)');
    process.exit(1);
  }

  if (!email.includes('@')) {
    console.error('❌ Veuillez fournir un email valide.');
    process.exit(1);
  }

  if (password && password.length < 8) {
    console.error('❌ Le mot de passe doit faire au moins 8 caractères.');
    process.exit(1);
  }

  let uid: string;
  let isNewUser = false;

  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
    console.log(`✓ Compte trouvé : ${email} (uid: ${uid})`);
  } catch (e: any) {
    if (e.code === 'auth/user-not-found') {
      if (!password) {
        console.error('❌ Compte inexistant. Fournissez un mot de passe pour le créer :');
        console.error(`   npx tsx scripts/set-admin.ts ${email} VotreMotDePasse123`);
        process.exit(1);
      }
      console.log(`+ Création du compte ${email}...`);
      const newUser = await auth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: 'Awder Admin',
      });
      uid = newUser.uid;
      isNewUser = true;
      console.log(`✓ Compte créé (uid: ${uid})`);
    } else {
      throw e;
    }
  }

  if (password && !isNewUser) {
    await auth.updateUser(uid, { password });
    console.log(`✓ Mot de passe mis à jour pour ${email}`);
  }

  await auth.setCustomUserClaims(uid, { admin: true });
  console.log(`✓ Custom claim 'admin: true' posé`);

  await db
    .collection('users')
    .doc(uid)
    .set(
      {
        displayName: 'Awder Admin',
        email,
        role: 'admin',
        isVerified: true,
        verificationLevel: 'premium',
        ...(isNewUser ? { createdAt: new Date().toISOString() } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  console.log(`✓ users/${uid}.role = 'admin' dans Firestore`);

  const walletRef = db.collection('wallets').doc(uid);
  const walletSnap = await walletRef.get();
  if (!walletSnap.exists) {
    await walletRef.set({
      userId: uid,
      balance: 0,
      escrow: 0,
      currency: 'XOF',
      updatedAt: new Date().toISOString(),
    });
    console.log(`✓ Wallet créé`);
  }

  console.log('');
  console.log('🎉 Terminé. Vous pouvez maintenant vous connecter sur :');
  console.log('   http://localhost:3000/boss/login');
  console.log('');
  console.log(`   Email : ${email}`);
  if (password) {
    console.log(`   Mot de passe : ${password}`);
  } else {
    console.log(`   (mot de passe inchangé)`);
  }
}

main().catch((e) => {
  console.error('❌ Erreur :', e.message);
  process.exit(1);
});
