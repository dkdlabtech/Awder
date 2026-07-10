/**
 * Migration: ajoute moderationStatus='approved' et isActive=true à toutes
 * les annonces existantes pour qu'elles soient lisibles depuis le client
 * (les règles Firestore exigent ces champs).
 */
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach((line) => {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/\\n/g, "\n");
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

const db = getFirestore(app, "ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef");

(async () => {
  const snap = await db.collection("listings").get();
  console.log(`📋 ${snap.size} annonces trouvées.`);
  let patched = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const patch: Record<string, unknown> = {};
    if (d.moderationStatus !== "approved") patch.moderationStatus = "approved";
    if (d.isActive !== true) patch.isActive = true;
    if (typeof d.reviewCount !== "number") patch.reviewCount = 0;
    if (Object.keys(patch).length) {
      await doc.ref.update(patch);
      patched++;
      console.log(`  ✓ ${doc.id} — ${Object.keys(patch).join(", ")}`);
    }
  }
  console.log(`\n🎉 ${patched}/${snap.size} annonces mises à jour.`);
  process.exit(0);
})().catch((err) => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});
