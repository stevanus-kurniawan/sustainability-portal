# Start API + Web from YOUR terminal so they run in the same environment as Docker/Postgres.
# Usage: Right-click -> Run with PowerShell, or in PowerShell: .\start-app.ps1
# Ensure Docker Desktop is running and you've run pnpm dev:infra first.

Set-Location $PSScriptRoot

Write-Host "Starting API and Web app (ensure Docker + infra are running)..." -ForegroundColor Cyan
Write-Host "API: http://localhost:3001  |  Web: http://localhost:3000" -ForegroundColor Gray
Write-Host ""

pnpm dev:app
