// src/components/AppLangPicker.tsx
import React, { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import i18n from "../i18n";
import { getAppLanguage, setAppLanguage, type LanguageCode } from "../storage";

const LANGS: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "🇦🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

export default function AppLangPicker() {
  const [open, setOpen] = useState(false);

  const current = useMemo(() => i18n.language as LanguageCode, []);

  const pick = async (lng: LanguageCode) => {
    await setAppLanguage(lng);
    await i18n.changeLanguage(lng);
    setOpen(false);
  };

  // al abrir, intenta leer lo guardado y sincronizar (por si abre por primera vez)
  const openModal = async () => {
    const saved = await getAppLanguage();
    if (saved && saved !== i18n.language) {
      await i18n.changeLanguage(saved);
    }
    setOpen(true);
  };

  const active = (i18n.language as LanguageCode) ?? current;

  return (
    <View>
      <Pressable onPress={openModal} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ fontSize: 18 }}>
          {LANGS.find((l) => l.code === active)?.flag ?? "🌐"}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" }}
        >
          <Pressable
            onPress={() => {}}
            style={{ width: "85%", backgroundColor: "#fff", borderRadius: 16, padding: 14 }}
          >
            <Text style={{ fontSize: 18, fontWeight: "900", marginBottom: 10, color: "#000" }}>
              Select language
            </Text>

            {LANGS.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => pick(l.code)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: l.code === active ? "#111" : "#eee",
                  marginBottom: 8,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16, color: "#000" }}>
                  {l.flag} {l.label}
                </Text>
                <Text style={{ opacity: 0.6 }}>{l.code === active ? "✓" : ""}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

