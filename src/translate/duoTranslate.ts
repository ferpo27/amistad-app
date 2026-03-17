// src/translate/duoTranslate.ts
import type { LanguageCode } from "../storage";

/**
 * Fix PRO:
 * - Traducción por PIVOT: from -> en -> to (si el par directo no existe)
 * - Tokenize mejor para JA/ZH (bloques + puntuación)
 * - Greedy segmentation CJK usando keys del diccionario del par disponible
 * - Mantiene API SINCRONA para NO romper tu DuoTranslatorSheet actual
 *
 * Nota: esto sigue siendo "mock translator" local (no IA),
 * pero ahora NO se rompe cuando toLang = de/ja/ru/zh.
 */

export type Token = {
  surface: string;
  value?: string;
  meaning?: string;
  kind?: "word" | "punct";
};

export type SentenceBlock = {
  original: string;
  tokens: Token[];
  translated: string;
};

type PairKey = `${LanguageCode}->${LanguageCode}`;

// -------------------------
// Normalización
// -------------------------
const PUNCT_TRIM_RE =
  /^[\s"'“”‘’(){}\[\]<>.,!?;:¿¡。、！？…·\-]+|[\s"'“”‘’(){}\[\]<>.,!?;:¿¡。、！？…·\-]+$/gu;

function normToken(s: string): string {
  return (s ?? "").trim().replace(PUNCT_TRIM_RE, "").toLowerCase();
}

function normSentence(s: string): string {
  return (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function isJustPunct(tok: string): boolean {
  return tok.trim().length > 0 && normToken(tok).length === 0;
}

function joinTokensHuman(tokens: string[]): string {
  const noSpaceBefore = new Set([
    ".",
    ",",
    "!",
    "?",
    ";",
    ":",
    "…",
    "。",
    "、",
    "！",
    "？",
    ")",
    "]",
    "}",
    ">",
    "”",
    "’",
  ]);
  const noSpaceAfter = new Set(["¿", "¡", "(", "[", "{", "<", "“", "‘"]);

  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : null;
    const needsSpace =
      out.length > 0 &&
      prev !== null &&
      !noSpaceAfter.has(prev) &&
      !noSpaceBefore.has(tok);
    out += (needsSpace ? " " : "") + tok;
  }
  return out.trim();
}

// -------------------------
// CJK helpers
// -------------------------
const RE_HAS_CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u; // kana+han
const RE_JA = /[\u3040-\u30ff\u4e00-\u9fff]/u;
const RE_ZH = /[\u4e00-\u9fff]/u;

function splitPunctCJK(s: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (const ch of s) {
    if ("。！？!?…、,".includes(ch)) {
      if (buf) out.push(buf);
      out.push(ch);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf) out.push(buf);
  return out.filter(Boolean);
}

// EU token split (hola! -> hola + !)
function splitPunctTokenEU(token: string): string[] {
  const t = token ?? "";
  if (!t.trim()) return [];
  const m = t.match(/^([¿¡"'“”‘’(\[{<]*)(.*?)([.,!?;:)"'”’)\]}>]*)$/u);
  if (!m) return [t];
  const [, pre, body, post] = m;
  const out: string[] = [];
  if (pre) out.push(pre);
  if (body) out.push(body);
  if (post) out.push(post);
  return out.filter((x) => x !== "");
}

/**
 * Tokenización:
 * - Si hay espacios: EU split + separar punct
 * - Si es CJK sin espacios: bloques por puntuación
 */
export function tokenize(sentence: string): string[] {
  const s = (sentence ?? "").trim();
  if (!s) return [];

  if (/\s/.test(s)) {
    return s.split(/\s+/).filter(Boolean).flatMap(splitPunctTokenEU);
  }
  if (RE_HAS_CJK.test(s)) return splitPunctCJK(s);
  return [s];
}

// -------------------------
// Diccionarios (BASE + PIVOT)
// -------------------------
const WORD_DICT: Record<PairKey, Record<string, string>> = {
  // ===== ja -> en/es =====
  "ja->en": {
    "こんにちは": "hello",
    "こんばんは": "good evening",
    "おはよう": "good morning",
    "元気ですか": "how are you?",
    "元気": "fine",
    "ありがとう": "thank you",
    "すみません": "sorry / excuse me",
    "私": "I",
    "わたし": "I",
    "僕": "I",
    "ぼく": "I",
    "東京": "Tokyo",
    "出身": "from",
    "です": "",
    "ですか": "",
    "は": "",
    "を": "",
    "に": "",
    "で": "",
    "の": "",
    "が": "",
    "も": "",
    "と": "",
  },
  "ja->es": {
    "こんにちは": "hola",
    "こんばんは": "buenas noches",
    "おはよう": "buen día",
    "元気ですか": "¿cómo estás?",
    "元気": "bien",
    "ありがとう": "gracias",
    "すみません": "perdón / disculpá",
    "私": "yo",
    "わたし": "yo",
    "僕": "yo",
    "ぼく": "yo",
    "東京": "Tokio",
    "出身": "de (origen)",
    "です": "",
    "ですか": "",
    "は": "",
    "を": "",
    "に": "",
    "で": "",
    "の": "",
    "が": "",
    "も": "",
    "と": "",
  },

  // ===== zh -> en/es =====
  "zh->en": {
    "你好": "hello",
    "您好": "hello (formal)",
    "早上好": "good morning",
    "晚上好": "good evening",
    "谢谢": "thank you",
    "对不起": "sorry",
    "我": "I",
    "你": "you",
    "他": "he",
    "她": "she",
    "我们": "we",
    "你们": "you (pl.)",
    "是": "am/is/are",
    "来自": "from",
    "北京": "Beijing",
    "上海": "Shanghai",
    "怎么": "how",
    "怎么样": "how is it",
  },
  "zh->es": {
    "你好": "hola",
    "您好": "hola (formal)",
    "早上好": "buen día",
    "晚上好": "buenas noches",
    "谢谢": "gracias",
    "对不起": "perdón",
    "我": "yo",
    "你": "vos",
    "他": "él",
    "她": "ella",
    "我们": "nosotros",
    "你们": "ustedes",
    "是": "ser/estar",
    "来自": "soy de",
    "北京": "Pekín",
    "上海": "Shanghái",
    "怎么": "cómo",
    "怎么样": "qué tal",
  },

  // ===== ru -> en/es =====
  "ru->en": {
    "привет": "hi",
    "как": "how",
    "дела": "are things",
    "как дела": "how are you?",
    "я": "I",
    "из": "from",
    "москвы": "Moscow",
    "спасибо": "thanks",
    "пожалуйста": "please / you're welcome",
  },
  "ru->es": {
    "привет": "hola",
    "как": "cómo",
    "дела": "estás",
    "как дела": "¿cómo estás?",
    "я": "yo",
    "из": "de",
    "москвы": "Moscú",
    "спасибо": "gracias",
    "пожалуйста": "por favor / de nada",
  },

  // ===== de -> en/es =====
  "de->en": {
    "hallo": "hello",
    "hi": "hi",
    "guten": "good",
    "morgen": "morning",
    "abend": "evening",
    "wie": "how",
    "geht": "goes",
    "gehts": "goes",
    "geht's": "goes",
    "dir": "you",
    "heute": "today",
    "ich": "I",
    "bin": "am",
    "komme": "come",
    "aus": "from",
    "von": "from",
    "berlin": "Berlin",
    "danke": "thanks",
    "bitte": "please / you're welcome",
    "nicht": "not",
    "ja": "yes",
    "nein": "no",
  },
  "de->es": {
    "hallo": "hola",
    "hi": "hola",
    "guten": "buen",
    "morgen": "día",
    "abend": "tarde/noche",
    "wie": "cómo",
    "geht": "va",
    "gehts": "va",
    "geht's": "va",
    "dir": "a vos",
    "heute": "hoy",
    "ich": "yo",
    "bin": "soy/estoy",
    "komme": "vengo",
    "aus": "de",
    "von": "de",
    "berlin": "Berlín",
    "danke": "gracias",
    "bitte": "por favor / de nada",
    "nicht": "no",
    "ja": "sí",
    "nein": "no",
  },

  // ===== PIVOT EN -> (es/de/ru/ja/zh) =====
  "en->es": {
    "hello": "hola",
    "hi": "hola",
    "good": "buen",
    "morning": "día",
    "evening": "tarde/noche",
    "how": "cómo",
    "are": "estás",
    "you": "vos",
    "today": "hoy",
    "i": "yo",
    "am": "soy/estoy",
    "from": "de",
    "thanks": "gracias",
    "thank": "gracias",
    "sorry": "perdón",
    "please": "por favor",
  },
  "en->de": {
    "hello": "hallo",
    "hi": "hi",
    "good": "guten",
    "morning": "morgen",
    "evening": "abend",
    "how": "wie",
    "are": "bist",
    "you": "du",
    "today": "heute",
    "i": "ich",
    "am": "bin",
    "from": "aus",
    "thanks": "danke",
    "sorry": "sorry",
    "please": "bitte",
  },
  "en->ru": {
    "hello": "привет",
    "hi": "привет",
    "good": "хорошо",
    "morning": "утро",
    "evening": "вечер",
    "how": "как",
    "are": "есть",
    "you": "ты",
    "today": "сегодня",
    "i": "я",
    "am": "есть",
    "from": "из",
    "thanks": "спасибо",
    "sorry": "извини",
    "please": "пожалуйста",
  },
  "en->ja": {
    "hello": "こんにちは",
    "hi": "こんにちは",
    "good": "良い",
    "morning": "朝",
    "evening": "夜",
    "how": "どう",
    "you": "あなた",
    "today": "今日",
    "i": "私",
    "from": "から",
    "thanks": "ありがとう",
    "sorry": "すみません",
    "please": "お願いします",
  },
  "en->zh": {
    "hello": "你好",
    "hi": "你好",
    "good": "好",
    "morning": "早上",
    "evening": "晚上",
    "how": "怎么",
    "you": "你",
    "today": "今天",
    "i": "我",
    "from": "来自",
    "thanks": "谢谢",
    "sorry": "对不起",
    "please": "请",
  },

  // defaults vacíos (para que TS no se queje con claves faltantes)
  "es->en": {},
  "es->de": {},
  "es->ru": {},
  "es->ja": {},
  "es->zh": {},
  "de->ru": {},
  "de->ja": {},
  "de->zh": {},
  "ru->de": {},
  "ru->ja": {},
  "ru->zh": {},
  "ja->de": {},
  "ja->ru": {},
  "ja->zh": {},
  "zh->de": {},
  "zh->ru": {},
  "zh->ja": {},
} as any;

const SENTENCE_DICT: Record<PairKey, Record<string, string>> = {
  "ja->en": {
    [normSentence("こんにちは！")]: "Hello!",
    [normSentence("元気ですか？")]: "How are you?",
    [normSentence("私は東京出身です。")]: "I'm from Tokyo.",
  },
  "ja->es": {
    [normSentence("こんにちは！")]: "¡Hola!",
    [normSentence("元気ですか？")]: "¿Cómo estás?",
    [normSentence("私は東京出身です。")]: "Soy de Tokio.",
  },
  "zh->en": {
    [normSentence("你好！")]: "Hello!",
    [normSentence("你怎么样？")]: "How are you?",
    [normSentence("我来自北京。")]: "I'm from Beijing.",
  },
  "zh->es": {
    [normSentence("你好！")]: "¡Hola!",
    [normSentence("你怎么样？")]: "¿Cómo estás?",
    [normSentence("我来自北京。")]: "Soy de Pekín.",
  },
  "ru->en": {
    [normSentence("Привет!")]: "Hi!",
    [normSentence("Как дела?")]: "How are you?",
    [normSentence("Я из Москвы.")]: "I'm from Moscow.",
  },
  "ru->es": {
    [normSentence("Привет!")]: "¡Hola!",
    [normSentence("Как дела?")]: "¿Cómo estás?",
    [normSentence("Я из Москвы.")]: "Soy de Moscú.",
  },
  "de->en": {
    [normSentence("Hallo!")]: "Hello!",
    [normSentence("Wie geht's dir heute?")]: "How are you today?",
    [normSentence("Ich komme aus Berlin.")]: "I'm from Berlin.",
  },
  "de->es": {
    [normSentence("Hallo!")]: "¡Hola!",
    [normSentence("Wie geht's dir heute?")]: "¿Cómo estás hoy?",
    [normSentence("Ich komme aus Berlin.")]: "Soy de Berlín.",
  },

  // pivot sentence examples (EN -> DE/JA/ZH/RU) básicos
  "en->de": {
    [normSentence("hello!")]: "Hallo!",
    [normSentence("how are you?")]: "Wie geht's dir?",
    [normSentence("thank you")]: "Danke",
  },
  "en->ja": {
    [normSentence("hello!")]: "こんにちは！",
    [normSentence("how are you?")]: "元気ですか？",
    [normSentence("thank you")]: "ありがとう",
  },
  "en->zh": {
    [normSentence("hello!")]: "你好！",
    [normSentence("how are you?")]: "你怎么样？",
    [normSentence("thank you")]: "谢谢",
  },
  "en->ru": {
    [normSentence("hello!")]: "Привет!",
    [normSentence("how are you?")]: "Как дела?",
    [normSentence("thank you")]: "Спасибо",
  },

  // defaults
  "es->en": {},
  "en->es": {},
  "es->de": {},
  "es->ru": {},
  "es->ja": {},
  "es->zh": {},
  "de->ru": {},
  "de->ja": {},
  "de->zh": {},
  "ru->de": {},
  "ru->ja": {},
  "ru->zh": {},
  "ja->de": {},
  "ja->ru": {},
  "ja->zh": {},
  "zh->de": {},
  "zh->ru": {},
  "zh->ja": {},
} as any;

// -------------------------
// CJK greedy segmentation por diccionario
// -------------------------
function buildKeyListForPair(pair: PairKey): string[] {
  const dict = WORD_DICT[pair] ?? {};
  return Object.keys(dict)
    .map((k) => k.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function greedySegmentCJK(raw: string, pair: PairKey): string[] {
  const keys = buildKeyListForPair(pair);
  if (!keys.length) return splitPunctCJK(raw);

  const out: string[] = [];
  let i = 0;

  while (i < raw.length) {
    if (raw[i] === " ") {
      i++;
      continue;
    }

    const ch = raw[i];
    if ("。！？!?…、,".includes(ch)) {
      out.push(ch);
      i++;
      continue;
    }

    let matched = "";
    for (const k of keys) {
      if (raw.startsWith(k, i)) {
        matched = k;
        break;
      }
    }

    if (matched) {
      out.push(matched);
      i += matched.length;
    } else {
      // fallback por bloque mismo script
      const start = i;
      const cur = raw[i];
      const isHan = RE_ZH.test(cur);
      const isJa = RE_JA.test(cur);
      const isLat = /[a-zA-Z0-9]/.test(cur);

      i++;
      while (i < raw.length) {
        const c = raw[i];
        if ("。！？!?…、,".includes(c) || c === " ") break;

        const cHan = RE_ZH.test(c);
        const cJa = RE_JA.test(c);
        const cLat = /[a-zA-Z0-9]/.test(c);

        const same =
          (isLat && cLat) || (!isLat && isHan === cHan && isJa === cJa);

        if (!same) break;
        i++;
      }

      out.push(raw.slice(start, i));
    }
  }

  return out.filter(Boolean);
}

// -------------------------
// Sentences
// -------------------------
export function splitIntoSentences(text: string): string[] {
  const t = (text ?? "").trim();
  if (!t) return [];

  const parts = t
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?。！？])\s*/u))
    .map((x) => x.trim())
    .filter(Boolean);

  return parts.length ? parts : [t];
}

// -------------------------
// Traducción base por par
// -------------------------
function directGlossWord(word: string, from: LanguageCode, to: LanguageCode): string {
  const key = `${from}->${to}` as PairKey;
  const dict = WORD_DICT[key] ?? {};

  const raw = (word ?? "").trim();
  if (!raw) return raw;
  if (isJustPunct(raw)) return raw;

  const w = normToken(raw);
  if (!w) return raw;

  // primero por token normalizado, luego por raw (por JA/ZH)
  return dict[w] ?? dict[raw] ?? dict[raw.toLowerCase()] ?? raw;
}

function directTranslateSentence(sentence: string, from: LanguageCode, to: LanguageCode): string {
  const pair = `${from}->${to}` as PairKey;

  // 1) exact sentence dict
  const exact = (SENTENCE_DICT[pair] ?? {})[normSentence(sentence)];
  if (exact) return exact;

  const s = (sentence ?? "").trim();
  if (!s) return "";

  // 2) CJK greedy
  if (!/\s/.test(s) && RE_HAS_CJK.test(s)) {
    const pieces = greedySegmentCJK(s, pair);
    const mapped = pieces
      .map((p) => {
        if (isJustPunct(p)) return p;
        const dict = WORD_DICT[pair] ?? {};
        return dict[p] ?? directGlossWord(p, from, to);
      })
      .filter((x) => x !== "");
    return joinTokensHuman(mapped);
  }

  // 3) normal token fallback
  const toks = tokenize(sentence);
  const out = toks
    .map((tok) => {
      if (isJustPunct(tok)) return tok;

      // si es bloque CJK, greedy también
      if (!/\s/.test(tok) && RE_HAS_CJK.test(tok)) {
        const pieces = greedySegmentCJK(tok, pair);
        const mapped = pieces
          .map((p) => (isJustPunct(p) ? p : directGlossWord(p, from, to)))
          .filter((x) => x !== "");
        return joinTokensHuman(mapped);
      }

      return directGlossWord(tok, from, to);
    })
    .filter((x) => x !== "");

  return joinTokensHuman(out);
}

// -------------------------
// PIVOT: from -> en -> to
// -------------------------
function hasPair(from: LanguageCode, to: LanguageCode): boolean {
  const k = `${from}->${to}` as PairKey;
  const wd = WORD_DICT[k];
  const sd = SENTENCE_DICT[k];
  return (!!wd && Object.keys(wd).length > 0) || (!!sd && Object.keys(sd).length > 0);
}

function translateWithPivot(sentence: string, from: LanguageCode, to: LanguageCode): string {
  if (from === to) return sentence;

  // 1) si existe par directo, usalo
  if (hasPair(from, to)) {
    return directTranslateSentence(sentence, from, to);
  }

  // 2) pivot principal: EN
  const pivot: LanguageCode = "en";

  // si from no puede ir a EN directo, devolvemos original
  const step1 =
    from === pivot
      ? sentence
      : hasPair(from, pivot)
      ? directTranslateSentence(sentence, from, pivot)
      : sentence;

  if (to === pivot) return step1;

  // paso 2: EN -> to
  const step2 = hasPair(pivot, to)
    ? directTranslateSentence(step1, pivot, to)
    : step1;

  return step2;
}

// -------------------------
// Public API
// -------------------------
export function glossWord(word: string, from: LanguageCode, to: LanguageCode): string {
  // si existe directo, perfecto
  if (hasPair(from, to)) return directGlossWord(word, from, to);

  // sino, pivot por EN: from->en y en->to
  if (from === to) return word;

  const pivot: LanguageCode = "en";

  const w1 =
    from === pivot
      ? word
      : hasPair(from, pivot)
      ? directGlossWord(word, from, pivot)
      : word;

  if (to === pivot) return w1;

  const w2 = hasPair(pivot, to) ? directGlossWord(w1, pivot, to) : w1;
  return w2;
}

export function translateSentence(
  sentence: string,
  from: LanguageCode,
  to: LanguageCode
): string {
  return translateWithPivot(sentence, from, to);
}

export function buildBlocks(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode
): SentenceBlock[] {
  const sentences = splitIntoSentences(text ?? "");

  return sentences.map((s) => {
    const raw = (s ?? "").trim();

    // tokens visuales: si CJK sin espacios, greedy pero usando el par que realmente se usará
    const pairDirect = `${fromLang}->${toLang}` as PairKey;
    const pairPivot = `${fromLang}->en` as PairKey;

    let rawTokens: string[];
    if (!/\s/.test(raw) && RE_HAS_CJK.test(raw)) {
      // si no hay par directo, segmentamos con el diccionario hacia EN para que tenga tokens útiles
      const usePair = hasPair(fromLang, toLang) ? pairDirect : (hasPair(fromLang, "en") ? pairPivot : pairDirect);
      rawTokens = greedySegmentCJK(raw, usePair);
    } else {
      rawTokens = tokenize(s);
    }

    const tokens: Token[] = rawTokens
      .filter((w) => w.trim().length > 0)
      .map((w) => {
        const punct = isJustPunct(w);
        const meaning = punct ? "" : glossWord(w, fromLang, toLang);
        return {
          surface: w,
          value: w,
          meaning,
          kind: punct ? "punct" : "word",
        };
      });

    return {
      original: s,
      tokens,
      translated: translateSentence(s, fromLang, toLang),
    };
  });
}

export function duoTranslate(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode
): SentenceBlock[] {
  return buildBlocks(text, fromLang, toLang);
}
