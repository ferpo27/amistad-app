// src/mock/profiles.ts
import type { LanguageCode, LearningLang } from "../storage";

export type Story = {
  id: string;
  title: string;
  photos: string[]; // urls o require(...) más adelante
  ts: number;
};

export type PublicProfile = {
  id: string;
  name: string;
  country: string;
  city: string;
  nativeLang: LanguageCode;
  learning: LearningLang[];
  bio: string;
  favoriteFood?: string;
  interests: string[];
  photos: string[]; // fotos del perfil
  stories: Story[];
};

export const PROFILES: PublicProfile[] = [
  {
    id: "anna",
    name: "Anna",
    country: "Germany",
    city: "Berlin",
    nativeLang: "de",
    learning: [{ lang: "es", level: "B1" }],
    bio: "Coffee lover. I like museums and weekend hikes.",
    favoriteFood: "Käsespätzle",
    interests: ["Coffee", "Museums", "Hiking", "Tech"],
    photos: ["https://picsum.photos/400/400?1"],
    stories: [
      {
        id: "s1",
        title: "Berlin café",
        photos: ["https://picsum.photos/600/900?11"],
        ts: Date.now() - 1000 * 60 * 60 * 3,
      },
      {
        id: "s2",
        title: "Street food",
        photos: ["https://picsum.photos/600/900?12"],
        ts: Date.now() - 1000 * 60 * 60 * 20,
      },
    ],
  },
  {
    id: "masha",
    name: "Masha",
    country: "Russia",
    city: "Moscow",
    nativeLang: "ru",
    learning: [{ lang: "en", level: "B2" }],
    bio: "Books, design, and walking around the city.",
    favoriteFood: "Pelmeni",
    interests: ["Books", "Design", "Photography"],
    photos: ["https://picsum.photos/400/400?2"],
    stories: [
      { id: "s1", title: "Snow day", photos: ["https://picsum.photos/600/900?21"], ts: Date.now() - 999999 },
    ],
  },
];
