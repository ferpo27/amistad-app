// src/components/DuoTranslator.tsx
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../theme";

import type { LanguageCode } from "../storage";
import { glossWord, splitIntoSentences, tokenize, translateSentence } from "../translate/duoTranslate";

type Props = {
  text: string;
  fromLang: LanguageCode;
  toLang: LanguageCode;
};

// Para UI: token con significado
type UiToken = { surface: string; meaning: string };

export default function DuoTranslator({ text, fromLang, toLang }: Props) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<UiToken | null>(null);

  const blocks = useMemo(() => {
    const sentences = splitIntoSentences(text ?? "");

    return sentences.map((s) => {
      const raw = (tokenize(s) ?? []).filter((w) => !!w.trim());

      // Solo “palabras” (no puntuación) para el tap
      const tokens: UiToken[] = raw
        .filter((w) => /[\p{L}\p{N}]/u.test(w))
        .map((w) => ({
          surface: w,
          meaning: glossWord(w, fromLang, toLang),
        }));

      return {
        original: s,
        tokens,
        translated: translateSentence(s, fromLang, toLang),
      };
    });
  }, [text, fromLang, toLang]);

  return (
    <View>
      {blocks.map((b, idx) => (
        <View
          key={`${idx}-${b.original}`}
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.fg, fontWeight: "900", marginBottom: 8 }}>{b.original}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {b.tokens.map((tk, i) => (
              <Pressable
                key={`${idx}-${i}-${tk.surface}`}
                onPress={() => setSelected(tk)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                }}
              >
                <Text style={{ color: colors.fg, fontWeight: "900" }}>{tk.surface}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.fg, opacity: 0.7, fontWeight: "900" }}>Traducción:</Text>
            <Text style={{ color: colors.fg, marginTop: 4 }}>{b.translated}</Text>
          </View>
        </View>
      ))}

      {selected ? (
        <View
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg,
            borderRadius: 16,
            padding: 12,
          }}
        >
          <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{selected.surface}</Text>

          <Text style={{ color: colors.fg, opacity: 0.85, marginTop: 6 }}>
            <Text style={{ fontWeight: "900" }}>Significa: </Text>
            {selected.meaning}
          </Text>

          <Pressable onPress={() => setSelected(null)} style={{ marginTop: 10 }}>
            <Text style={{ color: colors.accent, fontWeight: "900" }}>Cerrar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
