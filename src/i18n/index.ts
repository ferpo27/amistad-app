// src/i18n/index.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    lng: 'es-ES',
    resources: {
      'es-ES': {
        translation: {
          // Agregar traducciones aquí
        }
      }
    }
  });

export const t = (key: string, options?: any): string => {
  return i18n.t(key, options);
};

export const changeLanguage = (language: string): void => {
  i18n.changeLanguage(language);
};

export const getLanguage = (): string => {
  return i18n.language;
};

// Eliminar funciones redundantes
// ...