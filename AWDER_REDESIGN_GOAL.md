# GOAL — Refonte visuelle « Terres du Sahel » + mises à jour Awder (A → Z)

> Brief d'exécution destiné à un agent de code (Fable). Objectif : appliquer la nouvelle identité
> visuelle sur **toute** l'application Awder et livrer les mises à jour fonctionnelles listées,
> sans casser la logique Firebase/paiement existante.

## 0. Contexte

- Stack : Next.js 15 (App Router) / React 19 / TypeScript / Tailwind v4 (`@theme` dans `app/globals.css`) / Firebase (Firestore + Auth) / PayDunya + Mobile Money.
- App mobile-first, francophone Afrique de l'Ouest (Mali, Sénégal). Lexique bambara = identité de marque.
- Écran principal : `app/page.tsx` (~4200 lignes, tout y est). Back-office : `app/boss/*`.
- Ne PAS toucher : la logique de séquestre, les routes `app/api/*`, les règles Firestore, le flux de paiement. On refait l'**UI**, on **ajoute** des features listées, on ne casse rien.

## 1. Design system à implémenter (source de vérité)

### 1.1 Couleurs — étendre `app/globals.css` (`@theme`)
Garder les 4 existantes, ajouter les nouvelles :

```css
@theme {
  --color-awder-ocre:     #A64B2A; /* ACTION uniquement : CTA, prix, wordmark "Awder" */
  --color-awder-ocre-deep:#8B3C20;
  --color-awder-gold:     #C2A350; /* CONFIANCE uniquement : vérifié, garanties, Koron */
  --color-awder-gold-soft:#D8BE78;
  --color-awder-brun:     #4E342E; /* texte principal, fonds sombres */
  --color-awder-brun-deep:#35211C;
  --color-awder-offwhite: #FAF9F6; /* fond clair */
  --color-awder-sable:    #EDE6DA; /* surfaces secondaires */
  --color-awder-grisbrun: #8A7B70; /* texte secondaire — REMPLACE tous les slate-* froids */
  --color-awder-bogolan:  #5C6B4C; /* succès / "en ligne" — remplace green-* génériques */
  --color-awder-indigo:   #2E3A59; /* info, usage rare */
}
```

**Règle absolue** : `gold` = confiance SEULEMENT, `ocre` = action SEULEMENT, jamais mélangés. **Un seul** point d'accent (ocre) par écran. Le mot **« Awder » complet doit toujours être rendu en `awder-ocre`** partout où il apparaît (wordmark, textes de marque).

### 1.2 Typographie — TROIS rôles (confirmés par la carte de bienvenue de la marque)
Charger toutes les polices via `next/font/google` (self-host automatique, pas de `<link>` CDN). Exposer : `--font-display`, `--font-script`, `--font-body`, `--font-mono`. **Choix ARRÊTÉS (ne pas substituer) :**
- **Display serif = `Cormorant_Garamond`** (poids 500/600) → titres h1/h2, gros chiffres, wordmark « AWDER » (rendu en `awder-ocre`, `letter-spacing` ~.4em).
- **Script d'accent = `Pinyon_Script`** (poids 400) → moments chaleureux uniquement : « Bienvenue », messages d'accueil, cartes de bienvenue. Jamais pour de l'UI fonctionnelle ni des labels.
- **Sans corps = `Plus_Jakarta_Sans`** (400/600) → tout le texte courant, boutons, formulaires.
- **Mono = `JetBrains_Mono`** (ou `ui-monospace`) → petits labels et données.
- **Max 2 graisses par écran** côté UI (Regular 400 + Semibold 600). **Supprimer les `font-black` (900) généralisés.**
- **MAJUSCULES réservées** aux petits labels en mono. Retirer `uppercase tracking-widest` des titres.
- Titres : `text-wrap: balance`. Corps ≈ 65 caractères de large.

### 1.2b Logo
Utiliser la **marque arche/ogive** d'Awder (porte ogivale, doublée, avec petite porte dorée intérieure) en `awder-ocre`, accompagnée du wordmark « AWDER ». Décliner en favicon, splash, en-têtes, carte de bienvenue. (Réf. carte de bienvenue validée.)

### 1.3 Rayons & profondeur
- Remplacer tous les `rounded-[40px]` / `rounded-[50px]` / `rounded-[32px]` par une échelle : cartes `16px`, contrôles `10–12px`, feuilles/overlays `24px` (haut). Boutons pilule (`rounded-full`) UNIQUEMENT pour chips/badges, pas pour les gros CTA.
- Ombres douces et chaudes (teintées brun), pas de `shadow-2xl` bleutées.

