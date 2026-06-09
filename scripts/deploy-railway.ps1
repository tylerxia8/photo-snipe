# PhotoSnipe — Railway deploy helper
# Run this in your own terminal (Cursor terminal or PowerShell), not via automation.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "PhotoSnipe Railway Deploy" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login (opens browser)
Write-Host "[1/4] Logging in to Railway..." -ForegroundColor Yellow
railway login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Step 2: Create or link project
Write-Host ""
Write-Host "[2/4] Creating Railway project (or link existing with: railway link)" -ForegroundColor Yellow
railway init

# Step 3: Deploy
Write-Host ""
Write-Host "[3/4] Deploying Docker image..." -ForegroundColor Yellow
railway up --detach

# Step 4: Public domain
Write-Host ""
Write-Host "[4/4] Generating public domain..." -ForegroundColor Yellow
railway domain

Write-Host ""
Write-Host "Done! Copy the domain above and set client/godot/config/network.cfg:" -ForegroundColor Green
Write-Host "  server_url=wss://YOUR-DOMAIN.up.railway.app" -ForegroundColor White
Write-Host ""
Write-Host "Verify: curl https://YOUR-DOMAIN.up.railway.app/health" -ForegroundColor Gray
