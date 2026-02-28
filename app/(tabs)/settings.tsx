// app/(tabs)/settings.tsx
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View, Platform, Switch } from "react-native";
import { useTranslation } from "react-i18next";
import BottomSheet from "../../src/components/BottomSheet";
import { getAppLanguage, setAppLanguage, setAuthOk, setOnboardingDone, type LanguageCode } from "../../src/storage";
import { useThemeMode, type ThemeMode } from "../../src/theme";
import { useRouter } from "expo-router";
import { setI18nLanguage } from "../../src/i18n";

const LANGS: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "🇦🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, mode, setMode, isDark } = useThemeMode();
  const router = useRouter();

  const [langOpen, setLangOpen] = useState(false);
  const [uiLang, setUiLang] = useState<LanguageCode>("es");

  useEffect(() => {
    (async () => {
      const l = (await getAppLanguage()) ?? "es";
      setUiLang(l as LanguageCode);
    })();
  }, []);

  const pickLang = async (code: LanguageCode) => {
    setUiLang(code);
    await setAppLanguage(code);
    await setI18nLanguage(code);
    setLangOpen(false);
  };

  const logout = async () => {
    await setAuthOk(false);
    await setOnboardingDone(false);
    router.replace("/(auth)/login" as any);
  };

  const currentLang = LANGS.find((l) => l.code === uiLang);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900", marginBottom: 24, marginTop: Platform.OS === "ios" ? 54 : 16 }}>
        {t("settings")}
      </Text>

      {/* APARIENCIA */}
      <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "800", fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>
        APARIENCIA
      </Text>
      <View style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        marginBottom: 24,
        overflow: "hidden",
      }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 18,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 20 }}>{isDark ? "🌙" : "☀️"}</Text>
            <View>
              <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>
                {isDark ? "Modo oscuro" : "Modo claro"}
              </Text>
              <Text style={{ color: colors.fg, opacity: 0.55, fontWeight: "700", marginTop: 2 }}>
                {isDark ? "Activo" : "Inactivo"}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={async (v) => {
              const next: ThemeMode = v ? "dark" : "light";
              await setMode(next);
            }}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* IDIOMA */}
      <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "800", fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>
        IDIOMA
      </Text>
      <Pressable
        onPress={() => setLangOpen(true)}
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 18,
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 20 }}>{currentLang?.flag ?? "🌐"}</Text>
          <View>
            <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>
              Idioma de la app
            </Text>
            <Text style={{ color: colors.fg, opacity: 0.55, fontWeight: "700", marginTop: 2 }}>
              {currentLang?.label ?? uiLang.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 18 }}>›</Text>
      </Pressable>

      {/* CUENTA */}
      <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "800", fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>
        CUENTA
      </Text>
      <View style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        overflow: "hidden",
        marginBottom: 24,
      }}>
        <Pressable
          onPress={logout}
          style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          
          <Text style={{ color: "#ff3b30", fontWeight: "900", fontSize: 16 }}>
            Cerrar sesión
          </Text>
        </Pressable>
      </View>

      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)} title="Elegí un idioma">
        <View style={{ gap: 8 }}>
          {LANGS.map((l) => {
            const active = l.code === uiLang;
            return (
              <Pressable
                key={l.code}
                onPress={() => pickLang(l.code)}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : "transparent",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>
                  {l.flag}  {l.label}
                </Text>
                {active && <Text style={{ color: colors.accent, fontWeight: "900" }}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </ScrollView>
  );
}