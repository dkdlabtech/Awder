import { App, initializeApp, getApps, cert } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

// Lazy initialisation — only runs on first call, not at module import time.
// This prevents Next.js from crashing at build time when env vars are absent.
let _app: App | null = null;

function app(): App {
  if (!_app) {
    _app =
      getApps().find((a) => a.name === 'admin') ||
      initializeApp(
        {
          credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        },
        'admin'
      );
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
