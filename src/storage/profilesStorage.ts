// src/storage/profilesStorage.ts
import { supabase } from "../lib/supabase";
import * as ImagePicker from "expo-image-picker";

export type RemoteProfile = {
  id: string;
  displayName: string;
  username: string;
  country: string;
  city: string;
  nativeLang: string;
  bio: string;
  interests: string[];
  learning: { lang: string; level: string | null }[];
  photoUrl: string | null;
};

export async function getDiscoveryProfiles(limit = 20): Promise<RemoteProfile[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const myId = sessionData?.session?.user?.id;

  let query = supabase
    .from("profiles")
    .select("id, display_name, username, country, city, native_lang, bio, interests, learning, photo_url")
    .limit(limit);

  if (myId) query = query.neq("id", myId);

  const { data, error } = await query;
  if (error) { console.error("[profilesStorage]", error.message); return []; }
  return (data ?? []).map(rowToProfile);
}

export async function getProfileById(id: string): Promise<RemoteProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, country, city, native_lang, bio, interests, learning, photo_url")
    .eq("id", id)
    .single();
  if (error) return null;
  return rowToProfile(data);
}

export async function upsertMyProfile(patch: Partial<Omit<RemoteProfile, "id">>): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return false;

  const row: any = { id: userId };
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.country !== undefined) row.country = patch.country;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.nativeLang !== undefined) row.native_lang = patch.nativeLang;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.interests !== undefined) row.interests = patch.interests;
  if (patch.learning !== undefined) row.learning = patch.learning;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;

  const { error } = await supabase.from("profiles").upsert(row);
  if (error) { console.error("[profilesStorage] upsert:", error.message); return false; }
  return true;
}

export async function uploadProfilePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  const uri = result.assets[0].uri;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return null;

  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = uri.split(".").pop()?.split("?")[0] ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: `image/${ext}` });

  if (error) { console.error("[profilesStorage] upload:", error.message); return null; }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl ?? null;
}

function rowToProfile(row: any): RemoteProfile {
  return {
    id: row.id,
    displayName: row.display_name ?? "",
    username: row.username ?? "",
    country: row.country ?? "",
    city: row.city ?? "",
    nativeLang: row.native_lang ?? "es",
    bio: row.bio ?? "",
    interests: Array.isArray(row.interests) ? row.interests : [],
    learning: Array.isArray(row.learning) ? row.learning : [],
    photoUrl: row.photo_url ?? null,
  };
}