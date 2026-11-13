@echo off
setlocal
node_modules\@esbuild\win32-x64\esbuild.exe scripts\render-preview.ts --bundle --platform=node --format=esm --outfile=analysis\render-preview.mjs --external:@napi-rs/canvas --define:import.meta.env={}
if errorlevel 1 exit /b 1
node analysis\render-preview.mjs %*
