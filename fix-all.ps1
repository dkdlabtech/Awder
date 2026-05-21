# ─────────────────────────────────────────────────────────────────
# Awder — Script tout-en-un pour finaliser la Phase A
# Usage : .\fix-all.ps1
# ─────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  AWDER - Finalisation Phase A (tout-en-un)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Etape 1 : Verifier qu'on est au bon endroit
if (-not (Test-Path "app/page.tsx")) {
    Write-Host "[X] Erreur : ce script doit etre lance depuis C:\Users\UPJV\Downloads\Awder" -ForegroundColor Red
    Write-Host "    Lance d'abord : cd C:\Users\UPJV\Downloads\Awder" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Dossier Awder detecte" -ForegroundColor Green

# Etape 2 : Variable d'environnement permanente
$jsonPath = "C:\Users\UPJV\Downloads\gen-lang-client-0375007552-firebase-adminsdk-fbsvc-136ad5eadb.json"
if (-not (Test-Path $jsonPath)) {
    Write-Host "[X] Service account JSON introuvable : $jsonPath" -ForegroundColor Red
    exit 1
}
$env:GOOGLE_APPLICATION_CREDENTIALS = $jsonPath
[System.Environment]::SetEnvironmentVariable('GOOGLE_APPLICATION_CREDENTIALS', $jsonPath, 'User')
Write-Host "[OK] Variable GOOGLE_APPLICATION_CREDENTIALS configuree (permanente)" -ForegroundColor Green

# Etape 3 : Patch app/page.tsx pour filtrer les listings approuves
Write-Host ""
Write-Host "Modification de app/page.tsx..." -ForegroundColor Cyan
$file = "app/page.tsx"
$content = Get-Content $file -Raw
$old = "const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));"
$new = @"
const q = query(
      collection(db, 'listings'),
      where('moderationStatus', '==', 'approved'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
"@

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Set-Content -Path $file -Value $content -NoNewline
    Write-Host "[OK] app/page.tsx modifie (filtre approved + active)" -ForegroundColor Green
} elseif ($content.Contains("where('moderationStatus', '==', 'approved')")) {
    Write-Host "[OK] app/page.tsx deja modifie, on saute" -ForegroundColor Yellow
} else {
    Write-Host "[!] Impossible de trouver la ligne a modifier dans page.tsx" -ForegroundColor Yellow
    Write-Host "    (peut-etre deja modifie ou structure differente, on continue)" -ForegroundColor Yellow
}

# Etape 4 : Deployer les regles Firestore
Write-Host ""
Write-Host "Deploiement des regles Firestore..." -ForegroundColor Cyan
npx firebase deploy --only firestore:rules
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Echec deploiement rules - verifie ta connexion firebase" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Regles deployees" -ForegroundColor Green

# Etape 5 : Deployer les index Firestore
Write-Host ""
Write-Host "Deploiement des index Firestore..." -ForegroundColor Cyan
npx firebase deploy --only firestore:indexes
Write-Host "[OK] Index deployes" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  TOUT EST PRET !" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Etapes restantes (manuelles, 30 secondes) :" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Lance le serveur dev :" -ForegroundColor White
Write-Host "       npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Dans ton navigateur, va sur localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  3. Ouvre la console (F12 -> onglet Console)" -ForegroundColor White
Write-Host "     Colle cette commande pour te deconnecter :" -ForegroundColor White
Write-Host ""
Write-Host "       indexedDB.deleteDatabase('firebaseLocalStorageDb');" -ForegroundColor Yellow
Write-Host "       Object.keys(localStorage).filter(k=>k.startsWith('firebase')).forEach(k=>localStorage.removeItem(k));" -ForegroundColor Yellow
Write-Host "       location.reload();" -ForegroundColor Yellow
Write-Host ""
Write-Host "  4. Reconnecte-toi avec oumarag007@gmail.com" -ForegroundColor White
Write-Host ""
Write-Host "  5. Ouvre localhost:3000/admin" -ForegroundColor White
Write-Host ""
Write-Host "Tu dois voir le dashboard admin avec la sidebar." -ForegroundColor Cyan
Write-Host ""
