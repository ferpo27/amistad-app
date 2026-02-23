// app/app/(tabs)/settings.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import BottomSheet from "../../../src/components/BottomSheet";
import { useThemeMode } from "../../../src/theme";
import {
  LanguageCode,
  getAppLanguage,
  setAppLanguage,
  resetDevStorage,
} from "../../../src/storage";

const LANGS: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "🇦🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors, mode, setMode, isDark } = useThemeMode();

  const [openLang, setOpenLang] = useState(false);
  const [uiLang, setUiLang] = useState<LanguageCode>("es");

  useEffect(() => {
    (async () => {
      const l = (await getAppLanguage()) ?? "es";
      setUiLang(l);
      if (i18n.language !== l) await i18n.changeLanguage(l);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentLang = useMemo(() => LANGS.find((x) => x.code === uiLang), [uiLang]);

  async function changeLang(code: LanguageCode) {
    setUiLang(code);
    await setAppLanguage(code);
    await i18n.changeLanguage(code);
    setOpenLang(false);
  }

  async function logout() {
    await resetDevStorage();
    router.replace("/(auth)/login");
  }

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}>
      <Text style={{ color: colors.fg, fontSize: 22, fontWeight: "900", marginBottom: 14 }}>
        {t("settings")}
      </Text>

      {/* Apariencia */}
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: colors.fg, fontWeight: "900", marginBottom: 8 }}>
          {t("appearance")}
        </Text>

        <Pressable
          onPress={() => setMode(isDark ? "light" : "dark")}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          <Text style={{ color: colors.fg, fontWeight: "800" }}>
            {t("current")}: {mode === "dark" ? t("dark") : t("light")}
          </Text>
        </Pressable>
      </View>

      {/* Idioma */}
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: colors.fg, fontWeight: "900", marginBottom: 8 }}>
          {t("appLanguage")}
        </Text>

        <Pressable
          onPress={() => setOpenLang(true)}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: colors.fg, fontWeight: "800" }}>
            {currentLang?.flag} {currentLang?.label}
          </Text>
          <Text style={{ color: colors.fg, opacity: 0.6 }}>▼</Text>
        </Pressable>
      </View>

      {/* Cerrar sesión */}
      <Pressable
        onPress={logout}
        style={{
          marginTop: 8,
          backgroundColor: "#E53935",
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900" }}>{t("logout")}</Text>
      </Pressable>

      <BottomSheet
        visible={openLang}
        onClose={() => setOpenLang(false)}
        title={t("chooseLanguage")}
      >
        <View style={{ gap: 10 }}>
          {LANGS.map((l) => {
            const active = l.code === uiLang;
            return (
              <Pressable
                key={l.code}
                onPress={() => changeLang(l.code)}
                style={{
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.bg,
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: colors.fg, fontWeight: "900" }}>
                  {l.flag} {l.label}
                </Text>
                <Text style={{ color: colors.fg, opacity: 0.7 }}>{active ? "✓" : ""}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}
