@echo off
start cmd /k "cd /d "%~dp0" && npm run dev"
start cmd /k "cd /d "%~dp0signaling-worker" && npm run dev"
start cmd /k "cloudflared tunnel --url http://localhost:3000"