### 1.4 Iconographie & motif
- **Supprimer les émojis utilisés comme éléments d'UI** (⚡💧📶✅). Les remplacer par des icônes Lucide (déjà installé) ou des SVG dessinés cohérents (éclair, jarre/canari, ondes wifi, bouclier).
- Introduire un **motif bogolan** (mud-cloth) subtil et réutilisable : composant `components/ui/BogolanBackdrop.tsx` (SVG en `mask-image`, opacité ~5 %) pour hero, cartes de confiance, écrans vides.
- États vides « avec chaleur » : petite illustration + vocabulaire Awder, pas une icône grise seule.

### 1.5 Composants partagés à créer (`components/ui/`)
`Button` (variants: `primary` ocre, `trust` gold, `ghost`), `Badge` (`koron`, `success`, `guarantee`), `StatCard`, `SectionHeader`, `EmptyState`, `TrustStrip` (bandeau séquestre avec « Awder » en ocre), `GuaranteeRow`, `VoiceNotePlayer`. Tous thémés via les tokens ci-dessus.

> Référence visuelle validée : les 2 maquettes Artifacts produites (guide de style « Terres du Sahel » + fiche annonce). Reproduire ce niveau de finition.

## 2. Portée — appliquer sur TOUS les écrans

Migrer chaque surface vers le nouveau système (tokens, typo, rayons, icônes, composants partagés) :

