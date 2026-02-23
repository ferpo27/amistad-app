import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { useThemeMode } from "../../theme";

export default function TypingIndicator() {
  const { colors } = useThemeMode();
  const a1 = useRef(new Animated.Value(0.3)).current;
  const a2 = useRef(new Animated.Value(0.3)).current;
  const a3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      );

    const l1 = pulse(a1, 0);
    const l2 = pulse(a2, 120);
    const l3 = pulse(a3, 240);

    l1.start(); l2.start(); l3.start();
    return () => { l1.stop(); l2.stop(); l3.stop(); };
  }, [a1, a2, a3]);

  const Dot = ({ a }: { a: Animated.Value }) => (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        marginHorizontal: 3,
        opacity: a,
        backgroundColor: colors.fg,
      }}
    />
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignSelf: "flex-start",
      }}
    >
      <Dot a={a1} />
      <Dot a={a2} />
      <Dot a={a3} />
    </View>
  );
}
