// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  SafeAreaView, Text, TextInput, TouchableOpacity,
  View, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../src/hooks/useAuth";
import { useThemeMode } from "../../src/theme";
import { supabase } from "../../src/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const canLogin = email.trim().length > 3 && pass.length >= 6;

  const onLogin = async () => {
    if (!canLogin) return;
    const ok = await signIn(email.trim(), pass);
    if (ok) router.replace("/onboarding" as any);
  };

  const onGoogle = async () => {
    try {
      setSocialLoading("google");

      // Obtener la URL de OAuth de Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "amistadapp://auth/callback",
          queryParams: { access_type: "offline", prompt: "consent" },
          skipBrowserRedirect: true, // No redirigir automáticamente
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No se obtuvo URL de autenticación");

      // Abrir el browser del sistema con la URL de Google
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        "amistadapp://auth/callback"
      );

      if (result.type === "success" && result.url) {
        // Extraer tokens del URL de retorno
        const url = new URL(result.url);
        const accessToken = url.searchParams.get("access_token") 
          ?? new URLSearchParams(url.hash.replace("#", "")).get("access_token");
        const refreshToken = url.searchParams.get("refresh_token")
          ?? new URLSearchParams(url.hash.replace("#", "")).get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!sessionError) {
            router.replace("/onboarding" as any);
            return;
          }
        }

        // Si no hay tokens en URL, verificar sesión directamente
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          router.replace("/onboarding" as any);
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo iniciar con Google.");
    } finally {
      setSocialLoading(null);
    }
  };

  const onApple = async () => {
    try {
      setSocialLoading("apple");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: "amistadapp://auth/callback",
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No se obtuvo URL de autenticación");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        "amistadapp://auth/callback"
      );

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get("access_token")
          ?? new URLSearchParams(url.hash.replace("#", "")).get("access_token");
        const refreshToken = url.searchParams.get("refresh_token")
          ?? new URLSearchParams(url.hash.replace("#", "")).get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!sessionError) {
            router.replace("/onboarding" as any);
            return;
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          router.replace("/onboarding" as any);
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo iniciar con Apple.");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.fg }}>Iniciar sesión</Text>
          <Text style={{ marginTop: 8, opacity: 0.6, color: colors.fg }}>
            Hacé amistades internacionales y practicá idiomas.
          </Text>

          {error ? (
            <View style={{
              marginTop: 16, padding: 12, borderRadius: 10,
              backgroundColor: "#ff000018", borderWidth: 1, borderColor: "#ff000030",
            }}>
              <Text style={{ color: "#cc0000", fontWeight: "600", fontSize: 13 }}>⚠️ {error}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 20, gap: 12 }}>
            <View>
              <Text style={{ fontWeight: "700", color: colors.fg, marginBottom: 6, fontSize: 13 }}>Email</Text>
              <TextInput
                value={email} onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={colors.fg + "55"}
                autoCapitalize="none" keyboardType="email-address"
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 12,
                  padding: 13, color: colors.fg, backgroundColor: colors.card, fontSize: 15,
                }}
              />
            </View>

            <View>
              <Text style={{ fontWeight: "700", color: colors.fg, marginBottom: 6, fontSize: 13 }}>Contraseña</Text>
              <TextInput
                value={pass} onChangeText={setPass}
                placeholder="••••••••"
                placeholderTextColor={colors.fg + "55"}
                secureTextEntry
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 12,
                  padding: 13, color: colors.fg, backgroundColor: colors.card, fontSize: 15,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={onLogin}
              disabled={loading || !canLogin}
              style={{
                marginTop: 4,
                backgroundColor: canLogin ? colors.accent : colors.border,
                padding: 15, borderRadius: 12,
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900", fontSize: 16 }}>Entrar</Text>
              }
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "700", fontSize: 13 }}>o continuá con</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            <TouchableOpacity
              onPress={onGoogle}
              disabled={!!socialLoading}
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                padding: 14, borderRadius: 12,
                backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                opacity: socialLoading ? 0.6 : 1,
              }}
            >
              {socialLoading === "google"
                ? <ActivityIndicator color={colors.fg} />
                : <>
                    <Text style={{ fontSize: 18, fontWeight: "900", color: "#4285F4" }}>G</Text>
                    <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 15 }}>Continuar con Google</Text>
                  </>
              }
            </TouchableOpacity>

            {Platform.OS === "ios" && (
              <TouchableOpacity
                onPress={onApple}
                disabled={!!socialLoading}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: 14, borderRadius: 12,
                  backgroundColor: colors.fg, borderWidth: 1, borderColor: colors.border,
                  opacity: socialLoading ? 0.6 : 1,
                }}
              >
                {socialLoading === "apple"
                  ? <ActivityIndicator color={colors.bg} />
                  : <>
                      <Text style={{ fontSize: 18 }}>🍎</Text>
                      <Text style={{ color: colors.bg, fontWeight: "900", fontSize: 15 }}>Continuar con Apple</Text>
                    </>
                }
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.push("/(auth)/register" as any)}
              style={{ padding: 12, borderRadius: 12 }}
            >
              <Text style={{ color: colors.fg, textAlign: "center", opacity: 0.65, fontSize: 14 }}>
                ¿No tenés cuenta? <Text style={{ fontWeight: "700", opacity: 1 }}>Registrate</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}