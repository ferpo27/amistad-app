import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet
} from "react-native";

import { BottomSheet } from "./BottomSheet"; // @ts-ignore
import { useTheme } from "../theme";
import type { LanguageCode } from "../storage";
import { splitIntoSentences, tokenize } from "../translate/duoTranslate";
import { getWordMeaning } from "../translate/getWordMeaning";

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
  const theme: any = useTheme();

  return (
    // @ts-ignore
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.text}>{text}</Text>
        <ActivityIndicator size="large" color={theme.color} />
        <Pressable style={styles.pressable} onPress={onClose}>
          <Text style={styles.text}>Cerrar</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  text: {
    fontSize: 18,
    marginBottom: 10,
  },
  pressable: {
    padding: 10,
    backgroundColor: '#fff', 
  },
});

export default DuoTranslatorSheet;