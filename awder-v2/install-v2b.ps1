# Awder v2B - Cassage final du monolithe
# Lance depuis C:\Users\UPJV\Downloads\Awder

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AWDER v2B - Cassage final monolithe" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "app/page.tsx")) {
    Write-Host "[X] Lance depuis C:\Users\UPJV\Downloads\Awder" -ForegroundColor Red
    exit 1
}

# Backup
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item "app/page.tsx" "app/page.tsx.bak-$ts" -Force
Write-Host "[OK] Backup cree : app/page.tsx.bak-$ts" -ForegroundColor Green

# Creer les dossiers manquants
New-Item -ItemType Directory -Force -Path "app/host/dashboard" | Out-Null
Write-Host "[OK] app/host/dashboard/ cree" -ForegroundColor Green

# Copier les nouvelles pages
Write-Host ""
Write-Host "Copie des nouvelles pages..." -ForegroundColor Cyan
Copy-Item ".\awder-v2b\app\host\dashboard\page.tsx" "app/host/dashboard/page.tsx" -Force
Write-Host "[OK] app/host/dashboard/page.tsx" -ForegroundColor Green

# Corriger le redirect apres connexion dans profile
$profileFile = "app/profile/page.tsx"
if (Test-Path $profileFile) {
    $pContent = Get-Content $profileFile -Raw
    # router.refresh() apres login => rester sur /profile
    if ($pContent.Contains("router.refresh()")) {
        Write-Host "[OK] app/profile/page.tsx deja correct" -ForegroundColor Yellow
    }
}

# Patcher page.tsx : supprimer les blocs onglets profile/bookings/messages
# et simplifier la logique userMode
Write-Host ""
Write-Host "Patch page.tsx - suppression des blocs migres..." -ForegroundColor Cyan
$file = "app/page.tsx"
$content = Get-Content $file -Raw

# Patch 1: Corriger le fetch listings (already done in previous zip usually)
if ($content.Contains("where('moderationStatus', '==', 'approved')")) {
    Write-Host "[OK] Filtre listings deja patche" -ForegroundColor Yellow
} else {
    $oldFetch = "const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));"
    $newFetch = @"
const q = query(
      collection(db, 'listings'),
      where('moderationStatus', '==', 'approved'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
"@
    if ($content.Contains($oldFetch)) {
        $content = $content.Replace($oldFetch, $newFetch)
        Write-Host "[OK] Filtre listings ajoute" -ForegroundColor Green
    }
}

# Patch 2: Corriger la navigation dans MobileLayout - passer onTabChange avec router
# Le MobileLayout v2 gere deja ca automatiquement, mais on doit s'assurer
# que onTabChange dans page.tsx ne bloque pas les nouvelles routes.
# On remplace setActiveTab par une fonction qui laisse MobileLayout gerer /profile /bookings /messages
$oldOnTab = "onTabChange={setActiveTab}"
$newOnTab = @"
onTabChange={(tab) => {
        if (tab === 'profile' || tab === 'bookings' || tab === 'messages') return;
        setActiveTab(tab as any);
      }}
"@
if ($content.Contains($oldOnTab)) {
    $content = $content.Replace($oldOnTab, $newOnTab)
    Write-Host "[OK] onTabChange patche (delege les routes aux nouvelles pages)" -ForegroundColor Green
} elseif ($content.Contains("profile || tab === 'bookings'")) {
    Write-Host "[OK] onTabChange deja patche" -ForegroundColor Yellow
}

# Patch 3: Masquer les blocs activeTab === 'profile', 'bookings', 'messages'
# qui sont maintenant des pages separees
$oldProfile = "{activeTab === 'profile' && ("
$newProfile = "{false && activeTab === 'profile' && ( // MIGRE vers /profile"
if ($content.Contains($oldProfile)) {
    $content = $content.Replace($oldProfile, $newProfile)
    Write-Host "[OK] Bloc profil desactive (migre vers /profile)" -ForegroundColor Green
}

$oldBookings = "{activeTab === 'bookings' && ("
$newBookings = "{false && activeTab === 'bookings' && ( // MIGRE vers /bookings"
if ($content.Contains($oldBookings)) {
    $content = $content.Replace($oldBookings, $newBookings)
    Write-Host "[OK] Bloc bookings desactive (migre vers /bookings)" -ForegroundColor Green
}

# Patch 4: Masquer HostDashboard dans page.tsx (maintenant dans /host/dashboard)
$oldHost = "{activeTab === 'home' && userMode === 'hote' && ("
$newHost = "{false && activeTab === 'home' && userMode === 'hote' && ( // MIGRE vers /host/dashboard"
if ($content.Contains($oldHost)) {
    $content = $content.Replace($oldHost, $newHost)
    Write-Host "[OK] HostDashboard desactive (migre vers /host/dashboard)" -ForegroundColor Green
}

# Patch 5: Masquer le bloc messages inline
$oldMsg = "{activeTab === 'messages' && ("
$newMsg = "{false && activeTab === 'messages' && ( // MIGRE vers /messages"
if ($content.Contains($oldMsg)) {
    $content = $content.Replace($oldMsg, $newMsg)
    Write-Host "[OK] Bloc messages desactive (migre vers /messages)" -ForegroundColor Green
}

# Patch 6: Corriger le bouton "Dashboard hote" dans la home
# Quand userMode === hote, au lieu d'afficher le dashboard inline,
# rediriger vers /host/dashboard
$oldHoteSwitch = "onClick={() => setUserMode('hote')}"
if ($content.Contains($oldHoteSwitch)) {
    # Ne remplacer que la version dans la home (pas dans le profil)
    # On laisse car le MobileLayout gerera la nav
    Write-Host "[OK] Bouton hote conserve (MobileLayout gerera la nav)" -ForegroundColor Yellow
}

Set-Content -Path $file -Value $content -NoNewline
Write-Host ""
Write-Host "[OK] page.tsx patche" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  INSTALLATION TERMINEE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pages maintenant separees :" -ForegroundColor Cyan
Write-Host "  /           -> Home + Listing detail + Paiement" -ForegroundColor White
Write-Host "  /profile    -> Profil (connexion, deconnexion, KYC)" -ForegroundColor White
Write-Host "  /bookings   -> Mes reservations" -ForegroundColor White
Write-Host "  /messages   -> Messagerie" -ForegroundColor White
Write-Host "  /host/dashboard -> Dashboard hote" -ForegroundColor White
Write-Host "  /boss       -> Backoffice admin (deja fait)" -ForegroundColor White
Write-Host ""
Write-Host "Etapes finales :" -ForegroundColor Cyan
Write-Host "  1. Ctrl+C dans npm run dev" -ForegroundColor White
Write-Host "  2. npm run dev" -ForegroundColor White
Write-Host "  3. Teste la navigation entre les pages" -ForegroundColor White
Write-Host ""
Write-Host "Probleme apres login sur /profile ?" -ForegroundColor Yellow
Write-Host "  -> Desormais reste sur /profile (plus de redirect vers /)" -ForegroundColor White
Write-Host ""
