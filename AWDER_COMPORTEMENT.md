# AWDER — Spécification du comportement (validée avec le fondateur, 2026-07-10)

Source de vérité produit. Toute implémentation doit s'y conformer.

## A. Parcours VOYAGEUR

1. **Sans compte** : il explore tout (liste + fiches). La connexion (WhatsApp OTP / email) n'est demandée
   qu'au moment de **réserver** ou d'ajouter un **favori**.
2. **Fiche annonce (avant paiement)** : position **approximative uniquement** — quartier + ville + distance
   (« à 4,2 km »). PAS d'adresse exacte, pas d'indications d'accès, pas de note vocale, pas d'instructions taxi.
3. **Contact avant réservation** : PAS de chat libre. Uniquement des **questions pré-définies** (zéro risque
   d'échange de téléphone/email) :
   - Disponibilité réelle (« Ce lieu est-il vraiment disponible pour mes dates ? »)
   - Eau / électricité (« Les garanties sont-elles actives en ce moment ? »)
   - Arrivée tardive (« Puis-je arriver après 22 h ? »)
   - Adapté famille / événement (« Convient-il pour des enfants / X personnes ? »)
   L'hôte répond par des **réponses rapides pré-formatées** (Oui / Non + précision courte).
4. **Réserver** : clic → **écran récapitulatif** (dates, durée, services, caution Sira-Djou, TOTAL, politique
   d'annulation) → puis choix du moyen de paiement (Wave / OM / Moov / transfert). Jamais de paiement direct
   sans récap. **Aucune commission affichée au client** — il paie le prix de l'hôte + caution.
5. **Après paiement (séquestre actif)** :
   - Le **chat libre** s'ouvre entre voyageur et hôte (coordination d'arrivée).
   - La réservation révèle : adresse exacte, **coordonnées GPS + itinéraire**, indications d'accès,
     **note vocale**, instructions taxi, et les « Bons plats à côté ».
6. **Check-in / Check-out** dans la réservation (statuts existants inchangés).
7. **Diya (avis)** : proposé automatiquement au check-out (avec « Plus tard »), puis **rappel discret
   pendant 7 jours** sur la réservation terminée si non noté.
8. **Mode « sur demande »** : CTA « Demander à réserver » → l'hôte accepte/refuse → si accepté,
   « Payer maintenant » (récap → paiement).

## B. Parcours HÔTE

1. **Devenir hôte** : formulaire structuré **3 sections** + activation immédiate :
   - **1. Propriétaire** : nom (pré-rempli), WhatsApp, mode de versement (Wave/OM ou virement).
   - **2. Le lieu** : nom, ville, quartier, **indications d'accès**, **note vocale d'itinéraire**,
     **GPS : capture sur place + ajustement/validation sur mini-carte** (coordonnées exactes autorisées par l'hôte).
   - **3. Équipements** : cases à cocher.
   - Soumission → rôle hôte activé immédiatement → **création d'annonce pré-remplie** avec ces infos.
   - **Brouillon enregistrable et reprenable à tout moment** (y compris ce formulaire).
   - Le **KYC est exigé à la publication** de l'annonce, pas avant.
2. **Nouvelle annonce** : 5 étapes (Type → Localisation+GPS → Description/garanties/accès/vocale/bons plats/annulation
   → Photos → Prix + caution + mode instant/demande), avec autosave + reprise « X % complété ».
   - AJOUT : **capacité d'accueil** (nombre de personnes, chambres/détails) à renseigner et affichée sur la fiche.
3. **Mes annonces** : **onglets par statut** (En ligne / En validation / Brouillons / Rejetées, avec compteurs)
   + **recherche par titre**. Pas de longue liste unique.
4. **Réservations reçues** : demandes « sur demande » à accepter/refuser ; carte de bienvenue imprimable
   pour toute réservation payée ; libération de caution au check-out.
5. **Toggle Voyage ⇄ Hôte** : en haut à **droite du header** — icône ⇄ + libellé du mode opposé
   (« Mode hôte » quand on est voyageur, « Mode voyage » quand on est hôte). Visible seulement si role='host'.

## C. Marque / écran de lancement

- **Générique (splash)** : fond **sable clair + motif bogolan** (style « stage » de la maquette), logo arche
  qui se dessine, wordmark AWDER en ocre, « Bienvenue chez vous » en script, slogan. **Durée ~5 s** (lisible),
  une fois par session.
- **Accueil** : PAS de label « Bienvenue sur Awder » (déjà dit par le générique). Le hero =
  « Où voulez-vous **Awder** aujourd'hui ? » en grand serif + slogan en sous-titre.
- **Header** : logo Awder réel, grand et visible, aligné à gauche, sans épaissir la barre. Toggle de mode à droite.

## D. Règles d'argent (rappel)

- Le client ne voit JAMAIS la commission. Total client = prix hôte × durée + services + caution.
- Commission Awder 5 % calculée en interne (`awderCommission` dans priceBreakdown), déduite du versement hôte.
- Séquestre Sira-Djou inchangé (paiement → escrow → libération post-séjour).
