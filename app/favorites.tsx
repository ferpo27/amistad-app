// app/favorites.tsx
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View, FlatList, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { getProfile, updateProfile } from "../src/storage";

const TOPICS = [
  "Cultura y tradiciones",
  "Comida típica",
  "Música local",
  "Películas y series",
  "Lugares para visitar",
  "Costumbres del día a día",
  "Frases útiles del idioma",
  "Estudio / universidad",
  "Trabajo y objetivos",
  "Viajes y anécdotas",
  "Historia del país",
  "Tecnología y apps",
];

export default function FavoritesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setSelected((p?.favorites ?? []).filter(Boolean));
    })();
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? TOPICS.filter((x) => x.toLowerCase().includes(q)) : TOPICS;
    if (q && !base.some((x) => x.toLowerCase() === q)) return [...base, query.trim()];
    return base;
  }, [query]);

  const toggle = (item: string) => {
    const clean = item.trim();
    if (!clean) return;
    setSelected((prev) => {
      const has = prev.some((x) => x.toLowerCase() === clean.toLowerCase());
      if (has) return prev.filter((x) => x.toLowerCase() !== clean.toLowerCase());
      return [...prev, clean];
    });
  };

  const canNext = selected.length > 0;

  const onSave = async () => {
    if (!canNext || saving) return;
    setSaving(true);
    try {
      await updateProfile({ favorites: selected });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "900", color: "#000" }}>Temas para hablar</Text>
      <Text style={{ marginTop: 8, opacity: 0.75, color: "#000" }}>
        Esto te arma conversaciones internacionales sin awkward.
      </Text>

      <View style={{ marginTop: 14 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar o escribir un tema…"
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
        />
      </View>

      <View style={{ marginTop: 14, flex: 1 }}>
        <Text style={{ fontWeight: "900", color: "#000" }}>Seleccionados: {selected.length}</Text>

        <FlatList
          style={{ marginTop: 10 }}
          data={list}
          keyExtractor={(item, idx) => `${item}-${idx}`}
          renderItem={({ item }) => {
            const active = selected.some((x) => x.toLowerCase() === item.toLowerCase());
            return (
              <TouchableOpacity
                onPress={() => toggle(item)}
                style={{
                  borderWidth: 1,
                  borderColor: active ? "#000" : "#ddd",
                  backgroundColor: active ? "#f6f6f6" : "#fff",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900", color: "#000" }}>{item}</Text>
                <Text style={{ opacity: 0.6 }}>{active ? "✓" : ""}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <TouchableOpacity
        onPress={onSave}
        disabled={!canNext || saving}
        style={{
          marginTop: 10,
          backgroundColor: canNext ? "#000" : "#ddd",
          padding: 14,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
          {saving ? "Guardando…" : "Guardar y volver"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
