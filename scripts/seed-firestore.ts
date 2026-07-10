/**
 * Script de seed Firestore pour Awder
 * Usage: npx tsx scripts/seed-firestore.ts
 *
 * Peuple la base avec des listings de démonstration.
 * Les users/wallets/bookings sont créés automatiquement par l'app.
 */

import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// Charge .env.local manuellement (tsx ne le fait pas auto)
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/\\n/g, "\n");
    }
  });
}

// Utilise les credentials Firebase Admin depuis .env.local
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Variables Firebase Admin manquantes dans .env.local");
  console.error("   Vérifiez FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY");
  process.exit(1);
}

const app: App =
  getApps().find((a) => a.name === "seed") ??
  initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    },
    "seed"
  );

const db = getFirestore(app, "ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef");

// ── Listings de démonstration ─────────────────────────────────────────────────

const DEMO_HOST_UID = "demo_host_001"; // UID fictif pour les listings de démo

const listings = [
  {
    title: "Villa Mandingue • Bamako",
    description:
      "Une villa authentique avec tout le confort moderne au cœur de Bamako. Piscine, sécurité 24/7 et groupe électrogène inclus. Idéal pour familles et voyages d'affaires.",
    price: 45000,
    cautionAmount: 15000,
    location: { city: "Bamako", address: "ACI 2000", neighborhood: "ACI 2000" },
    type: "accommodation",
    pricingType: "nightly",
    images: [
      "https://picsum.photos/seed/villa1/800/600",
      "https://picsum.photos/seed/villa2/800/600",
      "https://picsum.photos/seed/villa3/800/600",
    ],
    amenities: [
      "Wifi",
      "Piscine",
      "Sécurité 24/7",
      "Groupe Électrogène",
      "Climatisation",
      "Parking",
    ],
    hostId: DEMO_HOST_UID,
    isVerified: true,
    rating: 4.8,
    createdAt: Timestamp.now(),
  },
  {
    title: "Terrasse Ocre • Hamdallaye",
    description:
      "Espace événementiel avec vue panoramique sur Bamako. Parfait pour mariages, conférences et cérémonies. Capacité jusqu'à 200 personnes.",
    price: 120000,
    cautionAmount: 40000,
    location: {
      city: "Bamako",
      address: "Hamdallaye ACI 2000",
      neighborhood: "Hamdallaye",
    },
    type: "event",
    pricingType: "hourly",
    images: [
      "https://picsum.photos/seed/terasse1/800/600",
      "https://picsum.photos/seed/terasse2/800/600",
    ],
    amenities: [
      "Sono",
      "Éclairage",
      "Climatisation",
      "Parking",
      "Cuisine équipée",
      "Sécurité",
    ],
    hostId: DEMO_HOST_UID,
    isVerified: true,
    rating: 4.9,
    createdAt: Timestamp.now(),
  },
  {
    title: "Espace Business Lafiabougou",
    description:
      "Salle de réunion professionnelle avec équipement complet. Projecteur HD, visioconférence, imprimante. Cadre calme et sécurisé, idéal pour vos réunions d'affaires.",
    price: 25000,
    cautionAmount: 8000,
    location: {
      city: "Bamako",
      address: "Lafiabougou",
      neighborhood: "Lafiabougou",
    },
    type: "event",
    pricingType: "hourly",
    images: [
      "https://picsum.photos/seed/business1/800/600",
      "https://picsum.photos/seed/business2/800/600",
    ],
    amenities: [
      "Wifi Fibre",
      "Projecteur HD",
      "Visioconférence",
      "Climatisation",
      "Café/Thé",
      "Parking",
    ],
    hostId: DEMO_HOST_UID,
    isVerified: false,
    rating: 4.6,
    createdAt: Timestamp.now(),
  },
  {
    title: "Appartement Cosy • Badalabougou",
    description:
      "Appartement moderne meublé dans le quartier résidentiel de Badalabougou. Accès facile au centre-ville, quartier calme et sécurisé.",
    price: 30000,
    cautionAmount: 10000,
    location: {
      city: "Bamako",
      address: "Badalabougou Est",
      neighborhood: "Badalabougou",
    },
    type: "accommodation",
    pricingType: "nightly",
    images: [
      "https://picsum.photos/seed/appart1/800/600",
      "https://picsum.photos/seed/appart2/800/600",
    ],
    amenities: [
      "Wifi",
      "Cuisine équipée",
      "Climatisation",
      "Eau chaude",
      "TV Satellite",
    ],
    hostId: DEMO_HOST_UID,
    isVerified: true,
    rating: 4.5,
    createdAt: Timestamp.now(),
  },
  {
    title: "Studio Moderne • Quinzambougou",
    description:
      "Studio tout équipé au cœur de Bamako. Idéal pour séjour courte durée, voyage d'affaires ou passage.",
    price: 18000,
    cautionAmount: 5000,
    location: {
      city: "Bamako",
      address: "Quinzambougou",
      neighborhood: "Quinzambougou",
    },
    type: "accommodation",
    pricingType: "nightly",
    images: [
      "https://picsum.photos/seed/studio1/800/600",
      "https://picsum.photos/seed/studio2/800/600",
    ],
    amenities: ["Wifi", "Climatisation", "Cuisine équipée", "Sécurité"],
    hostId: DEMO_HOST_UID,
    isVerified: false,
    rating: 4.3,
    createdAt: Timestamp.now(),
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Démarrage du seed Firestore...\n");

  // Vérifier si des listings existent déjà
  const existing = await db.collection("listings").limit(1).get();
  if (!existing.empty) {
    console.log(
      "⚠️  Des listings existent déjà. Ajout des nouveaux seulement...\n",
    );
  }

  let created = 0;
  for (const listing of listings) {
    try {
      const listingWithMeta = {
        ...listing,
        // Champs requis par les règles Firestore + visibilité publique
        moderationStatus: "approved" as const,
        isActive: true,
        reviewCount: 0,
      };
      const ref = await db.collection("listings").add(listingWithMeta);
      console.log(`✅ Listing créé: "${listing.title}" → ID: ${ref.id}`);
      created++;
    } catch (err) {
      console.error(`❌ Erreur pour "${listing.title}":`, err);
    }
  }

  console.log(
    `\n🎉 Seed terminé : ${created}/${listings.length} listings créés.`,
  );
  console.log("\n📋 Collections disponibles dans Firestore:");
  console.log("   • listings      → annonces de logements et événements");
  console.log("   • users         → profils (créés auto à la 1ère connexion)");
  console.log(
    "   • wallets       → portefeuilles (créés auto à la 1ère connexion)",
  );
  console.log("   • bookings      → réservations");
  console.log("   • transactions  → historique des paiements");
  console.log("   • notifications → notifications utilisateur");
  console.log("   • reviews       → avis et notes");
  console.log(
    "   • otpCodes      → codes WhatsApp (gérés auto par le backend)",
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed échoué:", err);
  process.exit(1);
});
