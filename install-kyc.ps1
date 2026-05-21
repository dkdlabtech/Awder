# Installation KYC + correction bookings + Devenir Hote v2
# A lancer depuis C:\Users\UPJV\Downloads\Awder

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  AWDER - Livraison 1 : KYC + Engagement progressif" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "app/page.tsx")) {
    Write-Host "[X] Lance ce script depuis C:\Users\UPJV\Downloads\Awder" -ForegroundColor Red
    exit 1
}

# Verifier la variable d'environnement
$jsonPath = "C:\Users\UPJV\Downloads\gen-lang-client-0375007552-firebase-adminsdk-fbsvc-136ad5eadb.json"
if (Test-Path $jsonPath) {
    $env:GOOGLE_APPLICATION_CREDENTIALS = $jsonPath
    Write-Host "[OK] Variable GOOGLE_APPLICATION_CREDENTIALS active" -ForegroundColor Green
}

Write-Host ""
Write-Host "Deploiement des nouvelles regles Firestore..." -ForegroundColor Cyan
npx firebase deploy --only firestore:rules

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Echec du deploiement des regles" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  INSTALLATION TERMINEE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ce qui a ete livre :" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [+] Composant KYC (verification 2 photos)" -ForegroundColor White
Write-Host "      components/kyc/KYCForm.tsx" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [+] Nouveau 'Devenir Hote' (engagement progressif)" -ForegroundColor White
Write-Host "      components/kyc/BecomeHostFlow.tsx" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [+] API soumission KYC" -ForegroundColor White
Write-Host "      app/api/host/kyc/route.ts" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [+] Page boss/users avec affichage photos KYC" -ForegroundColor White
Write-Host "      app/boss/users/page.tsx (mise a jour)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [+] Fix bug bookings (regle Firestore simplifiee)" -ForegroundColor White
Write-Host "      firestore.rules (deploye)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [+] lib/upload.ts mis a jour (selfie + propertyDeed)" -ForegroundColor White
Write-Host ""
Write-Host "Prochaine etape :" -ForegroundColor Cyan
Write-Host "  - Redemarre 'npm run dev' (Ctrl+C puis relance)" -ForegroundColor White
Write-Host "  - Teste de creer une reservation (le bug est fixe)" -ForegroundColor White
Write-Host "  - Teste le KYC depuis un compte hote" -ForegroundColor White
Write-Host ""
Write-Host "La livraison 2 viendra apres : refonte du monolithe page.tsx" -ForegroundColor Magenta
Write-Host ""
