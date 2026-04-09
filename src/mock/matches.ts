/**
 * src/mock/matches.ts
 * Tipos base para perfiles de match/conexión.
 * botReply.ts hace module augmentation sobre este archivo — no modificar la interfaz base.
 */

export interface MatchProfile {
  id: string;
  name: string;
  country: string;
  nativeLang: string;
  targetLang?: string;
  interests?: string[];
  bio?: string;
  avatar?: string;
  age?: number;
  isOnline?: boolean;
}

export const mockMatches: MatchProfile[] = [
  {
    id: "mock-1",
    name: "Yuki",
    country: "Japan",
    nativeLang: "ja",
    targetLang: "es",
    interests: ["anime", "cooking", "travel"],
    bio: "Looking to practice Spanish!",
    isOnline: true,
  },
  {
    id: "mock-2",
    name: "Carlos",
    country: "Mexico",
    nativeLang: "es",
    targetLang: "en",
    interests: ["music", "soccer", "movies"],
    bio: "Quiero mejorar mi inglés.",
    isOnline: false,
  },
  {
    id: "mock-3",
    name: "Sophie",
    country: "France",
    nativeLang: "fr",
    targetLang: "es",
    interests: ["art", "literature", "coffee"],
    bio: "J'apprends l'espagnol.",
    isOnline: true,
  },
];

export default mockMatches;