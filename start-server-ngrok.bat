@echo off
cd /d %~dp0

:: ⚙️ Chạy backend
start "Backend" cmd /k "cd backend && node server.js"

:: 🕒 Chờ backend lên trước
timeout /t 3 > nul

:: ⚙️ Chạy frontend
start "Frontend" cmd /k "cd frontend && npm run dev"

:: 🕒 Chờ frontend lên trước khi chạy ngrok
timeout /t 3 > nul

:: ⚡️ Chạy ngrok với file cấu hình
start "Ngrok" cmd /k "cd ngrok && ngrok start --all"
