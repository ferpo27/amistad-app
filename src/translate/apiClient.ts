// src/translate/apiClient.ts
import { TRANSLATOR_API_BASE, type TranslateRequest, type TranslateResponse } from "./config";

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export async function translateViaApi(req: TranslateRequest): Promise<string> {
  const url = `${TRANSLATOR_API_BASE}/translate`;

  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }),
    7000
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${txt}`);
  }

  const json = (await res.json()) as TranslateResponse;
  return (json?.translated ?? "").toString();
}
