import type { LanguageCode, LanguageLevel } from "../storage";

export type MatchProfile = {
  id: string;
  name: string;
  country: string;
  nativeLang: LanguageCode;
  learning: { lang: LanguageCode; level: LanguageLevel }[];
  interests: string[];
  bio: string;
  photos: string[];
};

export const MATCHES: MatchProfile[] = [
  {
    id: "anna_de",
    name: "Anna",
    country: "Germany",
    nativeLang: "de",
    learning: [{ lang: "es", level: "B1" }],
    interests: ["gym", "architecture", "travel"],
    bio: "Architecture student from Berlin.",
    photos: [],
  },
  {
    id: "hiro_ja",
    name: "Hiro",
    country: "Japan",
    nativeLang: "ja",
    learning: [{ lang: "en", level: "B2" }],
    interests: ["anime", "technology", "finance"],
    bio: "Interested in global markets and culture.",
    photos: [],
  },
  {
    id: "li_zh",
    name: "Li",
    country: "China",
    nativeLang: "zh",
    learning: [{ lang: "en", level: "A2" }],
    interests: ["food", "culture", "travel"],
    bio: "I love exploring international cuisines.",
    photos: [],
  },
  {
    id: "ivan_ru",
    name: "Ivan",
    country: "Russia",
    nativeLang: "ru",
    learning: [{ lang: "es", level: "A1" }],
    interests: ["history", "philosophy", "gym"],
    bio: "Interested in philosophy and languages.",
    photos: [],
  },
];
