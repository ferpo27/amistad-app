// src/matching/calculateCompatibility.ts
import type { LanguageCode, DOB } from "../storage";
import { ageFromDob } from "../storage";

type MeProfile = {
  interests: string[];
  nativeLang?: LanguageCode;
  learning?: LanguageCode[];
  dob?: DOB;
};

type DiscoverProfile = {
  id: string;
  name: string;
  nativeLang?: LanguageCode;
  learning?: Array<{ lang?: LanguageCode; level?: string | null }> | null;
  interests?: string[];
  dob?: DOB;
};

function norm(s: string) { return (s ?? "").trim().toLowerCase(); }
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

function interestJaccard(a: string[], b: string[]) {
  const A = new Set((a ?? []).map(norm).filter(Boolean));
  const B = new Set((b ?? []).map(norm).filter(Boolean));
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

function asLearningSet(learning: DiscoverProfile["learning"]): Set<LanguageCode> {
  const s = new Set<LanguageCode>();
  if (!Array.isArray(learning)) return s;
  for (const it of learning) {
    const lang = it?.lang;
    if (lang) s.add(lang);
  }
  return s;
}

function ageBonus(meDob?: DOB, otherDob?: DOB) {
  const a = ageFromDob(meDob);
  const b = ageFromDob(otherDob);
  if (a == null || b == null) return 0;
  const diff = Math.abs(a - b);
  if (diff <= 2) return 0.10;
  if (diff <= 5) return 0.07;
  if (diff <= 8) return 0.04;
  return 0;
}

export function calculateCompatibility(me: MeProfile, p: DiscoverProfile): number {
  const interestScore = interestJaccard(me.interests ?? [], p.interests ?? []);
  const myNative = me.nativeLang;
  const myLearning = new Set((me.learning ?? []).filter(Boolean));
  const theirNative = p.nativeLang;
  const theirLearning = asLearningSet(p.learning);
  let langScore = 0;
  if (myNative && theirLearning.has(myNative)) langScore += 0.20;
  if (theirNative && myLearning.has(theirNative)) langScore += 0.20;
  if (myNative && theirNative && theirLearning.has(myNative) && myLearning.has(theirNative)) {
    langScore += 0.10;
  }
  const aBonus = ageBonus(me.dob, p.dob);
  const score = 0.60 * interestScore + langScore + aBonus;
  return clamp01(score);
}