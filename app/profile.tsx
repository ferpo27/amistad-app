import React, { useMemo, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { updateProfile } from "../src/storage";

export default function ProfileSetup() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");

  const canContinue = useMemo(() => displayName.trim().length >= 2, [displayName]);

  const go = async () => {
    if (!canContinue) return;
    await updateProfile({ displayName: displayName.trim() });
    router.replace("/favorites");
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Tu nombre</Text>
      <Text style={{ opacity: 0.75 }}>Poné tu nombre real (lo podés cambiar después).</Text>

      <View style={{ gap: 10, marginTop: 10 }}>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Ej: Jorge"
          placeholderTextColor="#999"
          autoCapitalize="words"
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 12,
            padding: 12,
            color: "black",
            backgroundColor: "white",
          }}
        />

        <TouchableOpacity
          onPress={go}
          disabled={!canContinue}
          style={{
            backgroundColor: "black",
            padding: 14,
            borderRadius: 12,
            opacity: canContinue ? 1 : 0.4,
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
