import { View, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { story } from "../storage/story";
import { colors } from "../constants/colors";

type Props = {
  storyId: string;
};

export default function StoryComposer({ storyId }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (text.trim() === "") {
      return;
    }
    setSaving(true);
    try {
      await story.saveStory(storyId, { caption: text });
    } catch (error: any) {
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
        onChangeText={(text: string) => setText(text)}
        onBlur={save}
        style={styles.input}
        editable={!saving}
      />
      {saving && <ActivityIndicator style={styles.loader} color={colors.accent + '33'} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    color: '#000',
  },
  loader: {
    marginTop: 8,
    color: colors.accent + '33',
  },
});