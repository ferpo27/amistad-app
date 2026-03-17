import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { clearAll, getProfile } from "../../src/storage";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setName(p?.displayName ?? "");
      setLoading(false);
    })();
  }, []);

  const logout = async () => {
    await clearAll();
    router.replace("/landing");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 14 }}>
      <Text style={{ fontSize: 30, fontWeight: "900" }}>
        {name ? `Hola, ${name}` : "Hola 👋"}
      </Text>

      <Text style={{ opacity: 0.7 }}>
        Esta es tu pantalla principal. Desde acá vas a Matches y Chat.
      </Text>

      {/* ✅ Cast para destrabar Typescript mientras se regeneran typed routes */}
      <Link href={{ pathname: "/matches" } as any} asChild>
        <TouchableOpacity
          style={{ backgroundColor: "black", padding: 14, borderRadius: 12 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
            Ver sugeridos (Matches)
          </Text>
        </TouchableOpacity>
      </Link>

      <TouchableOpacity
        onPress={logout}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 14,
          borderRadius: 12,
        }}
      >
        <Text style={{ textAlign: "center", fontWeight: "700" }}>
          Cerrar sesión (testing)
        </Text>
      </TouchableOpacity>
    </View>
  );
}
