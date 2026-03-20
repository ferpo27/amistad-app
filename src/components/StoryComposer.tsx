import { View, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
// Importar la función desde el módulo correcto donde está exportada
import { updateStory } from "../storage/story"; // <-- ruta ajustada según la estructura del proyecto

type Props = {
  storyId: string;
};

export default function StoryComposer({ storyId }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    // No intentar guardar si el texto está vacío (opcional)
    if (text.trim() === "") {
      return;
    }
    setSaving(true);
    try {
      await updateStory(storyId, { caption: text });
    } catch (error) {
      console.error("Error al guardar la historia:", error);
      Alert.alert("Error", "No se pudo guardar la descripción. Por favor, inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Agregar descripción..."
        value={text}
        onChangeText={setText}
        onBlur={save}
        style={styles.input}
        editable={!saving}
      />
      {saving && <ActivityIndicator style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
  },
  loader: {
    marginTop: 8,
  },
});