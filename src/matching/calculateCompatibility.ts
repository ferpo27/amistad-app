/**
 * @file calculateCompatibility.ts
 * @module src/matching
 *
 * Compatibility scoring engine for Amistad.
 *
 * Design principles:
 *  - Zero external dependencies (fully self-contained).
 *  - Pure functions: deterministic, testable, no side effects.
 *  - All weights are named constants so product can tune without touching logic.
 *  - Score is always [0, 1] — callers can multiply by 100 for display.
 *  - Designed to run on millions of profile pairs; O(n) on interests where
 *    n = number of unique interests per user (bounded ~50 in practice).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * ISO 639-1 language code (e.g. "en", "es", "pt", "zh").
 * Kept as `string` so the engine doesn't need to maintain an exhaustive enum —
 * new languages added to the app just work.
 */
export type LanguageCode = string;

/**
 * Date of birth. Stored as a plain object to survive JSON round-trips through
 * AsyncStorage / Supabase JSONB without timezone drift that Date() introduces.
 */
export interface DOB {
  year: number;
  /** 1-indexed (January = 1) */
  month: number;
  /** 1-indexed */
  day: number;
}

/** A language the user is currently learning, with self-assessed level. */
export interface LearningEntry {
  lang: LanguageCode;
  /**
   * CEFR level string: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "native"
   * or null/undefined when not set. Used for future level-aware scoring.
   */
  level?: string | null;
}

/**
 * Caller-facing profile slice for the *current user* (me).
 * Sourced from profilesStorage.getProfile().
 */
export interface MeProfile {
  interests?: string[];
  nativeLang?: LanguageCode;
  /** Languages the current user is learning. */
  learning?: LanguageCode[];
  dob?: DOB | null;
}

/**
 * Caller-facing profile slice for a *discovered user*.
 * Sourced from Supabase discovery query or profilesStorage.getProfileById().
 */
export interface DiscoverProfile {
  id: string;
  name: string;
  nativeLang?: LanguageCode;
  /** Structured learning entries from the `preferences.learn` JSONB array. */
  learning?: LearningEntry[] | null;
  interests?: string[];
  dob?: DOB | null;
}

// ─── Weight constants ─────────────────────────────────────────────────────────
// All weights must sum to ≤ 1.0 at their maximum achievable value.
// Current maximum breakdown:
//   Language complement (perfect bilateral): LANG_PERFECT_BONUS           = 0.10
//   Language one-way (×2, max):              LANG_ONE_WAY × 2             = 0.40
//   Interest Jaccard (weight × max=1):       WEIGHT_INTERESTS × 1.0       = 0.40
//   Age bonus (max):                         AGE_BONUS_VERY_CLOSE         = 0.10
//   Total possible max                                                     = 1.00

const WEIGHT_INTERESTS       = 0.40; // Jaccard coefficient weight
const LANG_ONE_WAY           = 0.20; // One direction language complement
const LANG_PERFECT_BONUS     = 0.10; // Extra when exchange is fully bilateral
const AGE_BONUS_VERY_CLOSE   = 0.10; // ≤ 2 year difference
const AGE_BONUS_CLOSE        = 0.07; // ≤ 5 year difference
const AGE_BONUS_MODERATE     = 0.04; // ≤ 8 year difference
const AGE_THRESHOLD_VERY_CLOSE = 2;
const AGE_THRESHOLD_CLOSE      = 5;
const AGE_THRESHOLD_MODERATE   = 8;

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Normalize a tag/interest string for case-insensitive, whitespace-insensitive comparison. */
function normalizeTag(s: string): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Clamp a number to [0, 1]. */
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Compute the Jaccard similarity coefficient between two interest lists.
 *
 * Jaccard = |A ∩ B| / |A ∪ B|
 *
 * Returns 0 when both sets are empty (avoids 0/0 and treats two blank
 * profiles as having no discoverable similarity rather than perfect match).
 */
