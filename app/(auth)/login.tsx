// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  SafeAreaView, Text, TextInput, TouchableOpacity,
  View, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useThemeMode } from "../../src/theme";

export default function Login() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const canLogin = email.trim().length > 3 && pass.length >= 6;

  const onLogin = async () => {
    if (!canLogin) return;
    const ok = await signIn(email.trim(), pass);
    if (ok) router.replace("/onboarding" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.fg }}>
            Iniciar sesión
          </Text>
          <Text style={{ marginTop: 8, opacity: 0.6, color: colors.fg }}>
            Hacé amistades internacionales y practicá idiomas.
          </Text>

          {/* Error */}
          {error ? (
            <View style={{
              marginTop: 16, padding: 12, borderRadius: 10,
              backgroundColor: "#ff000018", borderWidth: 1, borderColor: "#ff000030",
            }}>
              <Text style={{ color: "#cc0000", fontWeight: "600", fontSize: 13 }}>
                ⚠️ {error}
              </Text>
            </View>
          ) : null}

          <View style={{ marginTop: 20, gap: 12 }}>
            <View>
              <Text style={{ fontWeight: "700", color: colors.fg, marginBottom: 6, fontSize: 13 }}>
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={colors.fg + "55"}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 12,
                  padding: 13, color: colors.fg, backgroundColor: colors.card,
                  fontSize: 15,
                }}
              />
            </View>

            <View>
              <Text style={{ fontWeight: "700", color: colors.fg, marginBottom: 6, fontSize: 13 }}>
                Contraseña
              </Text>
              <TextInput
                value={pass}
                onChangeText={setPass}
                placeholder="••••••••"
                placeholderTextColor={colors.fg + "55"}
                secureTextEntry
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 12,
                  padding: 13, color: colors.fg, backgroundColor: colors.card,
                  fontSize: 15,
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
                : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900", fontSize: 16 }}>
                    Entrar
                  </Text>
              }
            </TouchableOpacity>

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