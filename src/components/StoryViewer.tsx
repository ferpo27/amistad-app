// src/components/StoryViewer.tsx
import React from "react";
import { Modal, Pressable, Text, View, Image } from "react-native";
import { useTheme } from "../theme";
import type { StoryItem } from "../storage";

type Props = {
  visible: boolean;
  onClose: () => void;
  story: StoryItem | null;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
};

export default function StoryViewer({ visible, onClose, story, onDelete, showDelete }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)" }}>
        <View style={{ paddingTop: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>{story?.title ?? ""}</Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {showDelete && story?.id && onDelete ? (
              <Pressable
                onPress={() => onDelete(story.id)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Eliminar</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onClose}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Cerrar</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
          {story?.uri ? (
            <Image
              source={{ uri: story.uri }}
              style={{ width: "100%", height: "80%", borderRadius: 18, backgroundColor: colors.card }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ height: 420, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.fg, opacity: 0.7 }}>Sin imagen</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
