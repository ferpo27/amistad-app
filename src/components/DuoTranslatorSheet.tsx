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

const ACCENT = "#4C8EFF";
const ACCENT_SOFT = "rgba(76,142,255,0.12)";

// Códigos ISO para MyMemory
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

// Normaliza comillas tipográficas
function cleanWord(w: string): string {
  return w.replace(/[\u2018\u2019\u02BC]/g, "'").trim();
}

// Traducción de oración completa via MyMemory
async function translateSentence(
  sentence: string,
  from: LanguageCode,
  to: LanguageCode
): Promise<string> {
  if (!sentence.trim() || from === to) return sentence;
  try {
    const langPair = `${LANG_ISO[from]}|${LANG_ISO[to]}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sentence.trim())}&langpair=${langPair}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return sentence;

    const data = await res.json();
    const translated: string = data?.responseData?.translatedText ?? "";

    if (!translated || translated.includes("%")) return sentence;
    return translated.trim();
  } catch {
    return sentence;
  }
}

export default function DuoTranslatorSheet({
  visible,
  onClose,
  text,
  fromLang,
  toLang,
}: Props) {
  const { colors } = useTheme();

  const [selectedCard, setSelectedCard] = useState<WordCard | null>(null);
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});
  const [translationsMap, setTranslationsMap] = useState<Record<number, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});
  const [highlightFirst, setHighlightFirst] = useState(true);

  const sentences = useMemo(() => splitIntoSentences(text ?? ""), [text]);

  const sentenceTokens = useMemo(() => {
    return sentences.map((s) =>
      tokenize(s)
        .map((t) => cleanWord(t))
        .filter((t) => t.length > 0 && !isPunct(t))
    );
  }, [sentences]);

  // Reset al abrir
  useEffect(() => {
    if (visible) {
      setSelectedCard(null);
      setOpenMap({});
      setTranslationsMap({});
      setLoadingMap({});
      setHighlightFirst(true);
      const timer = setTimeout(() => setHighlightFirst(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  async function handleWordPress(word: string) {
    const clean = cleanWord(word);
    setSelectedCard({ word: clean, meaning: "", loading: true });
    const result = await getWordMeaning(clean, fromLang, toLang);
    setSelectedCard({
      word: clean,
      meaning: result.meaning || "—",
      loading: false,
    });
  }

  async function toggleSentence(idx: number) {
    const isOpen = !!openMap[idx];

    if (isOpen) {
      setOpenMap((prev) => ({ ...prev, [idx]: false }));
      return;
    }

    // Abrir y traducir si no tenemos traducción aún
    setOpenMap((prev) => ({ ...prev, [idx]: true }));

    if (!translationsMap[idx]) {
      setLoadingMap((prev) => ({ ...prev, [idx]: true }));
      const translated = await translateSentence(sentences[idx], fromLang, toLang);
      setTranslationsMap((prev) => ({ ...prev, [idx]: translated }));
      setLoadingMap((prev) => ({ ...prev, [idx]: false }));
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setSelectedCard(null);
        onClose();
      }}
      title={`${fromLang.toUpperCase()} → ${toLang.toUpperCase()}`}
      maxHeight={680}
    >
      <ScrollView showsVerticalScrollIndicator={false}>

        {highlightFirst && (
          <View style={{ backgroundColor: ACCENT, padding: 12, borderRadius: 14, marginBottom: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              Toca una palabra para ver su significado
            </Text>
          </View>
        )}

        {sentences.map((s, idx) => {
          const tokens = sentenceTokens[idx] ?? [];
          const isOpen = !!openMap[idx];
          const translation = translationsMap[idx];
          const isLoading = !!loadingMap[idx];

          return (
            <View
              key={`sent-${idx}`}
              style={{
                marginBottom: 12,
                padding: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16, flex: 1, paddingRight: 10 }}>
                  {s}
                </Text>

                <Pressable
                  onPress={() => toggleSentence(idx)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: isOpen ? ACCENT_SOFT : colors.bg,
                    borderWidth: 1,
                    borderColor: isOpen ? ACCENT : colors.border,
                  }}
                >
                  <Text style={{ color: isOpen ? ACCENT : colors.text, fontWeight: "900", fontSize: 13 }}>
                    {isOpen ? "Ocultar" : "Traducir"}
                  </Text>
                </Pressable>
              </View>

              {/* Tokens tocables */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {tokens.map((tok, tIdx) => {
                  const isHighlighted = highlightFirst && idx === 0 && tIdx === 0;
                  const isSelected = selectedCard?.word.toLowerCase() === tok.toLowerCase();

                  return (
                    <Pressable
                      key={`tok-${idx}-${tIdx}`}
                      onPress={() => handleWordPress(tok)}
                      style={({ pressed }) => ({
                        paddingVertical: 7,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isHighlighted || isSelected ? ACCENT : colors.border,
                        backgroundColor: pressed || isHighlighted || isSelected ? ACCENT_SOFT : "transparent",
                      })}
                    >
                      <Text style={{
                        color: isHighlighted || isSelected ? ACCENT : colors.text,
                        fontWeight: "700",
                        fontSize: 15,
                      }}>
                        {tok}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Traducción de la oración */}
              {isOpen && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ color: colors.subtext, fontWeight: "800", fontSize: 11, marginBottom: 4 }}>
                    TRADUCCIÓN
                  </Text>
                  {isLoading ? (
                    <ActivityIndicator color={ACCENT} size="small" />
                  ) : (
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                      {translation || "—"}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Tarjeta de palabra */}
        {selectedCard && (
          <View style={{
            marginBottom: 18,
            padding: 18,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: ACCENT,
            backgroundColor: colors.card,
          }}>
            <Text style={{ color: colors.subtext, fontSize: 11, fontWeight: "800", marginBottom: 6 }}>
              {fromLang.toUpperCase()} → {toLang.toUpperCase()}
            </Text>

            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
              {selectedCard.word}
            </Text>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />

            {selectedCard.loading ? (
              <ActivityIndicator color={ACCENT} />
            ) : (
              <Text style={{ color: ACCENT, fontSize: 26, fontWeight: "900" }}>
                {selectedCard.meaning}
              </Text>
            )}

            <Pressable
              onPress={() => setSelectedCard(null)}
              style={{ marginTop: 16, alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 20, backgroundColor: ACCENT, borderRadius: 12 }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>Cerrar</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </BottomSheet>
  );
}