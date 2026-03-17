// src/components/StoryRow.tsx
import React from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { useTheme } from "../theme";
import type { StoryItem } from "../storage";

type Props = {
  stories: StoryItem[];
  onAdd?: () => void;
  onOpen: (story: StoryItem) => void;
  showAdd?: boolean;
};

export default function StoryRow({ stories, onAdd, onOpen, showAdd }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ marginTop: 12 }}>
      <FlatList
        horizontal
        data={showAdd ? [{ id: "__add__" } as any, ...stories] : stories}
        keyExtractor={(it: any) => it.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }: any) => {
          if (item.id === "__add__") {
            return (
              <Pressable
                onPress={onAdd}
                style={{
                  width: 78,
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 999,
                    backgroundColor: colors.card,
                    borderWidth: 2,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900" }}>+</Text>
                </View>
                <Text style={{ marginTop: 6, color: colors.fg, opacity: 0.7, fontSize: 12, fontWeight: "700" }}>Nueva</Text>
              </Pressable>
            );
          }

          const s = item as StoryItem;

          return (
            <Pressable
              onPress={() => onOpen(s)}
              style={{ width: 78, alignItems: "center" }}
            >
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: colors.accent,
                  padding: 3,
                }}
              >
                <Image
                  source={{ uri: s.uri }}
                  style={{ width: "100%", height: "100%", borderRadius: 999, backgroundColor: colors.card }}
                />
              </View>
              <Text numberOfLines={1} style={{ marginTop: 6, color: colors.fg, fontSize: 12, fontWeight: "800" }}>
                {s.title || "Story"}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
