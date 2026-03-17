/**
 * Mapa de códigos de idioma a sus nombres legibles.
 *
 * Cada clave es un código ISO 639‑1 (por ejemplo, `en`, `es`, `fr`) y el
 * valor es el nombre del idioma en inglés.
 */
export interface LanguageMap {
  /** Inglés */
  en: string;
  /** Español */
  es: string;
  /** Francés */
  fr: string;
  /** Alemán */
  de: string;
  /** Italiano */
  it: string;
  /** Portugués */
  pt: string;
  /** Otros códigos pueden añadirse según sea necesario */
  [code: string]: string;
}

/**
 * Tipo que representa cualquier código de idioma presente en {@link LanguageMap}.
 */
export type LanguageCode = keyof LanguageMap;

/**
 * Resultado de una operación de traducción.
 */
export interface TranslationResult {
  /** Texto original antes de la traducción. */
  originalText: string;
  /** Texto traducido al idioma de destino. */
  translatedText: string;
  /** Código del idioma de origen. */
  sourceLang: LanguageCode;
  /** Código del idioma de destino. */
  targetLang: LanguageCode;
}

/**
 * Solicitud de traducción.
 */
export interface TranslateRequest {
  /** Texto a traducir. */
  text: string;
  /** Código del idioma de origen. */
  sourceLang: LanguageCode;
  /** Código del idioma de destino. */
  targetLang: LanguageCode;
}

/**
 * Respuesta de traducción.
 */
export interface TranslateResponse {
  /** Resultado de la traducción. */
  result: TranslationResult;
  /** Código de estado de la respuesta (por ejemplo, 200 para éxito). */
  statusCode: number;
  /** Mensaje de error en caso de fallo (opcional). */
  errorMessage?: string;
}