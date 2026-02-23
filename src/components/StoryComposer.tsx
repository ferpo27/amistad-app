import { View, TextInput, StyleSheet } from "react-native";
import { useState } from "react";
import { updateStory } from "../profileStore";

type Props = {
  storyId: string;
};

export default function StoryComposer({ storyId }: Props) {
  const [text, setText] = useState("");

  async function save() {
    await updateStory(storyId, { caption: text });
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Agregar descripción..."
        value={text}
        onChangeText={setText}
        onBlur={save}
        style={styles.input}
      />
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
});
