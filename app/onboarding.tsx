// app/onboarding.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ScrollView, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeMode } from '../src/theme';
import {
  getProfile, updateProfile, setOnboardingDone,
  type LearningLang, type LanguageCode,
} from '../src/storage';

const LANGUAGES: { code: LanguageCode; name: string; flag: string }[] = [
  { code: 'es', name: 'Español', flag: '🇦🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

const INTERESTS_OPTIONS = [
  'Música', 'Tecnología', 'Viajes', 'Deportes', 'Películas',
  'Libros', 'Gastronomía', 'Arte', 'Gaming', 'Fotografía',
  'Fitness', 'Naturaleza', 'Moda', 'Ciencia', 'Idiomas',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [nativeLang, setNativeLang] = useState<LanguageCode | ''>('');
  const [learningLangs, setLearningLangs] = useState<LanguageCode[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const prof = await getProfile();
      if (prof.displayName) setDisplayName(prof.displayName);
      if (prof.username) setUsername(prof.username);
      if (prof.country) setCountry(prof.country);
      if (prof.city) setCity(prof.city);
      if (prof.bio) setBio(prof.bio);
      if (prof.nativeLang) setNativeLang(prof.nativeLang);
      if (prof.languageLearning?.learn) setLearningLangs(prof.languageLearning.learn.map((l) => l.lang));
      if (prof.interests) setInterests(prof.interests);
    })();
  }, []);

  const toggleLearning = (code: LanguageCode) =>
    setLearningLangs((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);

  const toggleInterest = (interest: string) =>
    setInterests((prev) => prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]);

  const handleSave = async () => {
    if (!displayName.trim()) { Alert.alert('Falta info', 'Ingresá tu nombre para continuar.'); return; }
    if (!nativeLang) { Alert.alert('Falta info', 'Seleccioná tu idioma nativo.'); return; }
    setSaving(true);
    try {
      const learn: LearningLang[] = learningLangs
        .filter((c) => c !== nativeLang)
        .map((lang) => ({ lang, level: null }));
      await updateProfile({
        displayName: displayName.trim(),
        username: username.trim() || undefined,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        bio: bio.trim() || undefined,
        nativeLang: nativeLang as LanguageCode,
        interests,
        languageLearning: { learn, goal: 'Amistad' },
      });
      await setOnboardingDone(true);
      router.replace('/(tabs)/home' as any);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.fg }];
  const chipBase = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1.5 };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 80, paddingTop: Platform.OS === 'ios' ? 60 : 28 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ color: colors.fg, fontSize: 30, fontWeight: '900', marginBottom: 6 }}>Tu perfil 🙋</Text>
        <Text style={{ color: colors.fg, opacity: 0.45, fontWeight: '600', marginBottom: 28 }}>Así te van a conocer tus nuevos amigos.</Text>

        <Label text="NOMBRE" colors={colors} />
        <TextInput style={inputStyle} value={displayName} onChangeText={setDisplayName} placeholder="Cómo te llamás" placeholderTextColor={colors.fg + '55'} />

        <Label text="USUARIO (opcional)" colors={colors} />
        <TextInput style={inputStyle} value={username} onChangeText={setUsername} placeholder="@usuario" placeholderTextColor={colors.fg + '55'} autoCapitalize="none" />

        <Label text="PAÍS" colors={colors} />
        <TextInput style={inputStyle} value={country} onChangeText={setCountry} placeholder="Argentina, España..." placeholderTextColor={colors.fg + '55'} />

        <Label text="CIUDAD" colors={colors} />
        <TextInput style={inputStyle} value={city} onChangeText={setCity} placeholder="Buenos Aires, Madrid..." placeholderTextColor={colors.fg + '55'} />

        <Label text="BIO (opcional)" colors={colors} />
        <TextInput style={[inputStyle, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]} value={bio} onChangeText={setBio} placeholder="Contá algo sobre vos..." placeholderTextColor={colors.fg + '55'} multiline />

        <Label text="IDIOMA NATIVO" colors={colors} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {LANGUAGES.map((l) => {
            const sel = nativeLang === l.code;
            return (
              <TouchableOpacity key={l.code} onPress={() => setNativeLang(l.code)} style={[chipBase, { backgroundColor: sel ? colors.accent : colors.card, borderColor: sel ? colors.accent : colors.border }]}>
                <Text style={{ fontSize: 16 }}>{l.flag}</Text>
                <Text style={{ color: sel ? '#fff' : colors.fg, fontWeight: '700', fontSize: 13 }}>{l.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Label text="QUIERO APRENDER" colors={colors} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {LANGUAGES.filter((l) => l.code !== nativeLang).map((l) => {
            const sel = learningLangs.includes(l.code);
            return (
              <TouchableOpacity key={l.code} onPress={() => toggleLearning(l.code)} style={[chipBase, { backgroundColor: sel ? colors.accent + '20' : colors.card, borderColor: sel ? colors.accent : colors.border }]}>
                <Text style={{ fontSize: 16 }}>{l.flag}</Text>
                <Text style={{ color: sel ? colors.accent : colors.fg, fontWeight: '700', fontSize: 13 }}>{l.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Label text="INTERESES" colors={colors} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 36 }}>
          {INTERESTS_OPTIONS.map((interest) => {
            const sel = interests.includes(interest);
            return (
              <TouchableOpacity key={interest} onPress={() => toggleInterest(interest)} style={[chipBase, { backgroundColor: sel ? colors.accent + '20' : colors.card, borderColor: sel ? colors.accent : colors.border }]}>
                <Text style={{ color: sel ? colors.accent : colors.fg, fontWeight: '600', fontSize: 13 }}>{interest}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent, opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17 }}>Guardar perfil ✓</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Label({ text, colors }: { text: string; colors: any }) {
  return <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: '800', fontSize: 11, letterSpacing: 1.2, marginBottom: 8 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, marginBottom: 20, fontSize: 16, height: 52 },
  button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});