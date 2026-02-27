// src/components/CountryPickerModal.tsx
import React, { useMemo, useState } from "react";
import { Modal, Pressable, Text, TextInput, View, FlatList } from "react-native";
import { COUNTRIES, formatCountry, type CountryItem } from "@/src/constants/countries";
import { useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (countryLabel: string) => void; // guardamos "🇦🇷 Argentina" (simple, sin tocar storage)
};

export default function CountryPickerModal({ visible, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => {
      return c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s);
    });
  }, [q]);

  const renderItem = ({ item }: { item: CountryItem }) => {
    const label = formatCountry(item.code, item.name);
    return (
      <Pressable
        onPress={() => {
          onSelect(label);
          onClose();
        }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{label}</Text>
        <Text style={{ color: colors.fg, opacity: 0.35, fontSize: 18 }}>›</Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            maxHeight: "80%",
          }}
        >
          <Text style={{ color: colors.fg, fontSize: 18, fontWeight: "900" }}>Elegí tu país</Text>

          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar país o código (AR, US...)"
            placeholderTextColor={colors.fg + "66"}
            style={{
              marginTop: 12,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: colors.fg,
              fontWeight: "700",
            }}
          />

          <View style={{ height: 12 }} />

          <FlatList
            data={filtered}
            keyExtractor={(x) => x.code}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}