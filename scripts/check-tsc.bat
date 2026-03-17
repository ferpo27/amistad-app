@echo off
setlocal

rem Cambiar al directorio raíz del proyecto (padre del script)
cd /d "%~dp0.."
if %errorlevel% neq 0 exit /b 1

npx tsc --noEmit
if %errorlevel% equ 0 (
    echo.
    echo Sin errores de TypeScript. Procediendo a commitear.
    git add -A
    git commit -m "fix: corregir errores TypeScript"
) else (
    echo.
    echo Se encontraron errores de TypeScript. No se realizará commit.
)

endlocal