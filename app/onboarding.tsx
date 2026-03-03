// app/onboarding.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import i18n from "@/src/i18n";
import {
  getProfile,
  setOnboardingDone,
  updateProfile,
  type LanguageCode,
  type LanguageGoal,
  type LanguageLevel,
  type LearningLang,
} from "@/src/storage";
import CountryPickerModal from "@/src/components/CountryPickerModal";

const LEARN_LANGS: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

const LEVELS: LanguageLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

// ✅ Intereses para mostrar en perfil público y mejorar matches
const ALL_INTERESTS = [
  "Música", "Deportes", "Tecnología", "Cine", "Viajes",
  "Cocina", "Arte", "Libros", "Juegos", "Fitness",
  "Trading", "Anime", "Fotografía", "Naturaleza", "Ciencia",
];

function chip(label: string, active: boolean, onPress: () => void) {
  return (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#000" : "#ddd",
        backgroundColor: active ? "#000" : "#fff",
        marginRight: 10,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: active ? "#fff" : "#000", fontWeight: "800" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function Onboarding() {
  const router = useRouter();

  // ✅ País (solo elección manual por ahora)
  const [country, setCountry] = useState(""); // "🇦🇷 Argentina"
  const [countryModal, setCountryModal] = useState(false);

  // Lo que ya tenías
  const [goal, setGoal] = useState<LanguageGoal>("Amistad");
  const [learn, setLearn] = useState<LearningLang[]>([]);
  const [selectedLang, setSelectedLang] = useState<LanguageCode | null>(null);

  // ✅ Nuevos: intereses y bio
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  useEffect(() => {
    (async () => {
      const p = await getProfile();

      // ✅ cargar país si ya estaba guardado
      setCountry((p as any).country ?? "");

      const saved = p.languageLearning?.learn ?? [];
      setLearn(saved);
      setGoal((p.languageLearning?.goal ?? "Amistad") as LanguageGoal);
      setSelectedLang(saved[0]?.lang ?? null);
      setInterests(p.interests ?? []);
      setBio((p as any).bio ?? "");
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

  const setLevelForSelected = (lvl: LanguageLevel) => {
    if (!selectedLang) return;
    setLearn((prev) =>
      prev.map((x) => (x.lang === selectedLang ? { ...x, level: lvl } : x))
    );
  };

  const toggleInterest = (it: string) => {
    setInterests((prev) =>
      prev.includes(it) ? prev.filter((x) => x !== it) : [...prev, it]
    );
  };

  // ✅ Ahora pedimos país + idiomas con nivel
  const canNext =
    country.trim().length > 0 &&
    learn.length > 0 &&
    learn.every((x) => x.level !== null);

  const finish = async () => {
    await updateProfile({
      // ✅ guardar país, intereses y bio
      country: country.trim() || undefined,
      languageLearning: {
        learn,
        goal,
      },
      interests,
      ...(bio.trim() ? { bio: bio.trim() } : {}),
    } as any);

    await setOnboardingDone(true);
    router.replace("/(tabs)/home" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontWeight: "900", marginBottom: 10 }}>
          {i18n.t("onboardingTitle")}
        </Text>

        {/* ✅ País */}
        <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>
          País
        </Text>

        <Pressable
          onPress={() => setCountryModal(true)}
          style={{
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 12,
            padding: 12,
            marginBottom: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "white",
          }}
        >
          <Text style={{ fontWeight: "800", color: country ? "black" : "#999" }}>
            {country || "Elegí tu país"}
          </Text>
          <Text style={{ opacity: 0.5, fontSize: 18 }}>›</Text>
        </Pressable>

        <CountryPickerModal
          visible={countryModal}
          onClose={() => setCountryModal(false)}
          onSelect={(label) => setCountry(label)}
        />

        {/* Goal */}
        <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>
          {i18n.t("goalTitle")}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {chip(i18n.t("goalFriend"), goal === "Amistad", () => setGoal("Amistad"))}
          {chip(
            i18n.t("goalExchange"),
            goal === "Intercambio",
            () => setGoal("Intercambio")
          )}
        </View>

        <View style={{ height: 14 }} />

        {/* Learn languages */}
        <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>
          {i18n.t("pickLearnLangs")}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {LEARN_LANGS.map((l) => {
            const active = learn.some((x) => x.lang === l.code);
            return chip(`${l.flag} ${l.label}`, active, () => toggleLang(l.code));
          })}
        </View>

        <View style={{ height: 14 }} />

        {/* Level */}
        <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>
          {i18n.t("pickLevel")}
        </Text>

        {/* Selector de idioma seleccionado para asignarle nivel */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
          {learn.map((x) => {
            const meta = LEARN_LANGS.find((l) => l.code === x.lang);
            const active = selectedLang === x.lang;
            return chip(
              `${meta?.flag ?? ""} ${meta?.label ?? x.lang} (${x.level ?? "—"})`,
              active,
              () => setSelectedLang(x.lang)
            );
          })}
        </View>

        {/* Niveles para ese idioma */}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {LEVELS.map((lvl) =>
            chip(lvl, selected?.level === lvl, () => setLevelForSelected(lvl))
          )}
        </View>

        <View style={{ height: 20 }} />

        {/* ✅ Intereses */}
        <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>
          Intereses (opcional)
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {ALL_INTERESTS.map((it) => chip(it, interests.includes(it), () => toggleInterest(it)))}
        </View>

        <View style={{ height: 14 }} />

        {/* ✅ Bio */}
        <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>
          Bio (opcional, máx 200 caracteres)
        </Text>
        <TextInput
          value={bio}
          onChangeText={(v) => setBio(v.slice(0, 200))}
          placeholder="Contá algo sobre vos…"
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 12,
            padding: 12,
            minHeight: 80,
            textAlignVertical: "top",
            fontWeight: "700",
            fontSize: 14,
            marginBottom: 4,
          }}
        />
        <Text style={{ fontSize: 11, opacity: 0.5, textAlign: "right" }}>
          {bio.length}/200
        </Text>

        <View style={{ height: 20 }} />

        <TouchableOpacity
          onPress={finish}
          disabled={!canNext}
          style={{
            backgroundColor: canNext ? "#000" : "#ddd",
            padding: 14,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
            {i18n.t("next")}
          </Text>
        </TouchableOpacity>

        <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
          * Para continuar: elegí país + al menos 1 idioma y asignale nivel a cada uno.
        </Text>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}