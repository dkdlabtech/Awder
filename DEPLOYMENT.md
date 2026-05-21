# Awder — Guide de déploiement

## 📋 Pré-requis

- Node.js 20+
- Compte Firebase (plan **Blaze** pour Storage)
- Compte Meta for Developers + WhatsApp Business
- Compte PayDunya (production)
- Compte de déploiement (Vercel ou Firebase Hosting)

---

## 🔥 Configuration Firebase

### 1. Activer les services
- **Authentication** → activer Email/Password et Anonyme
- **Firestore** → utiliser la base nommée `ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef`
- **Storage** → plan Blaze requis

### 2. Déployer les règles
```bash
npx firebase deploy --only firestore:rules,storage
```

### 3. Variables d'environnement

Créer `.env.local` à la racine :

```env
# ── Firebase Client (NEXT_PUBLIC_* → exposé au navigateur) ──
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# ── Firebase Admin (server-side uniquement) ──
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ── WhatsApp Meta Cloud API ──
WHATSAPP_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_TEMPLATE_NAME=awder_otp

# ── PayDunya ──
PAYDUNYA_MASTER_KEY=...
PAYDUNYA_PRIVATE_KEY=...
PAYDUNYA_TOKEN=...
PAYDUNYA_MODE=live   # ou "test"
```

⚠️ Tant que `PAYDUNYA_MASTER_KEY` est le placeholder `your_master_key`, l'app tourne en **mode démo** (paiements simulés sans appel PayDunya). Pratique pour le développement.

---

## 🚀 Déploiement Vercel (recommandé)

```bash
# Installation Vercel CLI
npm i -g vercel

# Déploiement
vercel --prod
```

Configurer les variables d'environnement dans le dashboard Vercel → Settings → Environment Variables. Ne PAS commiter `.env.local`.

### URL de callback PayDunya
Dans le dashboard PayDunya, configurer l'**IPN URL** :
```
https://votre-domaine.com/api/paydunya/callback
```

---

## 🗂️ Architecture des collections Firestore

| Collection | Créé par | Notes |
|---|---|---|
| `users/{uid}` | Auto (premier login) | Profil : displayName, role, email/phoneNumber, bio |
| `wallets/{uid}` | Auto (premier login) | balance, escrow, currency: 'XOF' |
| `listings/{id}` | Hôte | hostId, title, price, cautionAmount, location, amenities, images[] |
| `bookings/{id}` | Voyageur | status: pending_payment → paid_escrow → completed |
| `transactions/{id}` | API server | Trace tous les flux d'argent |
| `notifications/{id}` | App | userId, read, type, title, message |
| `reviews/{id}` | Après séjour | bookingId, fromUserId, toUserId, rating |
| `conversations/{convId}/messages/{msgId}` | Chat | participants, lastMessage, lastMessageAt |
| `otpCodes/{phone}` | Server WhatsApp | Server-only (rules denied) |
| `rateLimits/{key}` | Server | Rate limiter distribué (rules denied) |

---

## 🔐 Sécurité

### Rate limits actifs
| Endpoint | Limite |
|---|---|
| `POST /api/auth/whatsapp/send` | 5/h par téléphone, 20/h par IP |
| `POST /api/bookings/action` | 30/min par user |
| `POST /api/paydunya/checkout` | 10/min par IP |

### Webhook PayDunya
Vérifie le hash HMAC SHA-512 = `sha512(master_key)`. Tout webhook avec un mauvais hash est rejeté (401).

### Idempotence
Le webhook callback utilise une **transaction Firestore atomique** : si `paymentToken` est déjà set ou si le statut n'est plus `pending_payment`, le webhook est ignoré silencieusement. Aucun double-paiement possible.

---

## 🧪 Mode démo (sans clés)

Tant que les clés PayDunya/WhatsApp ne sont pas configurées :
- **Paiement** → l'endpoint `/api/paydunya/checkout` répond `demo: true` et l'app appelle directement `/api/paydunya/confirm-demo` qui simule la confirmation
- **WhatsApp** → si `WHATSAPP_TOKEN` est manquant, l'API renvoie une erreur 500 explicite

`confirm-demo` refuse de tourner dès qu'une vraie clé PayDunya est présente, donc impossible de bypasser le paiement en prod.

---

## 📦 Seed des données

```bash
npm run seed
```

Crée 5 listings de démonstration à Bamako. Idempotent — peut être relancé.

---

## 🔧 Maintenance

### Surveiller les coûts Firebase
- Console Firebase → Usage and billing → définir des **alertes de budget** à 1 USD, 5 USD, etc.
- Storage : 5 Go gratuits, puis ~0.026 USD/Go
- Firestore : 50 K lectures + 20 K écritures gratuites par jour

### Logs
- Vercel : Dashboard → Deployments → Logs (temps réel)
- Firebase : Console → Functions → Logs (si Cloud Functions utilisées)

### Renouveler le token WhatsApp temporaire
Le token de Meta expire après 24h en dev. Pour la prod, créer un **System User** dans Meta Business Suite → token qui n'expire jamais.
