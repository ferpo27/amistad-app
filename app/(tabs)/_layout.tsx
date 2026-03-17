// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeMode } from "../../src/theme";
import { useTranslation } from "react-i18next";

export default function TabsLayout() {
  const { colors } = useThemeMode();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.fg + "88",
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.fg,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("home"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: t("chats"),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          title: t("matches"),
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings"),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />

      {/* Pantallas navegables pero sin tab visible */}
      <Tabs.Screen
        name="chat/[id]"
        options={{ href: null, title: "Chat" }}
      />
      <Tabs.Screen
        name="profile/[id]"
        options={{ href: null, title: t("profile") }}
      />
    </Tabs>
  );
}