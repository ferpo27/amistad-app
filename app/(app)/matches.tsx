import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

const mockUsers = [
  { id: "1", name: "Sofi", age: 24 },
  { id: "2", name: "Martina", age: 27 },
  { id: "3", name: "Lucía", age: 22 },
];

export default function Matches() {
  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "800" }}>Sugeridos</Text>

      {mockUsers.map((u) => (
        <Link
          key={u.id}
          href={{ pathname: "/chat/[id]", params: { id: u.id } } as any}
          asChild
        >
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700" }}>
              {u.name}, {u.age}
            </Text>
            <Text style={{ opacity: 0.7, marginTop: 4 }}>
              Tocá para abrir el chat
            </Text>
          </TouchableOpacity>
        </Link>
      ))}
    </View>
  );
}
