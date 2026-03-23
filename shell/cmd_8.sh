#!/bin/bash

# Instalar dependencias necesarias
echo "Instalando dependencias..."
if command -v npm &> /dev/null; then
  echo "Usando npm..."
  npm install
elif command -v yarn &> /dev/null; then
  echo "Usando yarn..."
  yarn install
else
  echo "No se encontró npm ni yarn. Por favor, instale uno de ellos."
  exit 1
fi