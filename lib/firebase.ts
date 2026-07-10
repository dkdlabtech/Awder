import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

// ✨ Instance SECONDAIRE isolée pour le back-office /boss.
// Session d'auth (et donc Firestore) indépendante de l'app voyageur/hôte :
// l'admin peut rester connecté au boss pendant qu'il teste des comptes utilisateurs.
const bossApp = getApps().find((a) => a.name === 'boss') ?? initializeApp(firebaseConfig, 'boss');
export const bossAuth = getAuth(bossApp);
export const bossDb = getFirestore(bossApp, (firebaseConfig as any).firestoreDatabaseId);
// Note: les images sont stockées sur Cloudinary (voir lib/upload.ts),
// pas sur Firebase Storage — ce qui évite le plan Blaze payant.

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Only run testConnection in the browser
if (typeof window !== 'undefined') {
  testConnection();
}
