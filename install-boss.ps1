# ─────────────────────────────────────────────────────────────────
# Awder - Installation du portail Boss (admin separe)
# ─────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  AWDER BOSS - Installation portail admin" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier qu'on est au bon endroit
if (-not (Test-Path "app/page.tsx")) {
    Write-Host "[X] Lance ce script depuis C:\Users\UPJV\Downloads\Awder" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dossier Awder detecte" -ForegroundColor Green

# Etape 1 : Supprimer l'ancien /admin si present
if (Test-Path "app/admin") {
    Write-Host ""
    Write-Host "Suppression de l'ancien /admin..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "app/admin"
    Write-Host "[OK] /admin supprime" -ForegroundColor Green
}
if (Test-Path "app/api/admin") {
    Remove-Item -Recurse -Force "app/api/admin"
    Write-Host "[OK] /api/admin supprime" -ForegroundColor Green
}

# Etape 2 : Verifier la variable d'environnement
$jsonPath = "C:\Users\UPJV\Downloads\gen-lang-client-0375007552-firebase-adminsdk-fbsvc-136ad5eadb.json"
if (Test-Path $jsonPath) {
    $env:GOOGLE_APPLICATION_CREDENTIALS = $jsonPath
    Write-Host "[OK] Variable GOOGLE_APPLICATION_CREDENTIALS active" -ForegroundColor Green
}

# Etape 3 : Definir le mot de passe admin
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURATION DU COMPTE ADMIN" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Email admin : oumarag007@gmail.com" -ForegroundColor White
Write-Host ""
$password = Read-Host "Mot de passe admin (8 caracteres minimum, choisis-le bien)" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPwd = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if ($plainPwd.Length -lt 8) {
    Write-Host "[X] Mot de passe trop court (minimum 8 caracteres)" -ForegroundColor Red
    exit 1
}

# Etape 4 : Configurer le compte admin
Write-Host ""
Write-Host "Configuration du compte admin..." -ForegroundColor Cyan
npx tsx scripts/set-admin.ts oumarag007@gmail.com $plainPwd
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Echec configuration admin" -ForegroundColor Red
    exit 1
}

# Etape 5 : Deployer les regles Firestore
Write-Host ""
Write-Host "Deploiement des regles Firestore..." -ForegroundColor Cyan
npx firebase deploy --only firestore:rules
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Avertissement : echec deploiement rules. Verifie ta connexion firebase." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  INSTALLATION REUSSIE !" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Etapes finales :" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Redemarre le serveur (Ctrl+C dans npm run dev, puis relance) :" -ForegroundColor White
Write-Host "       npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Ouvre dans ton navigateur :" -ForegroundColor White
Write-Host "       http://localhost:3000/boss/login" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Connecte-toi avec :" -ForegroundColor White
Write-Host "       Email    : oumarag007@gmail.com" -ForegroundColor Yellow
Write-Host "       Mot de passe : (celui que tu viens de definir)" -ForegroundColor Yellow
Write-Host ""
Write-Host "C'est tout. Plus besoin de passer par /admin." -ForegroundColor Cyan
Write-Host ""