1. **Accueil voyageur** (`app/page.tsx`) : header d'accueil, `SearchFilters`, filtres rapides, grille d'annonces.
2. **`components/listing-card.tsx`** : carte annonce (titre serif, badges gold, prix ocre, garanties).
3. **Fiche annonce** (overlay dans `app/page.tsx`) : appliquer la maquette validée (hero + scrim, badges Koron/Détente, Diya rating, cartes Tarif/Caution Sira-Djou, Garanties Sira-Yiriwa, indications d'accès + note vocale, mini-profil hôte Terriyan, TrustStrip, barre de réservation collante).
4. **Flux de réservation / paiement** (modales) : mêmes tokens, récap de prix lisible (dont frais service 3 %).
5. **Onglets Réservations / Messages / Profil** (voyageur).
6. **Dashboard hôte** (`app/page.tsx`, mode hôte) : overview/stats, listings, calendrier, réglages, fil d'activité.
7. **`components/host/AddListingOverlay.tsx`** : les 5 étapes.
8. **`components/mobile-layout.tsx`** : barre de navigation + bouton « Devenir hôte ».
9. **`components/auth/LoginModal.tsx`** et **`components/kyc/*`**.
10. **Back-office `app/boss/*`** : login, dashboard, users, listings, transactions, disputes, settings — version « admin » plus sobre mais même palette.

Aucun écran ne doit rester dans l'ancien style (font-black/uppercase/rounded-40/émojis).

## 3. Mises à jour fonctionnelles à ajouter

### P1 — Priorité haute
- **Autosave + reprise de brouillon (hôte)** dans `AddListingOverlay.tsx` : créer le doc `listings` (status `draft`) dès l'étape 1, sauvegarder à chaque changement d'étape (debounce), et à la réouverture proposer « Reprendre votre annonce — X % complété » en repartant à la dernière étape. Restaurer aussi la note vocale déjà uploadée. Barre de progression réelle.
- **Favoris / wishlist voyageur** : rendre le cœur fonctionnel (collection `favorites` ou champ sur `users`), + onglet/section « Mes favoris ».
- **Avis après séjour (Diya)** : après une réservation `completed`, permettre au voyageur de laisser note + commentaire via `app/api/reviews/submit`. Afficher la moyenne Diya sur la fiche et la carte.

- **Mode de réservation choisi par l'hôte, par annonce** : à la création/édition d'annonce, l'hôte choisit `bookingMode: 'instant' | 'request'`.
  - `instant` = comportement actuel (paiement → séquestre direct).
  - `request` = le voyageur envoie une demande ; l'hôte **accepte ou refuse** depuis son dashboard (statut booking `pending_host_approval` → `approved`/`rejected` + notification), le paiement ne se déclenche qu'après acceptation.
  - L'UI voyageur affiche « Réservation instantanée » ou « Sur demande » sur la fiche, et adapte le CTA (« Réserver » vs « Demander à réserver »).

- **Cartes de bienvenue générées** (déco hôte) : générer une carte de bienvenue élégante personnalisée avec le **prénom du voyageur** (et le prénom de l'hôte en signature), à partir d'une réservation confirmée. Style = identité « Terres du Sahel » : fond crème, logo arche + « AWDER » en ocre, « Bienvenue » en script ocre, botanique dorée (réf. carte validée). L'hôte peut la **prévisualiser, télécharger (PNG/PDF) et imprimer** depuis le détail de la réservation. Prévoir un composant `components/host/WelcomeCard.tsx` (rendu HTML/SVG → export image) et 2-3 gabarits (classique botanique, bogolan, événement).

- **« Bons plats à côté » (guide local post-réservation)** : après réservation confirmée, afficher au voyageur une section « Bons plats à côté » + bonnes adresses autour du lieu (resto, marché, plats typiques) — pensé pour la **diaspora et les clients qui ne connaissent pas le quartier**. Source : collection `recommendations` liée à la ville/au quartier (ou saisie par l'hôte sur son annonce : champ « mes bonnes adresses »). Chaque item : nom, type (plat/resto/expérience), distance, prix indicatif, note. Afficher dans le détail réservation et/ou après paiement.

### P2
- **Profil hôte public** : avatar, bio, « Hôte depuis », taux de réponse, avis reçus, badge Koron.
- **Vue carte des annonces** (les coordonnées GPS existent déjà sur `listings.location.coordinates`).
- **Simulateur de revenus** à l'étape prix de la création d'annonce.

## 4. Contraintes

- Conserver le **vocabulaire Awder** : Awder (voyager), Sira-Djou (caution/séquestre), Sira-Yiriwa (garanties), Koron (hôte vérifié), Diya (avis), **Terriyan (parrainage)**, salutations « I ni ce / I dansɛ ». Toujours donner la traduction discrète à la 1re occurrence.
- **Mobile-first**, thème clair (le produit est clair). Accessibilité : focus visible, contrastes AA, `prefers-reduced-motion` respecté pour les animations `motion/react`.
- Ne pas régresser : Firestore (`onSnapshot`), paiement PayDunya/Mobile Money, séquestre, KYC, notifications temps réel doivent continuer à fonctionner.
- Français correct (corriger les fautes visibles). Textes de CTA = verbe d'action clair.
- Garder le build vert : `npm run build` et `npm run lint` doivent passer.

## 5. Plan d'exécution recommandé (ordre)

1. Étendre les tokens `globals.css` + charger les polices.
2. Créer les composants partagés `components/ui/*` + `BogolanBackdrop`.
3. Migrer `listing-card` et la **fiche annonce** (écran pilote, plus fort impact).
4. Migrer accueil, réservation/paiement, onglets voyageur.
5. Migrer dashboard hôte + `AddListingOverlay` + **autosave brouillon (P1)**.
6. Migrer `mobile-layout`, `LoginModal`, `kyc`, puis `app/boss/*`.
7. Ajouter favoris + avis Diya + mode réservation instant/demande (P1).
8. Ajouter cartes de bienvenue générées + « Bons plats à côté » (P1).
9. Ajouter le reste P2 (profil hôte public, carte, simulateur de revenus).
10. Passe finale : lint, build, vérif responsive + relecture des textes.

## 6. Définition de « terminé »

- [x] Tous les écrans utilisent les nouveaux tokens, la typo serif+script+sans (max 2 graisses UI), les rayons mesurés, zéro émoji d'UI, zéro `font-black` généralisé.
- [x] Le mot « Awder/AWDER » et le logo arche sont rendus en ocre partout.
- [x] Fiche annonce = fidèle à la maquette validée (hero, Koron, Sira-Yiriwa, note vocale, mini-profil hôte Terriyan, TrustStrip, CTA ocre).
- [x] Autosave/reprise de brouillon hôte opérationnel (draft dès l'étape 1, debounce 1,2 s, bandeau « Reprendre — X % », barre de progression) ; favoris et avis Diya fonctionnels.
- [x] Mode réservation `instant`/`request` choisi par l'hôte (étape 5 de création) et respecté côté voyageur (CTA adapté, accepter/refuser hôte, « Payer maintenant » après acceptation).
- [x] Carte de bienvenue générée (prénom voyageur) prévisualisable + imprimable/PDF par l'hôte (`components/host/WelcomeCard.tsx`).
- [x] Section « Bons plats à côté » affichée au voyageur après réservation (saisie hôte à l'étape 3 : `hostTips`).
- [x] `npm run build` OK ; `npm run lint` — les fichiers de la refonte sont propres ; ~60 erreurs `react-hooks/set-state-in-effect` PRÉEXISTANTES subsistent dans les hooks/écrans historiques (nouvelles règles ESLint 9, non causées par la refonte — chantier séparé).
- [x] Navigation voyageur↔hôte et paiement non régressés (logique Firebase/PayDunya/séquestre intouchée).

### Bonus livrés (P2)
- [x] Simulateur de revenus à l'étape prix (« ≈ X F / mois »).
- [x] Mini-profil hôte public sur la fiche (avatar, badge Koron, Terriyan).
- [ ] Vue carte des annonces (reporté — nécessite une lib de cartographie).
