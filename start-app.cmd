@echo off
REM Start API + Web from YOUR terminal so they run in the same environment as Docker/Postgres.
REM Double-click this file or run from Command Prompt: start-app.cmd
REM Ensure Docker Desktop is running and you've run pnpm dev:infra first.

cd /d "%~dp0"

echo Starting API and Web app (ensure Docker + infra are running)...
echo API: http://localhost:3001  ^|  Web: http://localhost:3000
echo.

pnpm dev:app
