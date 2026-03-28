import i18next from 'i18next';

interface Options {
  [key: string]: any;
}

interface Resources {
  [key: string]: any;
}

const i18n = i18next.createInstance();

i18n.init({
  lng: 'es',
  fallbackLng: 'en',
  resources: {},
  interpolation: { escapeValue: false },
});

export function t(key: string, options?: Options): string {
  try {
    return i18n.t(key, options) as string;
  } catch (error) {
    console.error('Error al traducir:', error);
    return key;
  }
}

export function changeLanguage(lang: string): Promise<any> {
  try {
    return i18n.changeLanguage(lang);
  } catch (error) {
    console.error('Error al cambiar el lenguaje:', error);
    return Promise.reject(error);
  }
}

export function hasResourceBundle(language: string, namespace: string): boolean {
  try {
    return i18n.hasResourceBundle(language, namespace);
  } catch (error) {
    console.error('Error al verificar el bundle de recursos:', error);
    return false;
  }
}

export function addResourceBundle(language: string, namespace: string, resources: Resources): void {
  try {
    i18n.addResourceBundle(language, namespace, resources);
  } catch (error) {
    console.error('Error al agregar el bundle de recursos:', error);
  }
}

export function resetI18n(): void {
  try {
    (i18n as any).reset?.();
  } catch (error) {
    console.error('Error al resetear i18n:', error);
  }
}

export default i18n;