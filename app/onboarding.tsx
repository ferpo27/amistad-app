// app/onboarding.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView, Text, TouchableOpacity, View,
  ScrollView, Pressable, TextInput, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useThemeMode } from "@/src/theme";
import {
  getProfile, setOnboardingDone, updateProfile,
  type LanguageCode, type LanguageGoal, type LanguageLevel, type LearningLang,
} from "@/src/storage";
import { upsertMyProfile } from "@/src/storage/profilesStorage";
import CountryPickerModal from "@/src/components/CountryPickerModal";

const LEARN_LANGS: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "🇦🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

const LEVELS: LanguageLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const INTERESTS_LIST = [
  "Viajes", "Música", "Cine", "Arte", "Historia", "Tecnología",
  "Gaming", "Deportes", "Gastronomía", "Fotografía", "Libros",
  "Gym", "Trading", "Diseño", "Naturaleza", "Podcasts",
];

export default function Onboarding() {
  const router = useRouter();
  const { colors } = useThemeMode();

  const [country, setCountry] = useState("");
  const [countryModal, setCountryModal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [goal, setGoal] = useState<LanguageGoal>("Amistad");
  const [learn, setLearn] = useState<LearningLang[]>([]);
  const [selectedLang, setSelectedLang] = useState<LanguageCode | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setCountry((p as any).country ?? "");
      setDisplayName(p.displayName ?? "");
      setUsername(p.username ?? "");
      setBio((p as any).bio ?? "");
      setInterests(p.interests ?? []);
      const saved = p.languageLearning?.learn ?? [];
      setLearn(saved);
      setGoal((p.languageLearning?.goal ?? "Amistad") as LanguageGoal);
      setSelectedLang(saved[0]?.lang ?? null);
    })();
  }, []);

  const selected = useMemo(() => {
    if (!selectedLang) return null;
    return learn.find((x) => x.lang === selectedLang) ?? null;
  }, [learn, selectedLang]);

  const toggleLang = (code: LanguageCode) => {
    setLearn((prev) => {
      const exists = prev.some((x) => x.lang === code);
      if (exists) {
        const next = prev.filter((x) => x.lang !== code);
        if (selectedLang === code) setSelectedLang(next[0]?.lang ?? null);
        return next;
      } else {
        const next = [...prev, { lang: code, level: null }];
        if (!selectedLang) setSelectedLang(code);
        return next;
      }
    });
  };

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const setLevelForSelected = (lvl: LanguageLevel) => {
    if (!selectedLang) return;
    setLearn((prev) =>
      prev.map((x) => (x.lang === selectedLang ? { ...x, level: lvl } : x))
    );
  };

  const canNext =
    country.trim().length > 0 &&
    learn.length > 0 &&
    learn.every((x) => x.level !== null);

  const finish = async () => {
    // Guardar localmente
    await updateProfile({
      displayName: displayName.trim() || undefined,
      username: username.trim() || undefined,
      country: country.trim() || undefined,
      bio: bio.trim() || undefined,
      interests,
      languageLearning: { learn, goal },
    } as any);
    // Sincronizar con Supabase
    await upsertMyProfile({
      displayName: displayName.trim() || undefined,
      username: username.trim() || undefined,
      country: country.trim() || undefined,
      bio: bio.trim() || undefined,
      interests,
      learning: learn.map((x) => ({ lang: x.lang, level: x.level ?? null })),
    });
    await setOnboardingDone(true);
    router.replace("/(tabs)/home" as any);
  };

  const S = {
    label: { color: colors.fg, opacity: 0.5, fontWeight: "800" as const, fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 20 },
    input: {
      color: colors.fg, backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
      fontWeight: "700" as const, fontSize: 15,
    },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: "900", marginBottom: 4 }}>
          Tu perfil
        </Text>
        <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "700", marginBottom: 8 }}>
          Completá tus datos para conectar con personas
        </Text>

        {/* Nombre */}
        <Text style={S.label}>NOMBRE</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tu nombre"
          placeholderTextColor={colors.fg + "44"}
          style={S.input}
        />

        {/* Username */}
        <Text style={S.label}>USUARIO</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="@usuario"
          placeholderTextColor={colors.fg + "44"}
          autoCapitalize="none"
          style={S.input}
        />

        {/* Bio */}
        <Text style={S.label}>BIO</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Contá algo sobre vos…"
          placeholderTextColor={colors.fg + "44"}
          multiline
          numberOfLines={3}
          style={[S.input, { minHeight: 80, textAlignVertical: "top" }]}
        />

        {/* País */}
        <Text style={S.label}>PAÍS</Text>
        <Pressable
          onPress={() => setCountryModal(true)}
          style={{
            ...S.input,
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <Text style={{ color: country ? colors.fg : colors.fg + "44", fontWeight: "700", fontSize: 15 }}>
            {country || "Elegí tu país"}
          </Text>
          <Text style={{ color: colors.fg, opacity: 0.3, fontSize: 18 }}>›</Text>
        </Pressable>
        <CountryPickerModal
          visible={countryModal}
          onClose={() => setCountryModal(false)}
          onSelect={(label) => setCountry(label)}
        />

        {/* Objetivo */}
        <Text style={S.label}>OBJETIVO</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["Amistad", "Intercambio"] as LanguageGoal[]).map((g) => (
            <Pressable
              key={g}
              onPress={() => setGoal(g)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 14,
                borderWidth: 1,
                borderColor: goal === g ? colors.accent : colors.border,
                backgroundColor: goal === g ? colors.accentSoft : colors.card,
                alignItems: "center",
              }}
            >
              <Text style={{ color: goal === g ? colors.accent : colors.fg, fontWeight: "900" }}>
                {g === "Amistad" ? "Hacer amigos" : "Intercambio"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Idiomas */}
        <Text style={S.label}>IDIOMAS QUE APRENDÉS</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {LEARN_LANGS.map((l) => {
            const active = learn.some((x) => x.lang === l.code);
            return (
              <Pressable
                key={l.code}
                onPress={() => toggleLang(l.code)}
                style={{
                  paddingVertical: 10, paddingHorizontal: 14, borderRadius: 99,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.card,
                }}
              >
                <Text style={{ color: active ? colors.accent : colors.fg, fontWeight: "900" }}>
                  {l.flag} {l.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Idiomas seleccionados para asignar nivel */}
        {learn.length > 0 && (
          <>
            <Text style={S.label}>ELEGÍ EL NIVEL</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {learn.map((x) => {
                const meta = LEARN_LANGS.find((l) => l.code === x.lang);
                const active = selectedLang === x.lang;
                return (
                  <Pressable
                    key={x.lang}
                    onPress={() => setSelectedLang(x.lang)}
                    style={{
                      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99,
                      borderWidth: 1,
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active ? colors.accentSoft : colors.card,
                    }}
                  >
                    <Text style={{ color: active ? colors.accent : colors.fg, fontWeight: "900" }}>
                      {meta?.flag} {meta?.label} ({x.level ?? "—"})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {LEVELS.map((lvl) => (
                <Pressable
                  key={lvl}
                  onPress={() => setLevelForSelected(lvl)}
                  style={{
                    paddingVertical: 9, paddingHorizontal: 18, borderRadius: 99,
                    borderWidth: 1,
                    borderColor: selected?.level === lvl ? colors.accent : colors.border,
                    backgroundColor: selected?.level === lvl ? colors.accentSoft : colors.card,
                  }}
                >
                  <Text style={{ color: selected?.level === lvl ? colors.accent : colors.fg, fontWeight: "900" }}>
                    {lvl}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Intereses */}
        <Text style={S.label}>INTERESES</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {INTERESTS_LIST.map((item) => {
            const active = interests.includes(item);
            return (
              <Pressable
                key={item}
                onPress={() => toggleInterest(item)}
                style={{
                  paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.card,
                }}
              >
                <Text style={{ color: active ? colors.accent : colors.fg, fontWeight: "900", fontSize: 14 }}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 12, marginTop: 16 }}>
          * Necesitás elegir país + al menos 1 idioma con nivel para continuar.
        </Text>
      </ScrollView>

      {/* CTA fijo abajo */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20,
        backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        <Pressable
          onPress={finish}
          disabled={!canNext}
          style={{
            backgroundColor: canNext ? colors.accent : colors.border,
            paddingVertical: 16, borderRadius: 16, alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
            Guardar y continuar
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}