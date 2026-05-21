# Awder — Phase A : Backoffice Admin + Différenciateurs métier

## 📦 Contenu du zip

```
types/index.ts                              [REMPLACER]   ← Types étendus (admin, badges, disputes, config)
firestore.rules                             [REMPLACER]   ← Règles avec admin + nouvelles collections

lib/admin-auth.ts                           [NOUVEAU]     ← Helper auth admin + audit log
lib/commission.ts                           [NOUVEAU]     ← Calculs commission centralisés

hooks/use-admin.tsx                         [NOUVEAU]     ← Guard côté client + adminFetch

app/admin/layout.tsx                        [NOUVEAU]     ← Layout sidebar backoffice
app/admin/page.tsx                          [NOUVEAU]     ← Dashboard KPIs
app/admin/listings/page.tsx                 [NOUVEAU]     ← Modération annonces
app/admin/users/page.tsx                    [NOUVEAU]     ← Gestion utilisateurs
app/admin/disputes/page.tsx                 [NOUVEAU]     ← Médiation litiges
app/admin/transactions/page.tsx             [NOUVEAU]     ← Historique financier
app/admin/settings/page.tsx                 [NOUVEAU]     ← Paramètres commissions

app/api/admin/listings/moderate/route.ts    [NOUVEAU]     ← Approve/Reject annonce
app/api/admin/users/action/route.ts         [NOUVEAU]     ← Verify/Ban/Grant badge
app/api/admin/disputes/resolve/route.ts     [NOUVEAU]     ← Résolution litiges + mouvement fonds
app/api/admin/config/route.ts               [NOUVEAU]     ← Sauvegarde paramètres

scripts/set-admin.ts                        [NOUVEAU]     ← Promouvoir un user en admin
scripts/init-platform-config.ts             [NOUVEAU]     ← Init commissions
```

## 🚀 Installation (5 minutes)

### 1. Dézipper à la racine de ton projet
Le zip respecte la structure de ton projet. Dézippe à la racine et accepte le remplacement des 2 fichiers existants (`types/index.ts` et `firestore.rules`).

```bash
# Depuis C:\Users\UPJV\Downloads\Awder\
unzip awder-phase-a.zip
```

### 2. Déployer les nouvelles règles Firestore
```bash
npx firebase deploy --only firestore:rules
```

### 3. Initialiser la configuration plateforme
```bash
npx tsx scripts/init-platform-config.ts
```
Sortie attendue :
```
✅ platform/config initialisé avec les valeurs Awder :
   • Commission hôte : 5%
   • Frais voyageur : 3%
   • Services tiers : 15%
   • Hôte vérifié : 4%
```

### 4. Te promouvoir en admin
```bash
npx tsx scripts/set-admin.ts ton.email@exemple.com
```

### 5. Lancer le dev
```bash
npm run dev
```

### 6. Accéder au backoffice
Ouvre `http://localhost:3000/admin`.

⚠️ **Important** : tu dois te **déconnecter et te reconnecter** pour que le custom claim `admin: true` soit chargé dans ton token Firebase Auth. Sinon, `/admin` te redirigera vers `/`.

## ✅ Tests à effectuer

1. **Accès admin** : `/admin` doit afficher le dashboard avec les KPIs
2. **Non-admin** : se déconnecter, créer un compte simple, essayer `/admin` → doit rediriger vers `/`
3. **Modération** : créer une annonce depuis un compte hôte → elle doit apparaître dans `/admin/listings` (onglet "En attente"). L'approuver → elle devient visible publiquement.
4. **Settings** : modifier la commission, sauvegarder → vérifier que la valeur change.
5. **Audit log** : vérifier dans Firestore que la collection `auditLogs` se remplit à chaque action admin.

## 🔧 Modifications du backend existant à prévoir (Phase B)

La Phase A pose les fondations. La **Phase B** modifiera `app/api/bookings/action/route.ts` pour prélever automatiquement la commission Awder au moment de `release_caution`, et ajoutera `app/api/wallet/withdraw/route.ts` pour les retraits Mobile Money.

⚠️ Les commissions ne sont PAS encore prélevées automatiquement — c'est ce qu'on fera en Phase B.

## ⚠️ Points d'attention

### Compatibilité avec les annonces existantes
Si tu as déjà des listings en base sans le champ `moderationStatus`, ils ne s'afficheront pas dans `/admin/listings` (filtré par status). Pour les migrer :

```javascript
// Script rapide à exécuter une fois en console Firebase
db.collection('listings').get().then(snap => {
  snap.docs.forEach(d => {
    if (!d.data().moderationStatus) {
      d.ref.update({
        moderationStatus: 'approved',
        isActive: true,
        isVerified: false
      });
    }
  });
});
```

### Création d'annonce — adapter le formulaire (Phase D)
Le formulaire `AddListingOverlay` dans `app/page.tsx` doit ajouter `moderationStatus: 'pending_review'` et `isActive: false` au moment de la création. Sinon, les nouvelles règles refuseront la création. Ceci sera corrigé en Phase D lors du refactor du monolithe — mais si tu veux le patcher tout de suite, ajoute ces champs dans le `addDoc(collection(db, 'listings'), {...})`.

## 🎯 Ce qui est à 100% après cette phase

- ✅ **Backoffice Admin** : 5 pages opérationnelles + audit log
- ✅ **Différenciateurs métier** : tous les nouveaux champs (infrastructure, landmarks, badges, disputes) modélisés dans les types et règles
- ✅ **Modèle de commission** : configurable, transparent, avec tarif réduit pour hôtes vérifiés
- ✅ **Médiation litiges** : mouvement de fonds atomique selon la résolution

## 🔜 Suite (Phase B)
- Prélèvement automatique commission au release_caution
- Retraits Mobile Money via PayDunya Disburse
- Calcul priceBreakdown à la création de booking
