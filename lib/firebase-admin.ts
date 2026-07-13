import { App, initializeApp, getApps, cert } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

// Lazy initialisation — only runs on first call, not at module import time.
// This prevents Next.js from crashing at build time when env vars are absent.
let _app: App | null = null;

/**
 * Normalise la clé privée quel que soit le format collé dans l'hébergeur (Vercel) :
 *  - retire d'éventuels guillemets englobants
 *  - convertit les \n littéraux en vrais retours à la ligne
 *  - laisse intacts les vrais retours à la ligne
 */
function normalizePrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

function app(): App {
  if (!_app) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
    const missing: string[] = [];
    if (!projectId) missing.push('FIREBASE_ADMIN_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_ADMIN_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_ADMIN_PRIVATE_KEY');
    if (missing.length) {
      throw new Error(`Variable(s) vide(s) sur Vercel : ${missing.join(', ')}. Ré-enregistrez-la(les) puis Redeploy.`);
    }
    _app =
      getApps().find((a) => a.name === 'admin') ||
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, 'admin');
  }
  return _app;
}

export function adminAuth(): Auth {
  return getAuth(app());
}

export function adminDb(): Firestore {
  // Uses the non-default Firestore database configured on this project
  return getFirestore(app(), 'ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef');
}
