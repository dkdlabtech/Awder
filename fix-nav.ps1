# Fix navigation - une seule correction dans page.tsx
# Lance depuis C:\Users\UPJV\Downloads\Awder

Write-Host "Fix navigation Awder..." -ForegroundColor Cyan

$file = "app/page.tsx"
$content = Get-Content $file -Raw

# Verifier l'etat actuel
if ($content.Contains("router.push('/bookings')")) {
    Write-Host "[OK] Navigation deja corrigee !" -ForegroundColor Green
    exit 0
}

# Ajouter l'import useRouter si manquant
if (-not $content.Contains("useRouter")) {
    $content = $content.Replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';`nimport { useRouter } from 'next/navigation';"
    )
    Write-Host "[OK] Import useRouter ajoute" -ForegroundColor Green
}

# Ajouter const router = useRouter() apres le premier useState
if (-not $content.Contains("const router = useRouter()")) {
    $content = $content.Replace(
        "const { user, signUpWithEmail",
        "const router = useRouter();`n  const { user, signUpWithEmail"
    )
    Write-Host "[OK] router = useRouter() ajoute" -ForegroundColor Green
}

# Remplacer onTabChange pour rediriger vers les routes separees
$old = "onTabChange={setActiveTab}"
$new = @"
onTabChange={(tab) => {
        if (tab === 'profile') { router.push('/profile'); return; }
        if (tab === 'bookings') { router.push('/bookings'); return; }
        if (tab === 'messages') { router.push('/messages'); return; }
        setActiveTab(tab as any);
      }}
"@

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Write-Host "[OK] onTabChange redirige maintenant vers /profile /bookings /messages" -ForegroundColor Green
} else {
    # Peut-etre deja partiellement patche - chercher une variante
    Write-Host "[!] Pattern exact non trouve - recherche variante..." -ForegroundColor Yellow
    if ($content.Contains("onTabChange={(tab)")) {
        # Remplacer la version partielle par la version complete
        $old2 = "onTabChange={(tab) => { if (tab === 'profile' || tab === 'bookings' || tab === 'messages') return; setActiveTab(tab as any); }}"
        if ($content.Contains($old2)) {
            $content = $content.Replace($old2, $new)
            Write-Host "[OK] Variante remplacee par version avec router.push" -ForegroundColor Green
        }
    }
}

Set-Content -Path $file -Value $content -NoNewline
Write-Host ""
Write-Host "Done ! Redemarre npm run dev :" -ForegroundColor Green
Write-Host "  Ctrl+C  puis  npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test :" -ForegroundColor Cyan
Write-Host "  Clique sur 'Reserves' -> doit aller sur /bookings" -ForegroundColor White
Write-Host "  Clique sur 'Messages' -> doit aller sur /messages" -ForegroundColor White
Write-Host "  Clique sur 'Profil'   -> doit aller sur /profile" -ForegroundColor White
