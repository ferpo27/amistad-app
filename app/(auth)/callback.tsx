// app/(auth)/callback.tsx
// Maneja el redirect de Supabase OAuth (Google, Apple)
import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../../src/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Obtener la URL con el token de OAuth
    const handleUrl = async (url: string) => {
      try {
        // Extraer el fragment (#) o query params que trae Supabase
        const parsed = Linking.parse(url);
        const params = parsed.queryParams ?? {};

        // Supabase devuelve access_token y refresh_token en el hash
        const accessToken = params["access_token"] as string | undefined;
        const refreshToken = params["refresh_token"] as string | undefined;

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            router.replace("/onboarding" as any);
            return;
          }
        }

        // Si no hay tokens en params, intentar con la sesión actual
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace("/onboarding" as any);
        } else {
          router.replace("/(auth)/login" as any);
        }
      } catch {
        router.replace("/(auth)/login" as any);
      }
    };

    // Escuchar el deep link inicial
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Escuchar deep links mientras la app está abierta
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));

    // También escuchar cambios de auth de Supabase directamente
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/onboarding" as any);
      }
    });

    return () => {
      sub.remove();
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
      <ActivityIndicator size="large" color="#6C63FF" />
      <Text style={{ color: "#fff", marginTop: 16, fontWeight: "700" }}>Iniciando sesión...</Text>
    </View>
  );
}