# SLMS Development Environment Setup Script (Windows PowerShell)
# This script sets up the local development environment

$ErrorActionPreference = "Stop"

Write-Host "🚀 Setting up SLMS Development Environment..." -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Error: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Check if pnpm is installed
$pnpmExists = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmExists) {
    Write-Host "pnpm not found. Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}
Write-Host "✓ pnpm is available" -ForegroundColor Green

# Navigate to project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\..\.."

# Start infrastructure services
Write-Host "Starting infrastructure services..." -ForegroundColor Yellow
Set-Location "infra"
docker-compose up -d postgres postgres-cms redis mailhog
Set-Location ".."

# Wait for PostgreSQL to be ready
Write-Host "Waiting for databases to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if databases are ready
$maxRetries = 30
$retryCount = 0
do {
    $result = docker exec slms-postgres pg_isready -U slms 2>&1
    if ($LASTEXITCODE -eq 0) { break }
    Write-Host "Waiting for API database..."
    Start-Sleep -Seconds 2
    $retryCount++
} while ($retryCount -lt $maxRetries)

if ($retryCount -ge $maxRetries) {
    Write-Host "Error: API database failed to start" -ForegroundColor Red
    exit 1
}
Write-Host "✓ API database is ready" -ForegroundColor Green

$retryCount = 0
do {
    $result = docker exec slms-postgres-cms pg_isready -U slms 2>&1
    if ($LASTEXITCODE -eq 0) { break }
    Write-Host "Waiting for CMS database..."
    Start-Sleep -Seconds 2
    $retryCount++
} while ($retryCount -lt $maxRetries)

if ($retryCount -ge $maxRetries) {
    Write-Host "Error: CMS database failed to start" -ForegroundColor Red
    exit 1
}
Write-Host "✓ CMS database is ready" -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install

# Build shared package
Write-Host "Building shared package..." -ForegroundColor Yellow
pnpm --filter @slms/shared build

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Development environment is ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Available services:"
Write-Host "  - PostgreSQL (API):    localhost:5432"
Write-Host "  - PostgreSQL (CMS):    localhost:5433"
Write-Host "  - Redis:               localhost:6379"
Write-Host "  - Mailhog UI:          http://localhost:8025"
Write-Host ""
Write-Host "Run the applications:"
Write-Host "  pnpm dev:web    - Start Next.js (port 3000)"
Write-Host "  pnpm dev:api    - Start NestJS API (port 4000)"
Write-Host "  pnpm dev:cms    - Start Strapi CMS (port 1337)"
Write-Host "  pnpm dev        - Start all apps"
Write-Host ""
