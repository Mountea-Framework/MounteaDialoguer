@echo off
setlocal enableextensions

rem Usage:
rem   steam_build_upload.bat
rem   steam_build_upload.bat your_steam_build_username

set "REPO_DIR=%~dp0"
if "%REPO_DIR:~-1%"=="\" set "REPO_DIR=%REPO_DIR:~0,-1%"

set "STEAM_SDK_ROOT=D:\Program Files\Steam\SDK"
set "CONTENT_BUILDER_DIR=%STEAM_SDK_ROOT%\tools\ContentBuilder"
set "STEAM_BUILDER_DIR=%CONTENT_BUILDER_DIR%\builder"
set "STEAM_CONTENT_DIR=%CONTENT_BUILDER_DIR%\content\windows"
set "STEAM_APP_BUILD_VDF=..\scripts\app_build_4509320.vdf"

set "SRC_DIR=%REPO_DIR%\release\win-unpacked"
set "STEAM_USERNAME=%~1"
if "%STEAM_USERNAME%"=="" set "STEAM_USERNAME=semjonprophet"

echo.
echo [1/3] Building Steam package...
pushd "%REPO_DIR%" || goto :fail
call npm run electron:pack:steam
if errorlevel 1 (
  popd
  goto :fail
)
popd

if not exist "%SRC_DIR%\" (
  echo ERROR: Build output not found: "%SRC_DIR%"
  goto :fail
)

echo.
echo [2/3] Copying build to Steam ContentBuilder...
if not exist "%STEAM_CONTENT_DIR%" mkdir "%STEAM_CONTENT_DIR%"
robocopy "%SRC_DIR%" "%STEAM_CONTENT_DIR%" /MIR /R:2 /W:2 >nul
set "ROBO_RC=%ERRORLEVEL%"
if %ROBO_RC% GEQ 8 (
  echo ERROR: Robocopy failed with code %ROBO_RC%.
  goto :fail
)

echo.
echo [3/3] Uploading build to Steam depot...
if not exist "%STEAM_BUILDER_DIR%\steamcmd.exe" (
  echo ERROR: steamcmd.exe not found at "%STEAM_BUILDER_DIR%\steamcmd.exe"
  goto :fail
)

pushd "%STEAM_BUILDER_DIR%" || goto :fail
.\steamcmd.exe +login "%STEAM_USERNAME%" +run_app_build "%STEAM_APP_BUILD_VDF%" +quit
set "STEAMCMD_RC=%ERRORLEVEL%"
popd

if not "%STEAMCMD_RC%"=="0" (
  echo ERROR: SteamCMD failed with code %STEAMCMD_RC%.
  goto :fail
)

echo.
echo SUCCESS: Build packed, copied, and uploaded.
echo Next: set the new BuildID live on your Steam branch in Steamworks.
exit /b 0

:fail
echo.
echo FAILED.
exit /b 1

