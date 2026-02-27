// app/(auth)/register.tsx
import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { setAuthOk, setOnboardingDone, updateProfile } from "@/src/storage";

function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const canRegister = useMemo(() => {
    return name.trim().length >= 2 && normalizeUsername(username).length >= 3;
  }, [name, username]);

  const onRegister = async () => {
    if (!canRegister) {
      Alert.alert("Completá nombre y username (mínimo 3 caracteres).");
      return;
    }

    await setAuthOk(true);
    await setOnboardingDone(false);

    await updateProfile({
      displayName: name.trim(),
      username: normalizeUsername(username),
      // email/pass quedan mock por ahora (no backend)
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
        autoCapitalize="words"
        style={{
          borderWidth: 1,
          borderColor: "#eee",
          borderRadius: 12,
          padding: 12,
          marginTop: 8,
        }}
      />

      <View style={{ height: 12 }} />

      <Text style={{ fontWeight: "900", color: "#000" }}>Username</Text>
      <TextInput
        value={username}
        onChangeText={(v) => setUsername(normalizeUsername(v))}
        placeholder="ej: ferpo27"
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: "#eee",
          borderRadius: 12,
          padding: 12,
          marginTop: 8,
        }}
      />
      <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
        * Sin espacios. Podés usar letras, números, punto, guión y guión bajo.
      </Text>

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
        style={{
          backgroundColor: canRegister ? "#000" : "#ddd",
          padding: 14,
          borderRadius: 12,
          opacity: canRegister ? 1 : 0.6,
        }}
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