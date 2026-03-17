import React from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeMode } from "../../theme";

export type ChatMessage = {
  id: string;
  text: string;
  from: "me" | "them";
  ts?: number;
  status?: "sent" | "delivered" | "seen";
};

type Props = {
  msg: ChatMessage;
  onPressThemMessage?: (text: string) => void; // abre traductor
};

export default function MessageBubble({ msg, onPressThemMessage }: Props) {
  const { colors } = useThemeMode();
  const isMe = msg.from === "me";

  const bubbleBg = isMe ? colors.accent : colors.card;
  const bubbleBorder = isMe ? "transparent" : colors.border;
  const textColor = isMe ? "#fff" : colors.fg;

  return (
    <View style={{ paddingHorizontal: 12, marginVertical: 4 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: isMe ? "flex-end" : "flex-start",
        }}
      >
        <Pressable
          onPress={async () => {
            if (!isMe) {
              await Haptics.selectionAsync();
              onPressThemMessage?.(msg.text);
            }
          }}
          style={{
            maxWidth: "86%",
            backgroundColor: bubbleBg,
            borderWidth: isMe ? 0 : 1,
            borderColor: bubbleBorder,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 18,
            // “forma pro” tipo chat moderno
            borderTopLeftRadius: isMe ? 18 : 6,
            borderTopRightRadius: isMe ? 6 : 18,
            shadowColor: "#000",
            shadowOpacity: isMe ? 0.12 : 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: isMe ? 2 : 1,
          }}
        >
          <Text style={{ color: textColor, fontWeight: "700", lineHeight: 20 }}>
            {msg.text}
          </Text>

          {/* mini status (solo para mi) */}
          {isMe ? (
            <View style={{ marginTop: 6, alignItems: "flex-end" }}>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "800" }}>
                {msg.status === "seen" ? "Seen" : msg.status === "delivered" ? "Delivered" : "Sent"}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
