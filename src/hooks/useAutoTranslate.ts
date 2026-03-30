import { useState, useEffect } from 'react';
import { translateRaw } from 'src/translate/autoTranslate';

type AutoTranslateOptions = { 
  from?: string; 
  to: string 
}

type UseAutoTranslateResult = {
  translatedText: string;
  loading: boolean;
  error: Error | null;
};

export function useAutoTranslate(
  text: string,
  options?: AutoTranslateOptions
): UseAutoTranslateResult {
  const [translatedText, setTranslatedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runTranslate = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await translateRaw(text, options); // @ts-ignore
        if (!cancelled) {
          setTranslatedText(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as any);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (text && options && options.to) {
      runTranslate();
    } else {
      setTranslatedText('');
      setLoading(false);
      setError(null);
    }

    return () => {
      cancelled = true;
      // Agregar un console.log para ver que se está llamando correctamente
      console.log('useAutoTranslate: Cancelar la traducción');
    };
  }, [text, JSON.stringify(options)]);

  // Agregar un console.log para ver que se está llamando correctamente
  console.log('useAutoTranslate: Se está llamando');

  return {
    translatedText,
    loading,
    error,
  };
}