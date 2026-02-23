import React from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

export default function Landing() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "white",
        padding: 20,
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 34, fontWeight: "900", color: "black" }}>
        Amistad
      </Text>
      <Text style={{ marginTop: 8, opacity: 0.75, color: "black" }}>
        Entrá o creá tu cuenta para seguir.
      </Text>

      <View style={{ marginTop: 18, gap: 10 }}>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{
            backgroundColor: "black",
            padding: 14,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "900",
            }}
          >
            Iniciar sesión
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/register")}
          style={{
            borderWidth: 1,
            borderColor: "#333",
            padding: 14,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "black",
              textAlign: "center",
              fontWeight: "900",
            }}
          >
            Crear cuenta
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
