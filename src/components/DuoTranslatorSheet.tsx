// src/components/DuoTranslatorSheet.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import BottomSheet from "./BottomSheet";
import { useTheme } from "../theme";
import type { LanguageCode } from "../storage";

import {
  buildBlocks,
  glossWord,
  splitIntoSentences,
  tokenize,
  type Token as DuoToken,
} from "../translate/duoTranslate";

import { apiTranslateText } from "../translate/translatorApi";

type Props = {
  visible: boolean;
  onClose: () => void;
  text: string;
  fromLang: LanguageCode;
  toLang: LanguageCode;
};

type MiniToken = { surface: string; meaning: string };

export default function DuoTranslatorSheet({
  visible,
  onClose,
  text,
  fromLang,
  toLang,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // UI states
  const [selected, setSelected] = useState<MiniToken | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  // “Duolingo-like”: mostrar/ocultar traducción por frase
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});
  const [translateAllOn, setTranslateAllOn] = useState(false);

  // Estado de traducción real (API)
  const [apiLoading, setApiLoading] = useState(false);
  const [apiTranslations, setApiTranslations] = useState<Record<number, string>>({});

  // 1) Partimos el texto en frases
  const sentences = useMemo(() => splitIntoSentences(text ?? ""), [text]);

  // 2) Tokens/meaning local (instantáneo) para UX “tocar palabra”
  const blocks = useMemo(() => {
    // buildBlocks ya usa tu translateSentence con pivot,
    // pero nosotros vamos a reemplazar la traducción con API cuando esté.
    return buildBlocks(text ?? "", fromLang, toLang);
  }, [text, fromLang, toLang]);

  // Hint + highlight inicial cuando abre
  useEffect(() => {
    if (visible) {
      setSelected(null);
      setShowHint(true);
      setHighlightIndex(0);
      setTranslateAllOn(false);
      setOpenMap({});
      setApiTranslations({});
      setApiLoading(false);

      const timer = setTimeout(() => setHighlightIndex(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Si el usuario activa “traducir todo”, abrimos todas las frases
  useEffect(() => {
    if (!visible) return;
    if (translateAllOn) {
      const next: Record<number, boolean> = {};
      for (let i = 0; i < sentences.length; i++) next[i] = true;
      setOpenMap(next);
    }
  }, [translateAllOn, visible, sentences.length]);

  // 3) Intento de traducción PRO con API (sin romper si falla)
  useEffect(() => {
    if (!visible) return;
    if (!text?.trim()) return;

    let cancelled = false;

    (async () => {
      // No spamear: traducimos frase por frase (mejor UX + más robusto)
      setApiLoading(true);

      try {
        const out: Record<number, string> = {};

        for (let i = 0; i < sentences.length; i++) {
          const s = sentences[i];
          if (!s.trim()) continue;

          // API real
          const translated = await apiTranslateText({
            text: s,
            from: fromLang,
            to: toLang,
          });

          out[i] = translated;
          if (cancelled) return;

          // vamos actualizando en vivo
          setApiTranslations((prev) => ({ ...prev, [i]: translated }));
        }
      } catch {
        // Silencioso: fallback queda con tu traducción local
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, text, fromLang, toLang, sentences]);

  // helper: tokens del bloque idx (compat con lo que devuelve buildBlocks)
  function getTokensForIndex(idx: number): MiniToken[] {
    const b = blocks[idx];
    if (!b) {
      // fallback: tokenizar on the fly
      const raw = tokenize(sentences[idx] ?? "");
      return raw
        .map((w) => w.trim())
        .filter(Boolean)
        .map((w) => ({
          surface: w,
          meaning: glossWord(w, fromLang, toLang),
        }));
    }

    // buildBlocks devuelve Token con meaning
    return (b.tokens as DuoToken[])
      .filter((tk) => (tk.surface ?? "").trim().length > 0)
      .map((tk) => ({
        surface: tk.surface,
        meaning: (tk.meaning ?? "").trim() || glossWord(tk.surface, fromLang, toLang),
      }));
  }

  // Traducción final para idx:
  // - preferimos API si existe
  // - sino usamos la de buildBlocks (local)
  function getTranslationForIndex(idx: number): string {
    if (apiTranslations[idx]) return apiTranslations[idx];
    return blocks[idx]?.translated ?? "";
  }

  // Título
  const title = `${t("breakdown")} • ${fromLang.toUpperCase()} → ${toLang.toUpperCase()}`;

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setSelected(null);
        onClose();
      }}
      title={title}
      maxHeight={680}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hint estilo Duolingo */}
        {showHint && (
          <View
            style={{
              backgroundColor: colors.accent,
              padding: 12,
              borderRadius: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              {t("tapAWord")}
            </Text>
            <Text style={{ color: "white", opacity: 0.9, marginTop: 4, fontWeight: "700" }}>
              {t("tapToLearn")}
            </Text>
          </View>
        )}

        {/* Barra de acciones */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <Pressable
            onPress={() => setTranslateAllOn((v) => !v)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: translateAllOn ? colors.accentSoft : colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.fg, fontWeight: "900" }}>
              {t("translateAll")} {apiLoading ? "…" : ""}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              // cerrar hint si molesta
              setShowHint(false);
              setHighlightIndex(null);
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.fg, fontWeight: "900" }}>{t("close")}</Text>
          </Pressable>
        </View>

        {/* Frases */}
        {sentences.map((s, idx) => {
          const tokens = getTokensForIndex(idx);
          const open = !!openMap[idx];
          const translated = getTranslationForIndex(idx);

          return (
            <View
              key={`${idx}-${s}`}
              style={{
                marginBottom: 14,
                padding: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              {/* Header de frase */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16, flex: 1, paddingRight: 10 }}>
                  {s}
                </Text>

                <Pressable
                  onPress={() => setOpenMap((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: open ? colors.accentSoft : colors.bg,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.fg, fontWeight: "900" }}>
                    {open ? t("hide") : t("show")}
                  </Text>
                </Pressable>
              </View>

              {/* Tokens tocables */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {tokens.map((tk, tIdx) => {
                  const active = highlightIndex === tIdx && idx === 0; // solo en la primera frase
                  return (
                    <Pressable
                      key={`${idx}-${tIdx}-${tk.surface}`}
                      onPress={() => {
                        setSelected(tk);
                        setShowHint(false);
                        setHighlightIndex(null);
                      }}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: active ? colors.accent : colors.bg,
                      }}
                    >
                      <Text style={{ color: active ? "white" : colors.fg, fontWeight: "900" }}>
                        {tk.surface}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Traducción por frase (Duolingo-like: se muestra/oculta) */}
              {open && (
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.fg, opacity: 0.75, fontWeight: "900" }}>
                    {t("translate")}:
                  </Text>

                  <Text style={{ color: colors.fg, marginTop: 6, fontWeight: "800" }}>
                    {translated || "…"}
                  </Text>

                  {/* mini estado API */}
                  {apiLoading && !apiTranslations[idx] ? (
                    <Text style={{ color: colors.fg, opacity: 0.55, marginTop: 6 }}>
                      Mejorando traducción…
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}

        {/* Tarjeta de significado (Duolingo card) */}
        {selected ? (
          <View
            style={{
              marginTop: 8,
              marginBottom: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              borderRadius: 18,
              padding: 14,
            }}
          >
            <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>
              {selected.surface}
            </Text>

            <Text style={{ color: colors.fg, opacity: 0.85, marginTop: 8, fontWeight: "700" }}>
              {selected.meaning}
            </Text>

            <Pressable
              onPress={() => setSelected(null)}
              style={{
                marginTop: 12,
                backgroundColor: colors.accentSoft,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.fg, fontWeight: "900" }}>{t("close")}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ height: 10 }} />
      </ScrollView>
    </BottomSheet>
  );
}
