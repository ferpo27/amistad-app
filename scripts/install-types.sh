#!/bin/bash
# Cambiar al directorio del proyecto
cd "C:\Users\ferna\Documents\app" || exit 1

# Instalar dependencias de tipos
npm i --save-dev @types/react @types/react-native @types/jest

# Añadir cambios al índice y commitear
git add package.json package-lock.json
git commit -m "fix: instalar tipos de React y React Native"