// app/(auth)/callback.tsx
import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../../src/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      try {
        const parsed = Linking.parse(url);
        const params = parsed.queryParams ?? {};

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

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: any, session: any) => {
        if (event === "SIGNED_IN") {
          router.replace("/onboarding" as any);
        } else if (event === "SIGNED_OUT") {
          router.replace("/(auth)/login" as any);
        }
      }
    );

    return () => {
      sub.remove();
      authListener?.unsubscribe();
    };
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
      <Text>Procesando autenticación</Text>
    </View>
  );
}