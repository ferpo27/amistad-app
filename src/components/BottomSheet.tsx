// src/components/BottomSheet.tsx
import React from "react";
import { Modal, Pressable, Text, View, ViewStyle } from "react-native";
import { useTheme } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: number; // px
  containerStyle?: ViewStyle;
};

export default function BottomSheet({
  visible,
  onClose,
  children,
  title,
  maxHeight = 620,
  containerStyle,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} onPress={onClose} />

      <View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderTopWidth: 1,
            borderColor: colors.border,
            padding: 14,
          },
          containerStyle,
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>
            {title ?? ""}
          </Text>

          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: colors.accent, fontWeight: "900" }}>Cerrar</Text>
          </Pressable>
        </View>

        {children}
      </View>
    </Modal>
  );
}
