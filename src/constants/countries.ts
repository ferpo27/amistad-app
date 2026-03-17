// src/constants/countries.ts

export type CountryItem = {
  code: string; // ISO-2 (AR, US, DE...)
  name: string; // Nombre visible
};

export const COUNTRIES: CountryItem[] = [
  { code: "AR", name: "Argentina" },
  { code: "UY", name: "Uruguay" },
  { code: "CL", name: "Chile" },
  { code: "PY", name: "Paraguay" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brasil" },
  { code: "PE", name: "Perú" },
  { code: "EC", name: "Ecuador" },
  { code: "CO", name: "Colombia" },
  { code: "VE", name: "Venezuela" },
  { code: "MX", name: "México" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "CA", name: "Canadá" },
  { code: "DE", name: "Alemania" },
  { code: "FR", name: "Francia" },
  { code: "IT", name: "Italia" },
  { code: "GB", name: "Reino Unido" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Países Bajos" },
  { code: "BE", name: "Bélgica" },
  { code: "CH", name: "Suiza" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Suecia" },
  { code: "NO", name: "Noruega" },
  { code: "DK", name: "Dinamarca" },
  { code: "PL", name: "Polonia" },
  { code: "CZ", name: "Chequia" },
  { code: "HU", name: "Hungría" },
  { code: "RO", name: "Rumania" },
  { code: "TR", name: "Turquía" },
  { code: "RU", name: "Rusia" },
  { code: "UA", name: "Ucrania" },
  { code: "IL", name: "Israel" },
  { code: "AE", name: "Emiratos Árabes Unidos" },
  { code: "SA", name: "Arabia Saudita" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japón" },
  { code: "KR", name: "Corea del Sur" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "Nueva Zelanda" },
];

export function flagFromISO2(code: string) {
  const cc = (code || "").toUpperCase();
  if (cc.length !== 2) return "🌐";
  const a = cc.charCodeAt(0) - 65 + 0x1f1e6;
  const b = cc.charCodeAt(1) - 65 + 0x1f1e6;
  return String.fromCodePoint(a, b);
}

export function formatCountry(code: string, name: string) {
  return `${flagFromISO2(code)} ${name}`;
}