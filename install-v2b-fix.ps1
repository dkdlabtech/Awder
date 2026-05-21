# Fix - lance depuis C:\Users\UPJV\Downloads\Awder

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AWDER v2B - Installation (chemin fixe)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "app/page.tsx")) {
    Write-Host "[X] Lance depuis C:\Users\UPJV\Downloads\Awder" -ForegroundColor Red
    exit 1
}

# Backup
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item "app/page.tsx" "app/page.tsx.bak-$ts" -Force
Write-Host "[OK] Backup cree" -ForegroundColor Green

# Creer les dossiers
New-Item -ItemType Directory -Force -Path "app/host/dashboard" | Out-Null
New-Item -ItemType Directory -Force -Path "components/host" | Out-Null

# Copier depuis awder-v2 (le bon dossier)
Write-Host "Copie des fichiers depuis .\awder-v2\..." -ForegroundColor Cyan
Copy-Item ".\awder-v2\app\host\dashboard\page.tsx" "app/host/dashboard/page.tsx" -Force
Write-Host "[OK] app/host/dashboard/page.tsx" -ForegroundColor Green
Copy-Item ".\awder-v2\components\host\AddListingOverlay.tsx" "components/host/AddListingOverlay.tsx" -Force
Write-Host "[OK] components/host/AddListingOverlay.tsx" -ForegroundColor Green

# Patcher page.tsx
Write-Host ""
Write-Host "Patch page.tsx..." -ForegroundColor Cyan
$file = "app/page.tsx"
$content = Get-Content $file -Raw

# Fix 1 : filtre listings approuves
if (-not $content.Contains("where('moderationStatus'")) {
    $old = "const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));"
    $new = "const q = query(collection(db, 'listings'), where('moderationStatus', '==', 'approved'), where('isActive', '==', true), orderBy('createdAt', 'desc'));"
    if ($content.Contains($old)) { $content = $content.Replace($old, $new); Write-Host "[OK] Filtre listings" -ForegroundColor Green }
}

# Fix 2 : onTabChange ne bloque plus /profile /bookings /messages
$old2 = "onTabChange={setActiveTab}"
$new2 = "onTabChange={(tab) => { if (tab === 'profile' || tab === 'bookings' || tab === 'messages') return; setActiveTab(tab as any); }}"
if ($content.Contains($old2)) { $content = $content.Replace($old2, $new2); Write-Host "[OK] onTabChange patche" -ForegroundColor Green }

# Fix 3 : desactiver blocs migres
$patches = @(
    @{ old = "{activeTab === 'profile' && ("; new = "{false && activeTab === 'profile' && (" }
    @{ old = "{activeTab === 'bookings' && ("; new = "{false && activeTab === 'bookings' && (" }
    @{ old = "{activeTab === 'home' && userMode === 'hote' && ("; new = "{false && activeTab === 'home' && userMode === 'hote' && (" }
    @{ old = "{activeTab === 'messages' && ("; new = "{false && activeTab === 'messages' && (" }
)
foreach ($p in $patches) {
    if ($content.Contains($p.old)) {
        $content = $content.Replace($p.old, $p.new)
        Write-Host "[OK] Bloc desactive : $($p.old.Substring(0, [Math]::Min(40, $p.old.Length)))" -ForegroundColor Green
    }
}

Set-Content -Path $file -Value $content -NoNewline
Write-Host "[OK] page.tsx sauvegarde" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  TERMINE - Redemarre npm run dev" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Routes disponibles :" -ForegroundColor Cyan
Write-Host "  /                -> Home + annonces" -ForegroundColor White
Write-Host "  /profile         -> Profil (connexion/deconnexion)" -ForegroundColor White
Write-Host "  /bookings        -> Mes reservations" -ForegroundColor White
Write-Host "  /messages        -> Messagerie" -ForegroundColor White
Write-Host "  /host/dashboard  -> Dashboard hote" -ForegroundColor White
Write-Host "  /boss            -> Backoffice admin" -ForegroundColor White
Write-Host ""
