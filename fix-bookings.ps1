# Fix definitif bookings + debug
# Lance depuis C:\Users\UPJV\Downloads\Awder

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  AWDER - Fix bookings (regles simplifiees)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "app/page.tsx")) {
    Write-Host "[X] Lance depuis C:\Users\UPJV\Downloads\Awder" -ForegroundColor Red
    exit 1
}

# Backup
if (Test-Path "firestore.rules") {
    Copy-Item "firestore.rules" "firestore.rules.backup" -Force
    Write-Host "[OK] Backup cree (firestore.rules.backup)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Deploiement des regles simplifiees..." -ForegroundColor Cyan
npx firebase deploy --only firestore:rules

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Echec deploiement" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  REGLES DEPLOYEES" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Test :" -ForegroundColor Cyan
Write-Host "  1. Redemarre 'npm run dev' (Ctrl+C puis relance)" -ForegroundColor White
Write-Host "  2. Recharge la page (F5)" -ForegroundColor White
Write-Host "  3. Re-essaie une reservation" -ForegroundColor White
Write-Host ""
Write-Host "Si le bug persiste, lance dans la console F12 :" -ForegroundColor Yellow
Write-Host '   (await firebase.auth().currentUser.getIdTokenResult(true)).claims' -ForegroundColor Yellow
Write-Host ""
