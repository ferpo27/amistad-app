import AsyncStorage from "@react-native-async-storage/async-storage";

export type LanguageCode = "es" | "en" | "de" | "ja" | "ru" | "zh";

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

const KEY = "myProfile_v2";

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
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export async function getMyProfile(): Promise<MyProfile> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    await AsyncStorage.setItem(KEY, JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  }
  try {
    return JSON.parse(raw) as MyProfile;
  } catch {
    await AsyncStorage.setItem(KEY, JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  }
}

export async function updateMyProfile(
  patch: Partial<MyProfile>
): Promise<MyProfile> {
  const cur = await getMyProfile();
  const next: MyProfile = { ...cur, ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function addProfilePhoto(uri: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  const next = { ...cur, photos: [uri, ...cur.photos].slice(0, 9) };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeProfilePhoto(uri: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  const next = { ...cur, photos: cur.photos.filter((p) => p !== uri) };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
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
  const next = { ...cur, stories: [story, ...cur.stories] };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function updateStory(
  storyId: string,
  patch: Partial<ProfileStory>
): Promise<MyProfile> {
  const cur = await getMyProfile();
  const next = {
    ...cur,
    stories: cur.stories.map((s) =>
      s.id === storyId ? { ...s, ...patch } : s
    ),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function deleteStory(storyId: string): Promise<MyProfile> {
  const cur = await getMyProfile();
  const next = {
    ...cur,
    stories: cur.stories.filter((s) => s.id !== storyId),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
