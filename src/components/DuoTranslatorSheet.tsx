import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import BottomSheet from "./BottomSheet";
import { useTheme } from "../theme";
import type { LanguageCode } from "../storage";
import { splitIntoSentences, tokenize } from "../translate/duoTranslate";
import { getWordMeaning } from "../translate/getWordMeaning";
import { colors } from "../theme/colors";

const LANG_ISO: Record<LanguageCode, string> = {
  es: "es", en: "en", de: "de", ru: "ru", ja: "ja", zh: "zh-CN",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  text: string;
  fromLang: LanguageCode;
  toLang: LanguageCode;
};

type WordCard = {
  word: string;
  meaning: string;
  loading: boolean;
};

function isPunct(tok: string): boolean {
  return !/[\p{L}\p{N}']/u.test(tok);
}

function cleanWord(w: string): string {
  return w.replace(/[\u2018\u2019\u02BC]/g, "'").trim();
}

function cleanForApi(s: string): string {
  return s
    .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

async function translateWithGoogle(
  text: string,
  from: LanguageCode,
  to: LanguageCode
): Promise<string | null> {
  try {
    const sl = LANG_ISO[from];
    const tl = LANG_ISO[to];
    const q = cleanForApi(text);
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx" +
      "&sl=" + sl + "&tl=" + tl + "&dt=t&q=" + encodeURIComponent(q);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const segments: string[] = (data[0] ?? []).map((seg: any[]) => seg[0] ?? "");
    const result = segments.join("").trim();
    if (!result || result === q) return null;
    return result;
  } catch {
    return null;
  }
}

async function translateWithMyMemory(
  text: string,
  from: LanguageCode,
  to: LanguageCode
): Promise<string | null> {
  try {
    const langPair = LANG_ISO[from] + "|" + LANG_ISO[to];
    const q = cleanForApi(text);
    const url =
      "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(q) + "&langpair=" + encodeURIComponent(langPair);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText ?? "";
    const status: number = data?.responseStatus ?? 0;
    if (
      status !== 200 ||
      !translated ||
      translated.includes("%") ||
      translated.toLowerCase() === q.toLowerCase()
    ) {
      return null;
    }
    return translated;
  } catch {
    return null;
  }
}

const DuoTranslatorSheet: React.FC<Props> = ({
  visible,
  onClose,
  text,
  fromLang,
  toLang,
}) => {
  const theme = useTheme();
  const [words, setWords] = useState<WordCard[]>([]);
  const [translatedText, setTranslatedText] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const sentences = splitIntoSentences(text);
      const wordsArray: WordCard[] = [];
      sentences.forEach((sentence) => {
        const tokens = tokenize(sentence);
        tokens.forEach((token) => {
          if (!isPunct(token)) {
            wordsArray.push({
              word: cleanWord(token),
              meaning: "",
              loading: false,
            });
          }
        });
      });
      setWords(wordsArray);
    }
  }, [visible, text]);

  useEffect(() => {
    if (visible) {
      translateWithGoogle(text, fromLang, toLang).then((translated) => {
        setTranslatedText(translated);
      });
    }
  }, [visible, text, fromLang, toLang]);

  const handleWordPress = async (word: string) => {
    const meaning = await getWordMeaning(word);
    setWords(
      words.map((w) =>
        w.word === word ? { ...w, meaning, loading: false } : w
      )
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ padding: 16, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 18, color: colors.text }}>
          {translatedText ?? text}
        </Text>
        <ScrollView>
          {words.map((word, index) => (
            <Pressable
              key={index}
              onPress={() => handleWordPress(word.word)}
              style={{
                padding: 8,
                backgroundColor: colors.cardBackground,
                borderBottomWidth: 1,
                borderBottomColor: colors.divider,
              }}
            >
              <Text style={{ fontSize: 16, color: colors.text }}>
                {word.word}
              </Text>
              {word.loading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={{ fontSize: 14, color: colors.secondaryText }}>
                  {word.meaning}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

export default DuoTranslatorSheet;