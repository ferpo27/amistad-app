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
          hello: 'Hola',
          goodbye: 'Adiós',
          welcome: 'Bienvenido',
        }
      },
      'en-US': {
        translation: {
          hello: 'Hello',
          goodbye: 'Goodbye',
          welcome: 'Welcome',
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

export const addResource = (language: string, namespace: string, resources: any): void => {
  i18n.addResourceBundle(language, namespace, resources);
};

export const getResource = (language: string, namespace: string, key: string): string => {
  return i18n.getResource(language, namespace, key);
};

export const hasResource = (language: string, namespace: string, key: string): boolean => {
  return i18n.hasResourceBundle(language, namespace, key);
};

// Funciones adicionales para manejar recursos
export const loadResources = async (language: string): Promise<void> => {
  try {
    // Cargar recursos desde una fuente externa
    const response = await fetch(`https://example.com/resources/${language}.json`);
    const resources = await response.json();
    i18n.addResourceBundle(language, 'translation', resources);
  } catch (error) {
    console.error('Error al cargar recursos:', error);
  }
};

export const saveResources = async (language: string): Promise<void> => {
  try {
    // Guardar recursos en una fuente externa
    const resources = i18n.getResourceBundle(language, 'translation');
    const response = await fetch(`https://example.com/resources/${language}.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resources)
    });
    if (!response.ok) {
      throw new Error(`Error al guardar recursos: ${response.status}`);
    }
  } catch (error) {
    console.error('Error al guardar recursos:', error);
  }
};

// Funciones para manejar el ciclo de vida de la aplicación
export const onAppStart = async (): Promise<void> => {
  try {
    // Inicializar la configuración de i18n
    await loadResources(i18n.language);
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
  }
};

export const onAppStop = async (): Promise<void> => {
  try {
    // Limpiar la configuración de i18n
    i18n.reset();
  } catch (error) {
    console.error('Error al limpiar la configuración de i18n:', error);
  }
};