// app/_layout.tsx
import React, { useEffect, useRef, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { I18nextProvider } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import i18n, { loadI18nLanguage } from "../src/i18n";
import { ThemeProvider } from "../src/theme";
import { supabase } from "../src/lib/supabase";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await loadI18nLanguage();
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    // Inicializar notificaciones de forma lazy — no crashea si falla
    const initNotif = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const notif = await import("../src/notifications");
          await notif.initNotifications();

          notif.addNotificationListener(
            (_notification) => {},
            (response) => {
              const data = response.notification.request.content.data as any;
              notif.clearBadge();
              if (data?.chatId) {
                router.push(`/(tabs)/chat/${data.chatId}` as any);
              }
            }
          );
        }
      } catch (e) {
        // Silencioso — notificaciones son opcionales en desarrollo
        console.log("[layout] Notificaciones no disponibles en este entorno");
      }
    };

    initNotif();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        try {
          const notif = await import("../src/notifications");
          await notif.initNotifications();
        } catch {}
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <Stack screenOptions={{ headerShown: false }} />
      </I18nextProvider>
    </ThemeProvider>
  );
}