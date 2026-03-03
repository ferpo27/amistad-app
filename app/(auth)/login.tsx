// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  SafeAreaView, Text, TextInput, TouchableOpacity,
  View, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { setAuthOk, setOnboardingDone } from "../../src/storage";
import { useThemeMode } from "../../src/theme";

export default function Login() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const onLogin = async () => {
    await setAuthOk(true);
    await setOnboardingDone(false);
    router.replace("/onboarding" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.fg }}>
            Iniciar sesión
          </Text>
          <Text style={{ marginTop: 8, opacity: 0.7, color: colors.fg }}>
            Hacé amistades internacionales y practicá idiomas.
          </Text>

          <View style={{ marginTop: 18, gap: 10 }}>
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.fg + "66"}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 12,
                padding: 12, color: colors.fg, backgroundColor: colors.card,
                fontWeight: "700",
              }}
            />
            <TextInput
              value={pass} onChangeText={setPass}
              placeholder="Contraseña"
              placeholderTextColor={colors.fg + "66"}
              secureTextEntry
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 12,
                padding: 12, color: colors.fg, backgroundColor: colors.card,
                fontWeight: "700",
              }}
            />

            <TouchableOpacity
              onPress={onLogin}
              style={{ backgroundColor: colors.accent, padding: 14, borderRadius: 12 }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>Entrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/register" as any)}
              style={{ padding: 14, borderRadius: 12 }}
            >
              <Text style={{ color: colors.fg, textAlign: "center", opacity: 0.75 }}>
                ¿No tenés cuenta? Registrate
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}