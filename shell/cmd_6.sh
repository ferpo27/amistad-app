#!/bin/bash

# Configurar jest para pruebas unitarias
echo "Configurando Jest para pruebas unitarias..."

# Ejecutar comando 'jest --config jest.setup.ts'
jest --config jest.setup.ts

echo "Configuración de Jest completada."

# Agregar comando de configuración para el proyecto
echo "Ejecutando comando de configuración para el proyecto..."
npm run config
echo "Comando de configuración ejecutado con éxito."