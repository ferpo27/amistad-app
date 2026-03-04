// app/(auth)/verify.tsx
// Pantalla de verificación OTP — 6 dígitos, reenvío con countdown
import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView, Text, TextInput, TouchableOpacity,
  View, KeyboardAvoidingView, Platform, ActivityIndicator,
  NativeSyntheticEvent, TextInputKeyPressEventData,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useThemeMode } from "../../src/theme";

const RESEND_SECONDS = 60;

export default function Verify() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { colors } = useThemeMode();
  const { verifyOtp, resendOtp, loading, error } = useAuth();

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resendMsg, setResendMsg] = useState("");
  const inputs = useRef<(TextInput | null)[]>([]);

  // Countdown para reenviar
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const code = digits.join("");
  const isComplete = code.length === 6;

  const onChangeDigit = (val: string, idx: number) => {
    const clean = val.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[idx] = clean;
    setDigits(next);
    if (clean && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const onVerify = async () => {
    if (!isComplete || !email) return;
    const ok = await verifyOtp(email, code);
    if (ok) router.replace("/onboarding" as any);
  };

  const onResend = async () => {
    if (countdown > 0 || !email) return;
    setResendMsg("");
    const ok = await resendOtp(email);
    if (ok) {
      setCountdown(RESEND_SECONDS);
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      setResendMsg("¡Código reenviado!");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1, justifyContent: "center", padding: 28 }}>

          {/* Header */}
          <Text style={{ fontSize: 36, textAlign: "center" }}>📬</Text>
          <Text style={{ fontSize: 24, fontWeight: "900", color: colors.fg, textAlign: "center", marginTop: 12 }}>
            Verificá tu email
          </Text>
          <Text style={{ marginTop: 8, color: colors.fg, opacity: 0.6, textAlign: "center", lineHeight: 22 }}>
            Mandamos un código de 6 dígitos a{"\n"}
            <Text style={{ fontWeight: "700", opacity: 1 }}>{email}</Text>
          </Text>

          {/* Error */}
          {error ? (
            <View style={{ marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: "#ff000018", borderWidth: 1, borderColor: "#ff000030" }}>
              <Text style={{ color: "#cc0000", fontWeight: "600", fontSize: 13, textAlign: "center" }}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Resend msg */}
          {resendMsg ? (
            <Text style={{ marginTop: 12, color: "#00aa44", fontWeight: "700", textAlign: "center" }}>✅ {resendMsg}</Text>
          ) : null}

          {/* Inputs OTP */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 32 }}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                value={d}
                onChangeText={(v) => onChangeDigit(v, i)}
                onKeyPress={(e) => onKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                style={{
                  width: 46, height: 56,
                  borderWidth: 2,
                  borderColor: d ? colors.accent : colors.border,
                  borderRadius: 12,
                  textAlign: "center",
                  fontSize: 22, fontWeight: "900",
                  color: colors.fg,
                  backgroundColor: colors.card,
                }}
              />
            ))}
          </View>

          {/* Botón verificar */}
          <TouchableOpacity
            onPress={onVerify}
            disabled={loading || !isComplete}
            style={{
              marginTop: 28,
              backgroundColor: isComplete ? colors.accent : colors.border,
              padding: 16, borderRadius: 14,
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900", fontSize: 16 }}>
                  Verificar
                </Text>
            }
          </TouchableOpacity>

          {/* Reenviar */}
          <TouchableOpacity
            onPress={onResend}
            disabled={countdown > 0 || loading}
            style={{ marginTop: 16, padding: 12 }}
          >
            <Text style={{ textAlign: "center", color: countdown > 0 ? colors.fg + "55" : colors.accent, fontWeight: "600" }}>
              {countdown > 0
                ? `Reenviar código en ${countdown}s`
                : "Reenviar código"
              }
            </Text>
          </TouchableOpacity>

          {/* Volver */}
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 4, padding: 10 }}>
            <Text style={{ textAlign: "center", color: colors.fg, opacity: 0.5, fontSize: 13 }}>
              Volver al registro
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}