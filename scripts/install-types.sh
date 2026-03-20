#!/usr/bin/env bash
set -euo pipefail

# Determinar el directorio raíz del proyecto (asumiendo que este script está en scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

cd "$PROJECT_ROOT"

# Verificar que npm y git estén disponibles
command -v npm >/dev/null 2>&1 || { echo "npm no está instalado o no está en el PATH" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git no está instalado o no está en el PATH" >&2; exit 1; }

# Instalar los tipos como dependencias de desarrollo
npm install --save-dev @types/react @types/react-native @types/jest || { echo "Error al instalar los paquetes con npm" >&2; exit 1; }

# Añadir los archivos modificados al índice
git add package.json package-lock.json

# Crear commit solo si hay cambios staged
if git diff --cached --quiet; then
  echo "No hay cambios para commitear."
else
  git commit -m "fix: instalar tipos de React, React Native y Jest"
fi