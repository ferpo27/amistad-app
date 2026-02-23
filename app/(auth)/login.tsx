// app/(auth)/login.tsx
import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { setAuthOk, setOnboardingDone } from "../../src/storage";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const onLogin = async () => {
    // mock login (después lo conectamos a backend)
    await setAuthOk(true);
    // IMPORTANTÍSIMO: no marcar onboarding done acá
    await setOnboardingDone(false);
    router.replace("/onboarding" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "900", color: "#000" }}>Iniciar sesión</Text>
      <Text style={{ marginTop: 8, opacity: 0.7, color: "#000" }}>
        Hacé amistades internacionales y practicá idiomas.
      </Text>

      <View style={{ marginTop: 18, gap: 10 }}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          value={pass}
          onChangeText={setPass}
          placeholder="Contraseña"
          secureTextEntry
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
        />

        <TouchableOpacity onPress={onLogin} style={{ backgroundColor: "#000", padding: 14, borderRadius: 12 }}>
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/register" as any)} style={{ padding: 14, borderRadius: 12 }}>
          <Text style={{ color: "#000", textAlign: "center", opacity: 0.75 }}>
            ¿No tenés cuenta? Registrate
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
