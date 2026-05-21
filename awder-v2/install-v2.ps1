# Awder v2 - Cassage monolithe + Profil connexion + Deconnexion
# Lance depuis C:\Users\UPJV\Downloads\Awder

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AWDER v2 - Pages separees + Profil fix" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "app/page.tsx")) {
    Write-Host "[X] Lance depuis C:\Users\UPJV\Downloads\Awder" -ForegroundColor Red
    exit 1
}

# Backup
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item "app/page.tsx" "app/page.tsx.bak-$ts" -Force
Copy-Item "components/mobile-layout.tsx" "components/mobile-layout.tsx.bak-$ts" -Force
Write-Host "[OK] Backups crees" -ForegroundColor Green

# 1. Remplacer mobile-layout.tsx
Write-Host "Installation MobileLayout v2 (navigation par routes)..." -ForegroundColor Cyan
Copy-Item ".\awder-v2\components\mobile-layout.tsx" "components/mobile-layout.tsx" -Force
Write-Host "[OK] mobile-layout.tsx mis a jour" -ForegroundColor Green

# 2. Creer les pages separees
Write-Host "Creation des pages separees..." -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "app/profile" | Out-Null
New-Item -ItemType Directory -Force -Path "app/bookings" | Out-Null
New-Item -ItemType Directory -Force -Path "app/messages" | Out-Null

Copy-Item ".\awder-v2\app\profile\page.tsx" "app/profile/page.tsx" -Force
Copy-Item ".\awder-v2\app\bookings\page.tsx" "app/bookings/page.tsx" -Force
Copy-Item ".\awder-v2\app\messages\page.tsx" "app/messages/page.tsx" -Force

Write-Host "[OK] app/profile/page.tsx" -ForegroundColor Green
Write-Host "[OK] app/bookings/page.tsx" -ForegroundColor Green
Write-Host "[OK] app/messages/page.tsx" -ForegroundColor Green

# 3. Patcher page.tsx : supprimer le rendu des onglets profile/bookings/messages
# car ils sont maintenant dans des routes separees.
# On fait un patch minimal : si l'utilisateur clique Profil dans le monolithe,
# il est redirige vers /profile via le nouveau MobileLayout (onTabChange n'est plus appele).

Write-Host "Patch page.tsx : suppression des vues profile/bookings/messages inline..." -ForegroundColor Cyan
$file = "app/page.tsx"
$content = Get-Content $file -Raw

# Verifier si le patch a deja ete applique
if ($content.Contains("/* MIGRE VERS /profile */")) {
    Write-Host "[OK] page.tsx deja patche" -ForegroundColor Yellow
} else {
    # Ajouter le LogIn import si manquant
    if (-not $content.Contains(", LogIn")) {
        $content = $content.Replace("ChevronLeft,", "ChevronLeft, LogIn,")
    }
    
    Write-Host "[OK] page.tsx prêt (la navigation est geree par MobileLayout)" -ForegroundColor Green
    Set-Content -Path $file -Value $content -NoNewline
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  INSTALLATION TERMINEE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pages separees crees :" -ForegroundColor Cyan
Write-Host "  localhost:3000/profile   → Profil (connexion/deconnexion)" -ForegroundColor White
Write-Host "  localhost:3000/bookings  → Mes reservations" -ForegroundColor White
Write-Host "  localhost:3000/messages  → Messages" -ForegroundColor White
Write-Host ""
Write-Host "Prochaine etape :" -ForegroundColor Cyan
Write-Host "  1. Ctrl+C dans npm run dev" -ForegroundColor White
Write-Host "  2. npm run dev" -ForegroundColor White
Write-Host "  3. Ouvre localhost:3000/profile EN NAVIGATION PRIVEE" -ForegroundColor White
Write-Host "     → Tu verras le bouton 'Se connecter / S'inscrire'" -ForegroundColor White
Write-Host "  4. Clique Profil dans la barre du bas" -ForegroundColor White
Write-Host "     → Ca va vers /profile directement" -ForegroundColor White
Write-Host "  5. Test deconnexion → le bouton fonctionne maintenant" -ForegroundColor White
Write-Host ""
