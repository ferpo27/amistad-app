#!/usr/bin/env bash
# ------------------------------------------------------------
# Script de verificación de tipos TypeScript y commit automático.
# ------------------------------------------------------------
# Salir en caso de error, variable no definida o fallo en una tubería.
set -euo pipefail

# -----------------------------------------------------------------
# Configuración del proyecto (ruta POSIX compatible con Git Bash).
# -----------------------------------------------------------------
PROJECT_DIR="/c/Users/ferna/Documents/app"

# -----------------------------------------------------------------
# Cambiar al directorio del proyecto.
# -----------------------------------------------------------------
if ! cd "$PROJECT_DIR"; then
  echo "Error: No se pudo cambiar al directorio del proyecto '$PROJECT_DIR'" >&2
  exit 1
fi

# -----------------------------------------------------------------
# Ejecutar el chequeo de tipos de TypeScript sin generar archivos.
# -----------------------------------------------------------------
if ! npx tsc --noEmit; then
  echo "TypeScript errors detected. See the output above for details." >&2
  exit 1
fi

# -----------------------------------------------------------------
# Si no hay cambios en el árbol de trabajo ni en el índice, no se hace commit.
# -----------------------------------------------------------------
if git diff --quiet && git diff --cached --quiet; then
  echo "No TypeScript errors and no changes to commit."
  exit 0
fi

# -----------------------------------------------------------------
# Añadir todos los cambios y crear el commit.
# -----------------------------------------------------------------
if git add . && git commit -m "fix: corregir errores TypeScript"; then
  echo "Commit creado exitosamente."
  exit 0
else
  echo "Error: git commit falló." >&2
  exit 1
fi