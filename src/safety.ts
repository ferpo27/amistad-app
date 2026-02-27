// src/safety.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReportReason =
  | "spam"
  | "acoso"
  | "contenido_sexual"
  | "odio"
  | "estafa"
  | "otro";

export async function reportUser(params: {
  id: string;
  reason: ReportReason;
  note?: string;
}): Promise<void> {
  const raw = await AsyncStorage.getItem("reports");
  const reports: typeof params[] = raw ? JSON.parse(raw) : [];
  reports.push({ ...params });
  await AsyncStorage.setItem("reports", JSON.stringify(reports));
}

export async function blockUser(userId: string): Promise<void> {
  const raw = await AsyncStorage.getItem("blocked");
  const blocked: string[] = raw ? JSON.parse(raw) : [];
  if (!blocked.includes(userId)) {
    blocked.push(userId);
    await AsyncStorage.setItem("blocked", JSON.stringify(blocked));
  }
}

export async function isBlocked(userId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem("blocked");
  const blocked: string[] = raw ? JSON.parse(raw) : [];
  return blocked.includes(userId);
}

export async function getBlockedList(): Promise<string[]> {
  const raw = await AsyncStorage.getItem("blocked");
  return raw ? JSON.parse(raw) : [];
}