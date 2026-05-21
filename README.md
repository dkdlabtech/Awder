# Livraison 2A — Briques de refonte + Bouton Connexion en home

## Pourquoi en 2 étapes (2A puis 2B) ?

Ton `app/page.tsx` fait 3115 lignes. Refondre ça d'un coup = risque énorme de casser quelque chose. On y va en deux étapes pour pouvoir tester et corriger entre temps.

## Ce que livre la 2A

### ✅ Ajout immédiat : bouton "Connexion" en haut de la home
Plus besoin de cliquer sur une annonce pour se connecter. Le bouton apparaît en haut à droite de la home pour les visiteurs non connectés.

### ✅ Briques préparées pour la 2B
- **Hooks réutilisables** : `useListings`, `useBookings`, `useWallet`, `useTransactions`
- **Composant LoginModal extrait** : sera utilisé partout dans la 2B
- **Utilitaires** : `firestore-error.ts`, `constants.ts` (ADD_ONS)

Ces briques ne sont pas encore utilisées dans `page.tsx` — elles seront utilisées dans la 2B pour démonter le monolithe en petits morceaux propres.

## Installation

```powershell
cd C:\Users\UPJV\Downloads\Awder
Expand-Archive -Path ..\awder-refactor.zip -DestinationPath . -Force
Unblock-File -Path .\install-2a.ps1
.\install-2a.ps1
```

Le script :
- Crée un backup de ton `page.tsx`
- Ajoute le bouton "Connexion" en haut
- Installe les hooks et composants partagés

## Test

1. **Ctrl+C** dans `npm run dev`
2. `npm run dev`
3. Ouvre `localhost:3000` **en navigation privée** (pour être sûr d'être déconnecté)
4. En haut à droite, tu verras un bouton orange **"Connexion"**
5. Clique → modal de connexion s'ouvre
6. Connecte-toi → bouton disparaît

## La 2B livrera ensuite

- `app/page.tsx` réduit à ~150 lignes (juste la home)
- `app/listing/[id]/page.tsx` — détail annonce en route propre
- `app/bookings/page.tsx` — mes réservations
- `app/profile/page.tsx` — mon profil + déclencheur KYC
- `app/host/dashboard/page.tsx` — tableau de bord hôte
- `app/host/listings/new/page.tsx` — créer annonce + déclenchement KYC à la publication
- `app/messages/page.tsx` — chat
- Bouton "Connexion" présent sur **toutes les pages publiques**

## Si quelque chose casse

Tu as un backup automatique :
```powershell
# Liste les backups
dir app\page.tsx.backup-*

# Restaurer le plus récent
Copy-Item (Get-ChildItem app\page.tsx.backup-* | Select-Object -Last 1).FullName app\page.tsx -Force
```
