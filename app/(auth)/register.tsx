// app/(auth)/register.tsx
import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { setAuthOk, setOnboardingDone, updateProfile } from "../../src/storage";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const onRegister = async () => {
    // mock register
    await setAuthOk(true);
    await setOnboardingDone(false);

    await updateProfile({
      displayName: name?.trim() || undefined,
      // NO guardamos contact porque el type no lo tiene (lo agregamos después si querés)
    });

    router.replace("/onboarding" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "900", color: "#000" }}>Crear cuenta</Text>

      <View style={{ height: 14 }} />

      <Text style={{ fontWeight: "900", color: "#000" }}>Nombre</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Tu nombre"
        style={{
          borderWidth: 1,
          borderColor: "#eee",
          borderRadius: 12,
          padding: 12,
          marginTop: 8,
        }}
      />

      <View style={{ height: 12 }} />

      <Text style={{ fontWeight: "900", color: "#000" }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: "#eee",
          borderRadius: 12,
          padding: 12,
          marginTop: 8,
        }}
      />

      <View style={{ height: 12 }} />

      <Text style={{ fontWeight: "900", color: "#000" }}>Contraseña</Text>
      <TextInput
        value={pass}
        onChangeText={setPass}
        placeholder="••••••••"
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#eee",
          borderRadius: 12,
          padding: 12,
          marginTop: 8,
        }}
      />

      <View style={{ height: 16 }} />

      <TouchableOpacity
        onPress={onRegister}
        style={{ backgroundColor: "#000", padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
          Registrarme
        </Text>
      </TouchableOpacity>

      <View style={{ height: 12 }} />

      <TouchableOpacity onPress={() => router.push("/(auth)/login" as any)}>
        <Text style={{ color: "#000", textAlign: "center", opacity: 0.75 }}>
          ¿Ya tenés cuenta? Iniciar sesión
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
