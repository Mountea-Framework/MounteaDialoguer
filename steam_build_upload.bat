@echo off
setlocal enableextensions
node "%~dp0scripts\steam-upload.mjs" --platform windows %*
exit /b %errorlevel%