function interestJaccard(a: string[], b: string[]): number {
  const setA = new Set((a ?? []).map(normalizeTag).filter(Boolean));
  const setB = new Set((b ?? []).map(normalizeTag).filter(Boolean));

  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  // Iterate the smaller set for efficiency
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const tag of smaller) {
    if (larger.has(tag)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Build a Set<LanguageCode> from a DiscoverProfile's learning array.
 * Tolerates null, undefined, and entries with missing lang fields.
 */
function learningSet(entries: DiscoverProfile["learning"]): Set<LanguageCode> {
  const result = new Set<LanguageCode>();
  if (!Array.isArray(entries)) return result;
  for (const entry of entries) {
    if (entry?.lang) result.add(entry.lang);
  }
  return result;
}

/**
 * Calculate age in full years from a DOB object.
 * Returns null if the DOB is missing or invalid.
 */
export function ageFromDob(dob?: DOB | null): number | null {
  if (!dob || typeof dob.year !== "number" || typeof dob.month !== "number" || typeof dob.day !== "number") {
    return null;
  }
  const today = new Date();
  const birth = new Date(dob.year, dob.month - 1, dob.day);
  if (isNaN(birth.getTime())) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  // Sanity check: reject unrealistic ages
  if (age < 13 || age > 120) return null;
  return age;
}

/**
 * Age proximity bonus.
 * Language-learning apps skew toward peers — users with similar ages tend to
 * have more overlapping cultural references and learning contexts.
 */
function ageProximityBonus(meDob?: DOB | null, otherDob?: DOB | null): number {
  const ageMe    = ageFromDob(meDob);
  const ageOther = ageFromDob(otherDob);
  if (ageMe === null || ageOther === null) return 0;

  const diff = Math.abs(ageMe - ageOther);
  if (diff <= AGE_THRESHOLD_VERY_CLOSE) return AGE_BONUS_VERY_CLOSE;
  if (diff <= AGE_THRESHOLD_CLOSE)      return AGE_BONUS_CLOSE;
  if (diff <= AGE_THRESHOLD_MODERATE)   return AGE_BONUS_MODERATE;
  return 0;
}

// ─── Language scoring ─────────────────────────────────────────────────────────

/**
 * Language complement score (0 → 0.5).
 *
 * The core value proposition of Amistad: I speak what you're learning, and
 * you speak what I'm learning. Rewards:
 *   +0.20  if my native language is in their learning list (I can teach them)
 *   +0.20  if their native language is in my learning list (they can teach me)
 *   +0.10  bilateral bonus — both directions active simultaneously (perfect exchange)
 *
 * Maximum: 0.50 for a perfect bilateral language exchange partner.
 */
function languageComplementScore(me: MeProfile, other: DiscoverProfile): number {
  const myNative      = me.nativeLang;
  const myLearningSet = new Set((me.learning ?? []).filter(Boolean));
  const theirNative   = other.nativeLang;
  const theirLearning = learningSet(other.learning);

  let score = 0;

  // I can teach them my native
  const iCanTeach = Boolean(myNative && theirLearning.has(myNative));
  // They can teach me their native
  const theyCanTeach = Boolean(theirNative && myLearningSet.has(theirNative));

  if (iCanTeach)   score += LANG_ONE_WAY;
  if (theyCanTeach) score += LANG_ONE_WAY;

  // Perfect bilateral exchange bonus
  if (iCanTeach && theyCanTeach) score += LANG_PERFECT_BONUS;

  return score;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate a compatibility score between the current user and a discovered profile.
 *
 * @param me  - Current user's profile slice (from profilesStorage.getProfile)
 * @param p   - Discovered user's profile (from Supabase discovery query)
 * @returns   A float in [0, 1] where 1.0 is perfect compatibility.
 *
 * @example
 * ```ts
 * const score = calculateCompatibility(myProfile, discoveredProfile);
 * const percent = Math.round(score * 100); // e.g. 87
 * ```
 */
export function calculateCompatibility(me: MeProfile, p: DiscoverProfile): number {
  const interestScore  = interestJaccard(me.interests ?? [], p.interests ?? []);
  const langScore      = languageComplementScore(me, p);
  const ageBonus       = ageProximityBonus(me.dob, p.dob);

  const raw = WEIGHT_INTERESTS * interestScore + langScore + ageBonus;
  return clamp01(raw);
}

/**
 * Batch-score a list of profiles and return them sorted by compatibility descending.
 * Useful for pre-sorting the discovery feed before rendering.
 *
 * @param me       - Current user's profile
 * @param profiles - Array of discovered profiles
 * @returns        Array of { profile, score } sorted highest-first
 */
export function rankByCompatibility(
  me: MeProfile,
  profiles: DiscoverProfile[],
): Array<{ profile: DiscoverProfile; score: number }> {
  return profiles
    .map((profile) => ({ profile, score: calculateCompatibility(me, profile) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Human-readable compatibility label for UI display.
 *
 * @param score - Output of calculateCompatibility (0–1)
 * @returns     i18n-ready key string
 */
export function compatibilityLabel(score: number): string {
  if (score >= 0.85) return "compatibility.excellent";   // "Excellent match"
  if (score >= 0.65) return "compatibility.great";       // "Great match"
  if (score >= 0.45) return "compatibility.good";        // "Good match"
  if (score >= 0.25) return "compatibility.fair";        // "Fair match"
  return "compatibility.low";                            // "Low match"
}