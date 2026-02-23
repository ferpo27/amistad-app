import React from "react";
import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>Bienvenido</Text>
        <Text style={{ fontSize: 16, opacity: 0.8, lineHeight: 22 }}>
          Armemos tu perfil y empezá a conectar.
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.replace("/profile")}
        style={{ backgroundColor: "black", padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 16, fontWeight: "600" }}>
          Crear mi perfil
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
