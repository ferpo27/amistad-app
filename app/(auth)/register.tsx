// app/(auth)/register.tsx
import React, { useMemo, useState } from "react";
import {
  SafeAreaView, Text, TextInput, TouchableOpacity,
  View, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useThemeMode } from "../../src/theme";

function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

type Field = "name" | "username" | "email" | "pass";

export default function Register() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { signUp, loading, error } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [emailSent, setEmailSent] = useState(false);

  const touch = (f: Field) => setTouched((t) => ({ ...t, [f]: true }));

  const errors: Partial<Record<Field, string>> = {};
  if (touched.name && name.trim().length < 2) errors.name = "Mínimo 2 caracteres.";
  if (touched.username && normalizeUsername(username).length < 3) errors.username = "Mínimo 3 caracteres.";
  if (touched.email && !email.includes("@")) errors.email = "Email inválido.";
  if (touched.pass && pass.length < 6) errors.pass = "Mínimo 6 caracteres.";

  const canRegister = useMemo(
    () =>
      name.trim().length >= 2 &&
      normalizeUsername(username).length >= 3 &&
      email.includes("@") &&
      pass.length >= 6,
    [name, username, email, pass]
  );

  const onRegister = async () => {
    if (!canRegister) return;
    // ← CAMBIO: ahora redirige a verify con el código OTP
    const result = await signUp(email.trim(), pass, name.trim(), normalizeUsername(username));
    if (result.ok) {
      router.push({ pathname: "/(auth)/verify", params: { email: email.trim() } } as any);
    }
  };

  // ── Pantalla de confirmación ──────────────────────────────
  if (emailSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: 28 }}>
        <Text style={{ fontSize: 48 }}>📬</Text>
        <Text style={{ fontSize: 22, fontWeight: "900", color: colors.fg, marginTop: 16, textAlign: "center" }}>
          ¡Revisá tu email!
        </Text>
        <Text style={{ marginTop: 10, opacity: 0.65, color: colors.fg, textAlign: "center", lineHeight: 22 }}>
          Te mandamos un link de confirmación a{"\n"}
          <Text style={{ fontWeight: "700" }}>{email}</Text>.{"\n\n"}
          Una vez confirmado podés iniciar sesión.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login" as any)}
          style={{ marginTop: 28, backgroundColor: colors.accent, padding: 15, borderRadius: 12, width: "100%" }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900", fontSize: 16 }}>
            Ir al login
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Formulario ────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.fg }}>Crear cuenta</Text>
          <Text style={{ marginTop: 8, opacity: 0.6, color: colors.fg }}>
            Empezá a hacer amistades internacionales.
          </Text>

          {/* Error de Supabase */}
          {error ? (
            <View style={{
              marginTop: 16, padding: 12, borderRadius: 10,
              backgroundColor: "#ff000018", borderWidth: 1, borderColor: "#ff000030",
            }}>
              <Text style={{ color: "#cc0000", fontWeight: "600", fontSize: 13 }}>⚠️ {error}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 20, gap: 14 }}>
            {/* Nombre */}
            <FieldBlock label="Nombre" error={errors.name}>
              <TextInput
                value={name}
                onChangeText={setName}
                onBlur={() => touch("name")}
                placeholder="Tu nombre"
                placeholderTextColor={colors.fg + "55"}
                autoCapitalize="words"
                style={inputStyle(colors, !!errors.name)}
              />
            </FieldBlock>

            {/* Username */}
            <FieldBlock label="Username" error={errors.username} hint="Sin espacios. Letras, números, punto, guión.">
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: colors.fg, opacity: 0.45, fontSize: 15, paddingLeft: 13 }}>@</Text>
                <TextInput
                  value={username}
                  onChangeText={(v) => setUsername(normalizeUsername(v))}
                  onBlur={() => touch("username")}
                  placeholder="ferpo27"
                  placeholderTextColor={colors.fg + "55"}
                  autoCapitalize="none"
                  style={[inputStyle(colors, !!errors.username), { flex: 1, borderWidth: 0, paddingLeft: 4 }]}
                />
              </View>
            </FieldBlock>

            {/* Email */}
            <FieldBlock label="Email" error={errors.email}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onBlur={() => touch("email")}
                placeholder="tu@email.com"
                placeholderTextColor={colors.fg + "55"}
                autoCapitalize="none"
                keyboardType="email-address"
                style={inputStyle(colors, !!errors.email)}
              />
            </FieldBlock>

            {/* Contraseña */}
            <FieldBlock label="Contraseña" error={errors.pass}>
              <TextInput
                value={pass}
                onChangeText={setPass}
                onBlur={() => touch("pass")}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.fg + "55"}
                secureTextEntry
                style={inputStyle(colors, !!errors.pass)}
              />
            </FieldBlock>

            <TouchableOpacity
              onPress={onRegister}
              disabled={loading || !canRegister}
              style={{
                marginTop: 4,
                backgroundColor: canRegister ? colors.accent : colors.border,
                padding: 15, borderRadius: 12,
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900", fontSize: 16 }}>
                    Registrarme
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/login" as any)}
              style={{ padding: 12, borderRadius: 12 }}
            >
              <Text style={{ color: colors.fg, textAlign: "center", opacity: 0.65, fontSize: 14 }}>
                ¿Ya tenés cuenta? <Text style={{ fontWeight: "700", opacity: 1 }}>Iniciar sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function FieldBlock({
  label, error, hint, children,
}: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6, color: error ? "#cc0000" : "#000" }}>
        {label}
      </Text>
      <View style={{
        borderWidth: 1,
        borderColor: error ? "#cc0000" : "#e0e0e0",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {children}
      </View>
      {error
        ? <Text style={{ marginTop: 4, fontSize: 12, color: "#cc0000" }}>{error}</Text>
        : hint
        ? <Text style={{ marginTop: 4, fontSize: 11, opacity: 0.5 }}>{hint}</Text>
        : null}
    </View>
  );
}

function inputStyle(colors: any, hasError: boolean) {
  return {
    padding: 13,
    color: colors.fg,
    backgroundColor: colors.card,
    fontSize: 15,
  } as const;
}