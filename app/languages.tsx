import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View, FlatList } from "react-native";
import { useRouter } from "expo-router";
import i18n from "../src/i18n";
import {
  getProfile,
  updateProfile,
  type LanguageCode,
  type LanguageGoal,
  type LanguageLevel,
  type LearningLang,
} from "../src/storage";

const LANGS: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

const LEVELS: LanguageLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const GOALS: { key: LanguageGoal; label: string }[] = [
  { key: "Amistad", label: "Amistad" },
  { key: "Intercambio", label: "Intercambio" },
];

export default function LanguagesScreen() {
  const router = useRouter();

  const [learn, setLearn] = useState<LearningLang[]>([]);
  const [goal, setGoal] = useState<LanguageGoal>("Amistad");
  const [activeLang, setActiveLang] = useState<LanguageCode | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      const savedLearn = p.languageLearning?.learn ?? [];
      const savedGoal = p.languageLearning?.goal ?? "Amistad";
      setLearn(savedLearn);
      setGoal(savedGoal);
      setActiveLang(savedLearn[0]?.lang ?? null);
    })();
  }, []);

  const isSelected = (code: LanguageCode) => learn.some((x) => x.lang === code);

  const toggleLang = (code: LanguageCode) => {
    setLearn((prev) => {
      const exists = prev.some((x) => x.lang === code);
      if (exists) {
        const next = prev.filter((x) => x.lang !== code);
        // ajustar active si borraste el activo
        if (activeLang === code) setActiveLang(next[0]?.lang ?? null);
        return next;
      }
      const next = [...prev, { lang: code, level: null }];
      setActiveLang(code);
      return next;
    });
  };

  const setLangLevel = (code: LanguageCode, level: LanguageLevel) => {
    setLearn((prev) =>
      prev.map((x) => (x.lang === code ? { ...x, level } : x))
    );
  };

  const canNext = learn.length > 0;

  const next = async () => {
    await updateProfile({
      languageLearning: { learn, goal },
    });
    router.back();
  };

  const activeObj = useMemo(
    () => (activeLang ? learn.find((x) => x.lang === activeLang) ?? null : null),
    [activeLang, learn]
  );

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#000" : "#ddd",
        backgroundColor: active ? "#000" : "#fff",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: active ? "#fff" : "#000", fontWeight: "900" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "900", color: "#000" }}>
        {i18n.t("languagesTitle")}
      </Text>
      <Text style={{ marginTop: 6, opacity: 0.7, color: "#000" }}>
        Elegí idiomas y asigná un nivel a cada uno (individual).
      </Text>

      <View style={{ height: 14 }} />

      <Text style={{ fontWeight: "900", color: "#000", marginBottom: 8 }}>Objetivo</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {GOALS.map((g) => chip(g.label, goal === g.key, () => setGoal(g.key)))}
      </View>

      <View style={{ height: 10 }} />

      <Text style={{ fontWeight: "900", color: "#000", marginBottom: 8 }}>
        Idiomas que querés practicar
      </Text>

      <FlatList
        data={LANGS}
        keyExtractor={(x) => x.code}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => {
          const selected = isSelected(item.code);
          return (
            <TouchableOpacity
              onPress={() => toggleLang(item.code)}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: selected ? "#000" : "#eee",
                borderRadius: 14,
                padding: 12,
                marginBottom: 10,
                backgroundColor: selected ? "#000" : "#fff",
              }}
            >
              <Text style={{ fontSize: 18 }}>{item.flag}</Text>
              <Text style={{ fontWeight: "900", color: selected ? "#fff" : "#000", marginTop: 4 }}>
                {item.label}
              </Text>
              <Text style={{ color: selected ? "#fff" : "#000", opacity: 0.75, marginTop: 2 }}>
                {selected ? "Seleccionado" : "Tocar para elegir"}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {activeObj && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontWeight: "900", color: "#000", marginBottom: 8 }}>
            Nivel para:{" "}
            {LANGS.find((l) => l.code === activeObj.lang)?.label ?? activeObj.lang}
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {LEVELS.map((lv) =>
              chip(lv, activeObj.level === lv, () => setLangLevel(activeObj.lang, lv))
            )}
          </View>

          <Text style={{ marginTop: 6, opacity: 0.7, color: "#000" }}>
            Tip: tocá otro idioma seleccionado para setear su nivel también.
          </Text>

          <View style={{ height: 10 }} />

          <Text style={{ fontWeight: "900", color: "#000", marginBottom: 8 }}>
            Idioma activo (para elegir nivel)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {learn.map((x) =>
              chip(
                `${LANGS.find((l) => l.code === x.lang)?.flag ?? ""} ${x.lang.toUpperCase()}`,
                activeLang === x.lang,
                () => setActiveLang(x.lang)
              )
            )}
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={next}
        disabled={!canNext}
        style={{
          marginTop: 10,
          backgroundColor: canNext ? "#000" : "#ddd",
          padding: 14,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
          {i18n.t("next") as any}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
