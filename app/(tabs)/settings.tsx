// app/(tabs)/settings.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import BottomSheet from "../../src/components/BottomSheet";
import { getAppLanguage, setAppLanguage, setAuthOk, setOnboardingDone, type LanguageCode } from "../../src/storage";
import { useThemeMode, type ThemeMode } from "../../src/theme";
import { useRouter } from "expo-router";

const LANGS: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "🇦🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, mode, setMode } = useThemeMode();
  const router = useRouter();

  const [langOpen, setLangOpen] = useState(false);
  const [uiLang, setUiLang] = useState<LanguageCode>("es");

  useEffect(() => {
    (async () => {
      const l = (await getAppLanguage()) ?? "es";
      setUiLang(l);
    })();
  }, []);

  const modeLabel = useMemo(() => (mode === "dark" ? t("dark") : t("light")), [mode, t]);

  const pickLang = async (code: LanguageCode) => {
    setUiLang(code);
    await setAppLanguage(code);
    await i18n.changeLanguage(code); // ✅ sin recargar
    setLangOpen(false);
  };

  const toggleTheme = async () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    await setMode(next);
  };

  const logout = async () => {
    await setAuthOk(false);
    await setOnboardingDone(false);
    router.replace("/(auth)/login" as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ color: colors.fg, fontSize: 22, fontWeight: "900", marginBottom: 12 }}>
        {t("settings")}
      </Text>

      {/* THEME */}
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{t("appearance")}</Text>
        <Text style={{ color: colors.fg, opacity: 0.7, marginTop: 6 }}>
          {t("current")}: {modeLabel}
        </Text>

        <Pressable
          onPress={toggleTheme}
          style={{
            marginTop: 12,
            backgroundColor: colors.accent,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: colors.bg, textAlign: "center", fontWeight: "900" }}>
            {t("toggleTheme")}
          </Text>
        </Pressable>
      </View>

      {/* LANGUAGE */}
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{t("appLanguage")}</Text>
        <Text style={{ color: colors.fg, opacity: 0.7, marginTop: 6 }}>
          {t("current")}: {uiLang.toUpperCase()}
        </Text>

        <Pressable
          onPress={() => setLangOpen(true)}
          style={{
            marginTop: 12,
            backgroundColor: colors.accentSoft,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.fg, textAlign: "center", fontWeight: "900" }}>
            {t("changeLanguage")}
          </Text>
        </Pressable>
      </View>

      {/* LOGOUT */}
      <Pressable
        onPress={logout}
        style={{
          backgroundColor: "#ff3b30",
          paddingVertical: 14,
          borderRadius: 14,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900", fontSize: 16 }}>
          {t("logout")}
        </Text>
      </Pressable>

      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)} title={t("changeLanguage")}>
        <View style={{ gap: 10 }}>
          {LANGS.map((l) => {
            const active = l.code === uiLang;
            return (
              <Pressable
                key={l.code}
                onPress={() => pickLang(l.code)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : "transparent",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
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
