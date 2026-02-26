// src/storage/profileStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/** ✅ Definimos LanguageCode acá para NO depender de otros archivos */
export type LanguageCode = "es" | "en" | "de" | "ja" | "ru" | "zh";

export type ProfileStory = {
  id: string;
  imageUri: string;
  createdAt: number;
  caption?: string;
};

export type LearningLanguage = {
  lang: LanguageCode;
  level: string;
};

export type MyProfile = {
  id: "me";
  name: string;
  username: string;
  country?: string;
  nativeLang: LanguageCode;
  learning: LearningLanguage[];
  bio: string;
  interests: string[];
  photos: string[];
  stories: ProfileStory[];
  motivations?: string[];
  practicePrefs?: string[];
};

export type Profile = MyProfile;

/** ✅ Lee legacy y escribe siempre en v3 */
const KEY_V3 = "myProfile_v3";
const LEGACY_KEYS = ["myProfile_v2", "myProfile_v1"];

const DEFAULT: MyProfile = {
  id: "me",
  name: "Jorge",
  username: "jorge",
  country: "Argentina",
  nativeLang: "es",
  learning: [
    { lang: "en", level: "B1" },
    { lang: "ja", level: "A1" },
  ],
  bio: "Estoy aca para hacer amigos y practicar idiomas.",
  interests: ["Trading", "Gym", "Musica"],
  photos: [],
  stories: [],
  motivations: [],
  practicePrefs: [],
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

const arr = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

function sanitize(raw: any): MyProfile {
  const base = DEFAULT;

  const name = typeof raw?.name === "string" ? raw.name : base.name;
  const username = typeof raw?.username === "string" ? raw.username : base.username;
  const country = typeof raw?.country === "string" ? raw.country : base.country;

  const nativeLang =
    raw?.nativeLang === "es" ||
    raw?.nativeLang === "en" ||
    raw?.nativeLang === "de" ||
    raw?.nativeLang === "ja" ||
    raw?.nativeLang === "ru" ||
    raw?.nativeLang === "zh"
      ? (raw.nativeLang as LanguageCode)
      : base.nativeLang;

  const bio = typeof raw?.bio === "string" ? raw.bio : base.bio;

  const interests = arr<string>(raw?.interests).filter(Boolean);

  const motivations = arr<string>(raw?.motivations).filter(Boolean);
  const practicePrefs = arr<string>(raw?.practicePrefs).filter(Boolean);

  const photos = arr<string>(raw?.photos).filter(Boolean);

  const learning = arr<any>(raw?.learning)
    .filter((x) => x && typeof x === "object" && typeof x.lang === "string")
    .map((x) => ({
      lang: x.lang as LanguageCode,
      level: typeof x.level === "string" ? x.level : "A1",
    }));

  const stories = arr<any>(raw?.stories)
    .filter((s) => s && typeof s === "object" && typeof s.imageUri === "string")
    .map((s) => ({
      id: typeof s.id === "string" ? s.id : uid("story"),
      imageUri: s.imageUri as string,
      createdAt: typeof s.createdAt === "number" ? s.createdAt : Date.now(),
      caption: typeof s.caption === "string" ? s.caption : "",
    }));

  return {
    id: "me",
    name,
    username,
    country,
    nativeLang,
    learning,
    bio,
    interests,
    photos,
    stories,
    motivations,
    practicePrefs,
  };
}

async function writeV3(p: MyProfile) {
  await AsyncStorage.setItem(KEY_V3, JSON.stringify(p));
}

async function readAny(): Promise<string | null> {
  const v3 = await AsyncStorage.getItem(KEY_V3);
  if (v3) return v3;

  for (const k of LEGACY_KEYS) {
    const v = await AsyncStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

/** =========================================================
 * EXPORTS que TU tab necesita (y además compat)
 * ========================================================= */
export async function getMyProfile(): Promise<MyProfile> {
  const raw = await readAny();

  if (!raw) {
    await writeV3(DEFAULT);
    return DEFAULT;
  }

  try {
    const parsed = JSON.parse(raw);
    const clean = sanitize(parsed);
    await writeV3(clean);
    return clean;
  } catch {
    await writeV3(DEFAULT);
    return DEFAULT;
  }
}

export async function updateMyProfile(patch: Partial<MyProfile>): Promise<MyProfile> {
  const cur = await getMyProfile();
  const next = sanitize({ ...cur, ...patch });
  await writeV3(next);
  return next;
}

export async function addProfilePhoto(uri: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  const photos = [uri, ...cur.photos.filter((p) => p !== uri)].slice(0, 9);
  const next = sanitize({ ...cur, photos });
  await writeV3(next);
  return next;
}

export async function removeProfilePhoto(uri: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  const photos = cur.photos.filter((p) => p !== uri);
  const next = sanitize({ ...cur, photos });
  await writeV3(next);
  return next;
}

export async function addStory(imageUri: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  const story: ProfileStory = {
    id: uid("story"),
    imageUri,
    createdAt: Date.now(),
    caption: "",
  };
  const stories = [story, ...cur.stories].slice(0, 50);
  const next = sanitize({ ...cur, stories });
  await writeV3(next);
  return next;
}

export async function updateStory(
  storyId: string,
  patch: Partial<ProfileStory>
): Promise<MyProfile> {
  const cur = await getMyProfile();
  const stories = cur.stories.map((s) => (s.id === storyId ? { ...s, ...patch } : s));
  const next = sanitize({ ...cur, stories });
  await writeV3(next);
  return next;
}

export async function deleteStory(storyId: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  const stories = cur.stories.filter((s) => s.id !== storyId);
  const next = sanitize({ ...cur, stories });
  await writeV3(next);
  return next;
}

/** ✅ Aliases de compat para que no se rompa nada si alguien usa estos nombres */
export const getProfile = getMyProfile;
export const updateProfile = updateMyProfile;