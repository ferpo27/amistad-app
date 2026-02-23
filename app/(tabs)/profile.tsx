import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import {
  getMyProfile,
  addProfilePhoto,
  removeProfilePhoto,
  addStory,
  updateStory,
  deleteStory,
  MyProfile,
  ProfileStory,
} from "../../src/profileStore";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<MyProfile | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const p = await getMyProfile();
    setProfile(p);
  }

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!res.canceled) {
      const uri = res.assets[0].uri;
      const updated = await addProfilePhoto(uri);
      setProfile(updated);
    }
  }

  async function pickStory() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!res.canceled) {
      const uri = res.assets[0].uri;
      const updated = await addStory(uri);
      setProfile(updated);
    }
  }

  if (!profile) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.bio}>{profile.bio}</Text>

      <Text style={styles.section}>Fotos</Text>

      <View style={styles.grid}>
        {profile.photos.map((uri: string) => (
          <TouchableOpacity
            key={uri}
            onLongPress={async () => {
              const updated = await removeProfilePhoto(uri);
              setProfile(updated);
            }}
          >
            <Image source={{ uri }} style={styles.photo} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={pickPhoto}>
        <Text style={styles.buttonText}>Agregar foto</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Historias</Text>

      <ScrollView horizontal>
        {profile.stories.map((s: ProfileStory) => (
          <View key={s.id} style={styles.story}>
            <Image source={{ uri: s.imageUri }} style={styles.storyImg} />
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.button} onPress={pickStory}>
        <Text style={styles.buttonText}>Agregar historia</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  name: { fontSize: 22, fontWeight: "bold" },
  bio: { marginBottom: 20 },
  section: { marginTop: 20, fontWeight: "bold" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  photo: { width: 100, height: 100, margin: 5, borderRadius: 8 },
  story: { marginRight: 10 },
  storyImg: { width: 80, height: 120, borderRadius: 10 },
  button: {
    backgroundColor: "#111",
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  buttonText: { color: "white", textAlign: "center" },
});
