// src/profileStore.ts  ← ÚNICO archivo canónico. src/storage/profileStore.ts fue eliminado.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LanguageCode } from "./storage";

export type { LanguageCode };

export type ProfileStory = {
  id: string;
  imageUri: string;
  createdAt: number;
  caption?: string;
};

export type MyProfile = {
  id: "me";
  name: string;
  username: string;
  country?: string;
  nativeLang: LanguageCode;
  learning: { lang: LanguageCode; level: string }[];
  bio: string;
  interests: string[];
  photos: string[];
  stories: ProfileStory[];
};

// v3 — nueva key para migración limpia
const KEY = "myProfile_v3";

const DEFAULT_PROFILE: MyProfile = {
  id: "me",
  name: "Jorge",
  username: "jorge",
  country: "Argentina",
  nativeLang: "es",
  learning: [
    { lang: "en", level: "B1" },
    { lang: "ja", level: "A1" },
  ],
  bio: "Estoy acá para hacer amigos y practicar idiomas.",
  interests: ["Trading", "Gym", "Música"],
  photos: [],
  stories: [],
};

function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(16).slice(2) + "_" + Date.now();
}

function normalize(raw: any): MyProfile {
  return {
    id: "me",
    name: typeof raw?.name === "string" ? raw.name : DEFAULT_PROFILE.name,
    username: typeof raw?.username === "string" ? raw.username : DEFAULT_PROFILE.username,
    country: typeof raw?.country === "string" ? raw.country : DEFAULT_PROFILE.country,
    nativeLang: (raw?.nativeLang ?? DEFAULT_PROFILE.nativeLang) as LanguageCode,
    learning: Array.isArray(raw?.learning) ? raw.learning : DEFAULT_PROFILE.learning,
    bio: typeof raw?.bio === "string" ? raw.bio : DEFAULT_PROFILE.bio,
    interests: Array.isArray(raw?.interests) ? raw.interests : DEFAULT_PROFILE.interests,
    photos: Array.isArray(raw?.photos) ? raw.photos : [],
    stories: Array.isArray(raw?.stories) ? raw.stories : [],
  };
}

export async function getMyProfile(): Promise<MyProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      await AsyncStorage.setItem(KEY, JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function updateMyProfile(patch: Partial<MyProfile>): Promise<MyProfile> {
  const cur = await getMyProfile();
  const next = normalize({ ...cur, ...patch });
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function addProfilePhoto(uri: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  return updateMyProfile({ photos: [uri, ...cur.photos].slice(0, 9) });
}

export async function removeProfilePhoto(uri: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  return updateMyProfile({ photos: cur.photos.filter((p) => p !== uri) });
}

export async function addStory(imageUri: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  const story: ProfileStory = {
    id: uid("story"),
    imageUri,
    createdAt: Date.now(),
    caption: "",
  };
  return updateMyProfile({ stories: [story, ...cur.stories] });
}

export async function updateStory(
  storyId: string,
  patch: Partial<ProfileStory>
): Promise<MyProfile> {
  const cur = await getMyProfile();
  return updateMyProfile({
    stories: cur.stories.map((s) => (s.id === storyId ? { ...s, ...patch } : s)),
  });
}

export async function deleteStory(storyId: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  return updateMyProfile({ stories: cur.stories.filter((s) => s.id !== storyId) });
}