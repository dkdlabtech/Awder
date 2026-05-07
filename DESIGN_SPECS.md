# Awder Design System & Brand Identity

Ce document définit les spécifications de design pour la plateforme **Awder**. Il sert de guide complet pour les designers UI/UX souhaitant créer des maquettes (Figma/Adobe XD) cohérentes avec l'identité de marque actuelle.

---

## 1. Vision de la Marque
**Awder** n'est pas seulement une application de réservation ; c'est un gage de prestige et de sécurité en Afrique de l'Ouest.
- **Mots-clés :** Prestige, Chaleur, Sécurité (Sira-Djou), Modernité, Tradition malienne revisitée.
- **Cible :** Voyageurs premium, expatriés, et hôtes "Koron" (top tier).

---

## 2. Palette de Couleurs (Hex)
La palette s'inspire des tons terreux du Sahel alliés à l'élégance du luxe moderne.

| Couleur | Hex | Usage |
| :--- | :--- | :--- |
| **Awder Brun** | `#4E342E` | Couleur primaire, textes de titres, fonds sombres (Overlay). |
| **Awder Ocre** | `#A64B2A` | Accents, boutons d'action (CTA), indicateurs de statut. |
| **Awder Gold** | `#C2A350` | Détails de prestige, labels secondaires, badges. |
| **Awder Off-White** | `#FAF9F6` | Fonds de page, surfaces de cartes claires. |
| **Slate / Gris** | `#64748B` | Textes de corps, icônes secondaires. |

---

## 3. Typographie
Utilisation de polices sans-serif modernes avec des graisses contrastées.

- **Polices recommandées :**
  - **Inter** (Principal) : Pour toute l'interface.
  - **JetBrains Mono** : Pour les prix, les codes de parrainage et les accents techniques.
  
- **Hiérarchie :**
  - **H1 / Titres :** `font-black`, `tracking-tighter`, `text-4xl` (ex: "Mes Gains Awder").
  - **Sous-titres :** `font-black`, `uppercase`, `tracking-[0.3em]`, `text-[10px]` (ex: "BIENVENUE SUR AWDER").
  - **Corps :** `font-medium`, `text-sm`, `leading-relaxed`.

---

## 4. Composants & Styles UI

### Rayons de Bordure (Border Radius)
Awder utilise des formes organiques et très arrondies pour un sentiment de confort.
- **Grands Containers (Cards/Overlays) :** `40px` à `50px`.
- **Boutons & Inputs :** `full` (pill-shaped) ou `32px`.
- **Petits éléments (Icônes) :** `16px` à `24px`.

### Ombres (Shadows)
Les ombres doivent être douces et diffuses, simulant de la profondeur sans être agressives.
- **Standard :** `shadow-sm` (léger).
- **Cartes actives :** `shadow-2xl` avec une légère opacité de la couleur d'accent (ex: `shadow-awder-ocre/20`).

### Iconographie
Utilisation exclusive de la librairie **Lucide React**. Les icônes sont généralement d'une graisse fine ou moyenne (`stroke-width: 2`).

---

## 5. Architecture des Écrans

### A. Accueil Voyageur
- **Hero :** Titre accrocheur ("Où voulez-vous Awder aujourd'hui ?") sans logo superflu.
- **Grille de Services :** 4 grandes icônes de catégories circulaires/arrondies.
- **Liste de Biens :** Cartes verticales avec de grandes images (`aspect-square` ou `aspect-video`), coins arrondis à 40px.

### B. Dashboard Hôte
- **Header :** Affichage proéminent des gains avec une typographie "Koron".
- **Fil d'Activité :** Une zone de notifications intégrée au dashboard, montrant les check-outs et réservations en temps réel.

### C. Overlays (Modales)
- Fonds sombres en `awder-brun` avec un léger flou (`backdrop-blur-xl`).
- Fermeture via un bouton `X` stylisé dans le coin supérieur droit.

---

## 6. Micro-Interactions & Animations
- **Transitions de pages :** Fondu entrant/sortant doux.
- **Hover States :** Légère élévation (`scale-105`) et changement d'opacité.
- **Active States :** Compression tactile (`scale-95`) lors du clic sur les boutons.

---

## 7. Fonctionnalités de l'Application

### A. Expérience Voyageur
- **Découverte Multi-Catégories :** Recherche de logements, véhicules, expériences et guides locaux via une interface épurée.
- **Moteur de Réservation Intelligent :**
  - Calendrier avec vérification de disponibilité en temps réel.
  - Calcul dynamique du prix (nuits + services additionnels).
  - Gestion des conflits pour éviter les doubles réservations.
- **Sécurité Sira-Djou (Séquestre) :** Système où le paiement est conservé par Awder et versé à l'hôte uniquement après validation du check-in.
- **Gestion des Cautions :** Blocage automatique et libération sécurisée des dépôts de garantie.
- **Messagerie Intégrée :** Chat direct avec les hôtes pour les détails du voyage.

### B. Gestion Hôte (Tableau de Bord Koron)
- **Suivi des Gains :** Visualisation en temps réel du chiffre d'affaires et des paiements à venir.
- **Fil d'Activité en Direct :** Notifications instantanées pour les nouvelles réservations, demandes de check-out et alertes système.
- **Gestion des Annonces :** Interface de création de biens avec téléchargement d'images et configuration des prix.
- **Statut de Vérification :** Suivi du processus de vérification d'identité pour accéder au statut d'hôte certifié.

### C. Services Communs & Profil
- **Portefeuille (Wallet) :**
  - Solde disponible et historique complet des transactions.
  - Liaison avec les comptes Mobile Money (Orange, Moov, Wave).
- **Programme Terriyan (Parrainage) :** Code ambassadeur unique permettant de gagner des crédits pour chaque nouvel utilisateur parrainé.
- **Profil Utilisateur :** Gestion des informations personnelles, bio et photo de profil.
- **Support Multi-Canal :** Accès rapide au service client via Chat, Téléphone (Mali) et Email.
- **Vérification d'Identité :** Système de scan de pièce d'identité pour garantir la sécurité de la communauté (Sira-Djou).

---

## 8. Guide Technique pour le Développeur
- **Framework :** Next.js 15+
- **Styling :** Tailwind CSS 4.0
- **Animations :** Motion (Framer Motion)
- **Database :** Firebase Firestore
