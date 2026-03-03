// app/(tabs)/settings.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View, Switch, ScrollView, Platform } from "react-native";
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
  const currentLang = LANGS.find((l) => l.code === uiLang);

  const pickLang = async (code: LanguageCode) => {
    setUiLang(code);
    await setAppLanguage(code);
    await i18n.changeLanguage(code);
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: Platform.OS === "ios" ? 54 : 22,
        paddingHorizontal: 16, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900" }}>{t("settings")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* APARIENCIA */}
        <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "900", fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>
          APARIENCIA
        </Text>
        <View style={{
          backgroundColor: colors.card, borderColor: colors.border,
          borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{t("appearance")}</Text>
              <Text style={{ color: colors.fg, opacity: 0.7, marginTop: 4 }}>
                {mode === "dark" ? "🌙 Modo oscuro" : "☀️ Modo claro"}
              </Text>
            </View>
            <Switch
              value={mode === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={mode === "dark" ? "#fff" : "#fff"}
            />
          </View>
        </View>

        {/* IDIOMA */}
        <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "900", fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>
          IDIOMA
        </Text>
        <View style={{
          backgroundColor: colors.card, borderColor: colors.border,
          borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16,
        }}>
          <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{t("appLanguage")}</Text>
          <Text style={{ color: colors.fg, opacity: 0.7, marginTop: 6 }}>
            {t("current")}: {currentLang ? `${currentLang.flag} ${currentLang.label}` : uiLang.toUpperCase()}
          </Text>
          <Pressable
            onPress={() => setLangOpen(true)}
            style={{
              marginTop: 12, backgroundColor: colors.accentSoft,
              paddingVertical: 12, borderRadius: 12,
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.fg, textAlign: "center", fontWeight: "900" }}>
              {t("changeLanguage")}
            </Text>
          </Pressable>
        </View>

        {/* CUENTA */}
        <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "900", fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>
          CUENTA
        </Text>
        <Pressable
          onPress={logout}
          style={{ backgroundColor: "#ff3b30", paddingVertical: 14, borderRadius: 14 }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900", fontSize: 16 }}>
            {t("logout")}
          </Text>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)} title={t("changeLanguage")}>
        <View style={{ gap: 10 }}>
          {LANGS.map((l) => {
            const active = l.code === uiLang;
            return (
              <Pressable
                key={l.code} onPress={() => pickLang(l.code)}
                style={{
                  paddingVertical: 12, paddingHorizontal: 12,
                  borderRadius: 12, borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : "transparent",
                  flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <Text style={{ color: colors.fg, fontWeight: "900" }}>{l.flag} {l.label}</Text>
                <Text style={{ color: colors.fg, opacity: 0.7 }}>{active ? "✓" : ""}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}