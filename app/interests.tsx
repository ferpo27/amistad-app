// app/interests.tsx
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, Pressable, View, FlatList, TextInput, Platform } from "react-native";
import { useRouter } from "expo-router";
import { getProfile, updateProfile } from "../src/storage";
import { useThemeMode } from "../src/theme";

const CATEGORIES: { label: string; items: string[] }[] = [
  {
    label: "Cultura y arte",
    items: ["Arte", "Historia", "Fotografía", "Literatura", "Cine", "Teatro", "Museos"],
  },
  {
    label: "Tecnología",
    items: ["Tecnología", "Programación", "IA", "Gaming", "Diseño", "Startups"],
  },
  {
    label: "Viajes y vida",
    items: ["Viajes", "Gastronomía", "Naturaleza", "Café", "Cocina", "Moda"],
  },
  {
    label: "Deporte y salud",
    items: ["Gym", "Fútbol", "Running", "Yoga", "Ciclismo", "Natación"],
  },
  {
    label: "Música y entretenimiento",
    items: ["Música", "Series", "Podcasts", "Anime", "Conciertos", "DJ"],
  },
  {
    label: "Negocios e idiomas",
    items: ["Trading", "Finanzas", "Emprendimiento", "Idiomas", "Escritura", "Marketing"],
  },
];

const ALL_SUGGESTED = CATEGORIES.flatMap((c) => c.items);

export default function InterestsScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setSelected((p?.interests ?? []).filter(Boolean));
    })();
  }, []);

  const toggle = (item: string) => {
    const clean = item.trim();
    if (!clean) return;
    setSelected((prev) => {
      const has = prev.some((x) => x.toLowerCase() === clean.toLowerCase());
      if (has) return prev.filter((x) => x.toLowerCase() !== clean.toLowerCase());
      return [...prev, clean];
    });
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateProfile({ interests: selected });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((x) => x.toLowerCase().includes(q)),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: Platform.OS === "ios" ? 12 : 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: colors.fg, fontSize: 24, fontWeight: "900" }}>Tus intereses</Text>
            <Text style={{ color: colors.fg, opacity: 0.5, marginTop: 4, fontWeight: "700", fontSize: 14 }}>
              Ayuda a encontrar personas compatibles
            </Text>
          </View>
          {selected.length > 0 && (
            <View style={{
              backgroundColor: colors.accent,
              borderRadius: 99,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}>
              <Text style={{ color: "#fff", fontWeight: "900" }}>{selected.length}</Text>
            </View>
          )}
        </View>

        {/* Search */}
        <View style={{
          marginTop: 14,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
        }}>
          <Text style={{ opacity: 0.4, marginRight: 8, color: colors.fg }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar interés…"
            placeholderTextColor={colors.fg + "55"}
            style={{ flex: 1, color: colors.fg, paddingVertical: 11, fontWeight: "700" }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 16 }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Selected chips */}
      {selected.length > 0 && (
        <View style={{
          paddingHorizontal: 20, paddingVertical: 12,
          borderBottomWidth: 1, borderBottomColor: colors.border,
          flexDirection: "row", flexWrap: "wrap", gap: 8,
        }}>
          {selected.map((s) => (
            <Pressable
              key={s}
              onPress={() => toggle(s)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: colors.accent,
                paddingVertical: 6, paddingHorizontal: 12,
                borderRadius: 99,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{s}</Text>
              <Text style={{ color: "#fff", opacity: 0.7, fontSize: 12 }}>✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Categories */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(c) => c.label}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        renderItem={({ item: cat }) => (
          <View style={{ marginTop: 8 }}>
            <Text style={{
              color: colors.fg, opacity: 0.45, fontWeight: "800",
              fontSize: 11, letterSpacing: 1,
              paddingHorizontal: 20, paddingVertical: 8,
            }}>
              {cat.label.toUpperCase()}
            </Text>
            <View style={{ paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {cat.items.map((item) => {
                const active = selected.some((x) => x.toLowerCase() === item.toLowerCase());
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggle(item)}
                    style={{
                      paddingVertical: 9, paddingHorizontal: 16,
                      borderRadius: 99,
                      borderWidth: 1,
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active ? colors.accentSoft : colors.card,
                    }}
                  >
                    <Text style={{
                      color: active ? colors.accent : colors.fg,
                      fontWeight: "900", fontSize: 14,
                    }}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      {/* CTA */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20,
        backgroundColor: colors.bg,
        borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        <Pressable
          onPress={onSave}
          disabled={saving}
          style={{
            backgroundColor: colors.accent,
            paddingVertical: 16, borderRadius: 16, alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
            {saving ? "Guardando…" : `Guardar${selected.length > 0 ? ` (${selected.length})` : ""}`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}