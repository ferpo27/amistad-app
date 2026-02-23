// src/matching/calculateCompatibility.ts

type MeProfile = {
  interests: string[];
  goalLanguage?: string; // "EN", "ES", "DE", "JA", "RU", "ZH"
};

type LearningLike =
  | string
  | Array<{ code?: string; level?: string; lang?: string }>
  | null
  | undefined;

type DiscoverProfile = {
  id: string;
  name: string;
  country?: string;
  native?: string;
  learning?: LearningLike; // ✅ ahora soporta string o array
  interests?: string[];
};

function norm(s: string) {
  return (s ?? "").trim().toLowerCase();
}

function parseLearningLang(learning: LearningLike): string | null {
  // string: "ES B1" => "ES"
  if (typeof learning === "string") {
    const parts = learning.trim().split(/\s+/);
    if (!parts.length) return null;
    const lang = parts[0].toUpperCase();
    if (lang.length < 2 || lang.length > 3) return null;
    return lang;
  }

  // array: [{code:"ES", level:"B1"}] => "ES" (primero)
  if (Array.isArray(learning) && learning.length > 0) {
    const first = learning[0];
    const code = (first.code ?? first.lang ?? "").toUpperCase().trim();
    if (code.length < 2 || code.length > 3) return null;
    return code;
  }

  return null;
}

export function calculateCompatibility(me: MeProfile, p: DiscoverProfile): number {
  const myInterests = new Set((me.interests ?? []).map((x) => norm(x)));
  const otherInterests = (p.interests ?? []).map((x) => norm(x));

  const shared = otherInterests.filter((x) => myInterests.has(x));
  const unionSize = new Set([
    ...(me.interests ?? []).map((x) => norm(x)),
    ...(p.interests ?? []).map((x) => norm(x)),
  ]).size;

  const interestScore = unionSize === 0 ? 0 : shared.length / unionSize;

  const goal = (me.goalLanguage ?? "").toUpperCase();
  const theirLearning = parseLearningLang(p.learning);
  const langBonus = goal && theirLearning === goal ? 0.25 : 0;

  return Math.min(1, interestScore + langBonus);
}
