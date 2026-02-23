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
import { splitIntoSentences, glossWord, tokenize } from "../translate/duoTranslate";
import { getWordMeaning } from "../translate/getWordMeaning";

const ACCENT = "#4C8EFF";
const ACCENT_SOFT = "rgba(76,142,255,0.12)";

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
  return !/[\p{L}\p{N}]/u.test(tok);
}

function translateLocal(
  sentence: string,
  from: LanguageCode,
  to: LanguageCode
): string {
  const tokens = tokenize(sentence);
  const parts = tokens.map((t) => {
    if (isPunct(t)) return t;
    const g = glossWord(t, from, to);
    return g !== t ? g : t;
  });
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const cur = parts[i];
    const noSpaceBefore = i === 0 || /^[.,!?;:]/.test(cur);
    out += noSpaceBefore ? cur : " " + cur;
  }
  return out.trim();
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
  const [highlightFirst, setHighlightFirst] = useState(true);

  const sentences = useMemo(() => splitIntoSentences(text ?? ""), [text]);

  const sentenceTokens = useMemo(() => {
    return sentences.map((s) =>
      tokenize(s)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && !isPunct(t))
    );
  }, [sentences]);

  const localTranslations = useMemo(() => {
    return sentences.map((s) => translateLocal(s, fromLang, toLang));
  }, [sentences, fromLang, toLang]);

  useEffect(() => {
    if (visible) {
      setSelectedCard(null);
      setOpenMap({});
      setHighlightFirst(true);
      const timer = setTimeout(() => setHighlightFirst(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  async function handleWordPress(word: string) {
    setSelectedCard({ word, meaning: "", loading: true });
    const result = await getWordMeaning(word, fromLang, toLang);
    setSelectedCard({
      word: result.word,
      meaning: result.meaning || "—",
      loading: false,
    });
  }

  function toggleSentence(idx: number) {
    setOpenMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setSelectedCard(null);
        onClose();
      }}
      title={`${fromLang.toUpperCase()} - ${toLang.toUpperCase()}`}
      maxHeight={680}
    >
      <ScrollView showsVerticalScrollIndicator={false}>

        {highlightFirst && (
          <View
            style={{
              backgroundColor: ACCENT,
              padding: 12,
              borderRadius: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              Toca una palabra para ver su significado
            </Text>
          </View>
        )}

        {sentences.map((s, idx) => {
          const tokens = sentenceTokens[idx] ?? [];
          const isOpen = !!openMap[idx];
          const translation = localTranslations[idx] ?? "";

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
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 16,
                    flex: 1,
                    paddingRight: 10,
                  }}
                >
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
                  <Text
                    style={{
                      color: isOpen ? ACCENT : colors.text,
                      fontWeight: "900",
                      fontSize: 13,
                    }}
                  >
                    {isOpen ? "Ocultar" : "Traducir"}
                  </Text>
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                {tokens.map((tok, tIdx) => {
                  const isHighlighted = highlightFirst && idx === 0 && tIdx === 0;
                  const isSelected =
                    selectedCard?.word.toLowerCase() === tok.toLowerCase();

                  return (
                    <Pressable
                      key={`tok-${idx}-${tIdx}`}
                      onPress={() => handleWordPress(tok)}
                      style={({ pressed }) => ({
                        paddingVertical: 7,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor:
                          isHighlighted || isSelected ? ACCENT : colors.border,
                        backgroundColor:
                          pressed || isHighlighted || isSelected
                            ? ACCENT_SOFT
                            : "transparent",
                      })}
                    >
                      <Text
                        style={{
                          color:
                            isHighlighted || isSelected ? ACCENT : colors.text,
                          fontWeight: "700",
                          fontSize: 15,
                        }}
                      >
                        {tok}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {isOpen && (
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.subtext,
                      fontWeight: "800",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    TRADUCCION
                  </Text>
                  <Text
                    style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}
                  >
                    {translation || "—"}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {selectedCard && (
          <View
            style={{
              marginBottom: 18,
              padding: 18,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: ACCENT,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.subtext,
                fontSize: 11,
                fontWeight: "800",
                marginBottom: 6,
              }}
            >
              {fromLang.toUpperCase()} - {toLang.toUpperCase()}
            </Text>

            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
              {selectedCard.word}
            </Text>

            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginVertical: 12,
              }}
            />

            {selectedCard.loading ? (
              <ActivityIndicator color={ACCENT} />
            ) : (
              <Text style={{ color: ACCENT, fontSize: 26, fontWeight: "900" }}>
                {selectedCard.meaning}
              </Text>
            )}

            <Pressable
              onPress={() => setSelectedCard(null)}
              style={{
                marginTop: 16,
                alignSelf: "flex-end",
                paddingVertical: 8,
                paddingHorizontal: 20,
                backgroundColor: ACCENT,
                borderRadius: 12,
              }}
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