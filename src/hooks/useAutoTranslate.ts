import { useState, useEffect } from 'react';
import { autoTranslate } from '../translate/autoTranslate';

type AutoTranslateOptions = { from?: string; to: string }

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

    const useAutoTranslate = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await autoTranslate(text, options);
        if (!cancelled) {
          setTranslatedText(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (text && options && options.to) {
      useAutoTranslate();
    } else {
      setTranslatedText('');
      setLoading(false);
      setError(null);
    }

    return () => {
      cancelled = true;
    };
  }, [text, JSON.stringify(options)]);

  return {
    translatedText,
    loading,
    error,
  };
}