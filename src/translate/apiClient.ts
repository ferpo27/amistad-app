// src/translate/apiClient.ts
// translatorHealth y getTranslatorBaseUrl — compatibles con chat/[id].tsx
// No depende de un servidor local: siempre retorna ok=true
// (la traducción real la hace autoTranslate.ts via Google/MyMemory)

export function getTranslatorBaseUrl(): string {
  return "Google Translate + MyMemory (sin servidor local)";
}

export async function translatorHealth(): Promise<boolean> {
  // Sin servidor local, siempre disponible
  return true;
}

// Mantenemos translateViaApi por compatibilidad (no se usa en el chat nuevo)
export async function translateViaApi(req: {
  text: string;
  from: string;
  to: string;
}): Promise<string> {
  // Redirige a Google Translate como fallback
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx" +
      "&sl=" + req.from +
      "&tl=" + req.to +
      "&dt=t&q=" + encodeURIComponent(req.text.trim());
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    return ((data[0] ?? []) as any[][])
      .map((seg) => (seg[0] ?? "") as string)
      .join("")
      .trim() || req.text;
  } catch {
    return req.text;
  }
}