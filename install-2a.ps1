# Livraison 2A : briques de refonte + bouton Connexion en home
# A lancer depuis C:\Users\UPJV\Downloads\Awder

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  AWDER 2A - Briques refonte + Bouton Connexion" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "app/page.tsx")) {
    Write-Host "[X] Lance depuis C:\Users\UPJV\Downloads\Awder" -ForegroundColor Red
    exit 1
}

# Backup de securite
Copy-Item "app/page.tsx" "app/page.tsx.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Force
Write-Host "[OK] Backup de page.tsx cree" -ForegroundColor Green

# Patch 1 : ajouter LogIn aux imports lucide-react
Write-Host ""
Write-Host "Patch 1/2 : ajout de l'import LogIn..." -ForegroundColor Cyan
$file = "app/page.tsx"
$content = Get-Content $file -Raw

if (-not $content.Contains("LogIn,")) {
    # Ajouter LogIn dans les imports lucide-react
    $content = $content.Replace("ChevronLeft,", "ChevronLeft, LogIn,")
    Write-Host "[OK] Import LogIn ajoute" -ForegroundColor Green
} else {
    Write-Host "[OK] LogIn deja importe" -ForegroundColor Yellow
}

# Patch 2 : remplacer le bouton Dashboard conditionnel par un bouton qui supporte aussi Connexion
$oldButton = @'
            {profile?.role === 'host' && (
              <button 
                onClick={() => setUserMode('hote')}
                className="mb-1 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-awder-ocre flex flex-col items-center gap-1 active:scale-95 transition-all"
              >
                <Activity className="w-5 h-5 text-slate-300" />
                <span className="text-[8px] font-black uppercase tracking-widest">DASHBOARD</span>
              </button>
            )}
'@

$newButton = @'
            {!user ? (
              <button
                onClick={() => setShowLoginModal(true)}
                className="mb-1 p-3 bg-awder-ocre text-white rounded-2xl shadow-md flex flex-col items-center gap-1 active:scale-95 transition-all"
                aria-label="Se connecter"
              >
                <LogIn className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-widest">Connexion</span>
              </button>
            ) : profile?.role === 'host' ? (
              <button 
                onClick={() => setUserMode('hote')}
                className="mb-1 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-awder-ocre flex flex-col items-center gap-1 active:scale-95 transition-all"
              >
                <Activity className="w-5 h-5 text-slate-300" />
                <span className="text-[8px] font-black uppercase tracking-widest">DASHBOARD</span>
              </button>
            ) : null}
'@

Write-Host ""
Write-Host "Patch 2/2 : remplacement du bouton home..." -ForegroundColor Cyan
if ($content.Contains($oldButton)) {
    $content = $content.Replace($oldButton, $newButton)
    Write-Host "[OK] Bouton Connexion ajoute en home" -ForegroundColor Green
} elseif ($content.Contains("!user ? (") -and $content.Contains("Connexion")) {
    Write-Host "[OK] Bouton Connexion deja present" -ForegroundColor Yellow
} else {
    Write-Host "[!] Impossible de trouver le bouton exact a remplacer" -ForegroundColor Yellow
    Write-Host "    Tu devras ajouter le bouton manuellement (voir README)" -ForegroundColor Yellow
}

Set-Content -Path $file -Value $content -NoNewline

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  LIVRAISON 2A INSTALLEE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ce qui est en place :" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [+] Bouton 'Connexion' en haut de la home" -ForegroundColor White
Write-Host "      Affiche si non connecte, remplace par Dashboard si hote" -ForegroundColor Gray
Write-Host ""
Write-Host "  [+] Hooks reutilisables (pour la livraison 2B)" -ForegroundColor White
Write-Host "      hooks/use-listings.tsx" -ForegroundColor Gray
Write-Host "      hooks/use-bookings.tsx" -ForegroundColor Gray
Write-Host "      hooks/use-wallet.tsx" -ForegroundColor Gray
Write-Host ""
Write-Host "  [+] Composant LoginModal extrait et reutilisable" -ForegroundColor White
Write-Host "      components/auth/LoginModal.tsx" -ForegroundColor Gray
Write-Host ""
Write-Host "  [+] Utilitaires extraits" -ForegroundColor White
Write-Host "      lib/firestore-error.ts" -ForegroundColor Gray
Write-Host "      lib/constants.ts (ADD_ONS centralises)" -ForegroundColor Gray
Write-Host ""
Write-Host "Prochaine etape :" -ForegroundColor Cyan
Write-Host "  1. Redemarre 'npm run dev'" -ForegroundColor White
Write-Host "  2. Ouvre localhost:3000 SANS etre connecte" -ForegroundColor White
Write-Host "  3. Tu verras le bouton 'Connexion' en haut a droite" -ForegroundColor White
Write-Host ""
Write-Host "La livraison 2B suivra avec :" -ForegroundColor Magenta
Write-Host "  - Refonte complete en pages separees" -ForegroundColor Magenta
Write-Host "  - Page listing/[id] dediee" -ForegroundColor Magenta
Write-Host "  - Page bookings, profile, host dashboard en routes propres" -ForegroundColor Magenta
Write-Host "  - Integration KYC dans le parcours hote" -ForegroundColor Magenta
Write-Host ""
