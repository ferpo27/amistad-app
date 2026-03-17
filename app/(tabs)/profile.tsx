// app/(tabs)/profile.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView, Text, View, Pressable, Platform,
  Image, Alert, AppState, type AppStateStatus,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeMode } from '../../src/theme';
import {
  getProfile, updateProfile, addStoryPhoto, removeStoryPhoto,
  type LearningLang, type StoryItem,
} from '../../src/storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const FLAGS: Record<string, string> = {
  es: '🇦🇷', en: '🇺🇸', de: '🇩🇪', ja: '🇯🇵', ru: '🇷🇺', zh: '🇨🇳',
};
const LANG_NAMES: Record<string, string> = {
  es: 'Español', en: 'English', de: 'Deutsch',
  ja: '日本語', ru: 'Русский', zh: '中文',
};
const HOURS_OPTIONS: (24 | 48)[] = [24, 48];

function timeLeft(expiresAt?: number): string | null {
  if (!expiresAt) return null;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Section({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: '800', fontSize: 11, letterSpacing: 1.2 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pName, setPName] = useState('');
  const [pUser, setPUser] = useState('');
  const [pCountry, setPCountry] = useState('');
  const [pNative, setPNative] = useState('');
  const [pBio, setPBio] = useState('');
  const [learning, setLearning] = useState<LearningLang[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [storyDuration, setStoryDuration] = useState<24 | 48>(24);

  const load = useCallback(async () => {
    const prof = await getProfile();
    setPName(prof.displayName ?? '');
    setPUser(prof.username ?? '');
    setPCountry(prof.country ?? '');
    setPNative(prof.nativeLang ?? '');
    setPBio(prof.bio ?? '');
    setLearning(prof.languageLearning?.learn ?? []);
    setInterests(prof.interests ?? []);
    const now = Date.now();
    setStories((prof.stories ?? []).filter((s) => !s.expiresAt || s.expiresAt > now));
    setPhotoUri(prof.photoUri ?? null);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > Date.now()));
    }, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active')
        setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > Date.now()));
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const hasBasics = pName.trim().length > 0;
  const initials = pName.trim().slice(0, 2).toUpperCase() || '?';

  const pickProfilePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;
      setPhotoUri(uri);
      await updateProfile({ photoUri: uri } as any);
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo actualizar la foto.'); }
  };

  const addStory = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [9, 16], quality: 0.85 });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;
      await addStoryPhoto(uri, '', Date.now() + storyDuration * 3_600_000);
      await load();
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudo agregar la historia.'); }
  };

  const deleteStory = (id: string) => {
    Alert.alert('Eliminar historia', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await removeStoryPhoto(id); await load(); } },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
      {/* HERO */}
      <View style={{ paddingTop: Platform.OS === 'ios' ? 64 : 32, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={pickProfilePhoto}>
          <View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.accent, overflow: 'hidden', backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 10 }}>
            {photoUri ? <Image source={{ uri: photoUri }} style={{ width: 100, height: 100 }} resizeMode="cover" /> : <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900' }}>{initials}</Text>}
          </View>
          <View style={{ position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '900', marginTop: 14, textAlign: 'center' }}>{pName || 'Tu perfil'}</Text>
        {pUser ? <Text style={{ color: colors.accent, fontWeight: '700', marginTop: 3, fontSize: 14 }}>@{pUser}</Text> : null}
        {pCountry ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
            <Ionicons name="location-outline" size={13} color={colors.fg} style={{ opacity: 0.4 }} />
            <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: '600', fontSize: 13 }}>{pCountry}</Text>
          </View>
        ) : null}
        {pBio ? <Text style={{ color: colors.fg, opacity: 0.6, fontWeight: '500', marginTop: 10, textAlign: 'center', lineHeight: 20, fontSize: 14, paddingHorizontal: 16 }}>{pBio}</Text> : null}
        <Pressable onPress={() => router.push('/onboarding' as any)} style={{ marginTop: 20, flexDirection: 'row', gap: 6, backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 99, alignItems: 'center' }}>
          <Ionicons name={hasBasics ? 'pencil' : 'person-add'} size={15} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{hasBasics ? 'Editar perfil' : 'Completar perfil'}</Text>
        </Pressable>
      </View>

      <View style={{ padding: 20, gap: 24 }}>
        {/* HISTORIAS */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: '800', fontSize: 11, letterSpacing: 1.2 }}>HISTORIAS</Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {HOURS_OPTIONS.map((h) => (
                <Pressable key={h} onPress={() => setStoryDuration(h)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: storyDuration === h ? colors.accent : colors.border, backgroundColor: storyDuration === h ? colors.accentSoft : 'transparent' }}>
                  <Text style={{ color: storyDuration === h ? colors.accent : colors.fg, fontWeight: '700', fontSize: 11 }}>{h}h</Text>
                </Pressable>
              ))}
              <Pressable onPress={addStory} style={{ backgroundColor: colors.accent, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 2 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>+ Agregar</Text>
              </Pressable>
            </View>
          </View>
          {stories.length === 0 ? (
            <Pressable onPress={addStory} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 }}>
              <Ionicons name="images-outline" size={28} color={colors.fg} style={{ opacity: 0.25 }} />
              <Text style={{ color: colors.fg, opacity: 0.35, fontWeight: '600', fontSize: 13 }}>Tocá para agregar una historia ({storyDuration}h)</Text>
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {stories.map((s) => {
                const left = timeLeft(s.expiresAt);
                return (
                  <Pressable key={s.id} onLongPress={() => deleteStory(s.id)}>
                    <Image source={{ uri: s.uri }} style={{ width: 90, height: 140, borderRadius: 14, borderWidth: 2, borderColor: colors.accent }} />
                    {left && (<View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' }}><View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{left}</Text></View></View>)}
                  </Pressable>
                );
              })}
              <Pressable onPress={addStory} style={{ width: 90, height: 140, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Ionicons name="add" size={24} color={colors.fg} style={{ opacity: 0.3 }} />
                <Text style={{ color: colors.fg, opacity: 0.3, fontSize: 10, fontWeight: '700' }}>Agregar</Text>
              </Pressable>
            </ScrollView>
          )}
          <Text style={{ color: colors.fg, opacity: 0.25, fontSize: 11 }}>Mantené presionada para eliminar</Text>
        </View>

        {/* IDIOMA NATIVO */}
        {pNative ? (
          <Section label="IDIOMA NATIVO" colors={colors}>
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>{FLAGS[pNative] ?? '🌍'}</Text>
              <Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{LANG_NAMES[pNative] ?? pNative}</Text>
            </View>
          </Section>
        ) : null}

        {/* APRENDIENDO */}
        <Section label="APRENDIENDO" colors={colors}>
          {learning.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16 }}>
              <Text style={{ color: colors.fg, opacity: 0.35 }}>Elegí idiomas en el onboarding.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {learning.map((l, idx) => (
                <View key={`${l.lang}-${idx}`} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 22 }}>{FLAGS[l.lang] ?? '🌍'}</Text>
                  <Text style={{ color: colors.fg, fontWeight: '700', fontSize: 15, flex: 1 }}>{LANG_NAMES[l.lang] ?? l.lang}</Text>
                  {l.level ? (<View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: colors.accentSoft }}><Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12 }}>{l.level}</Text></View>) : null}
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* INTERESES */}
        <Section label="INTERESES" colors={colors}>
          {interests.length === 0 ? (
            <Text style={{ color: colors.fg, opacity: 0.35 }}>Sumá intereses en el onboarding.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {interests.slice(0, 20).map((x) => (
                <View key={x} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Text style={{ color: colors.fg, fontWeight: '600', fontSize: 13 }}>{x}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>
      </View>
    </ScrollView>
  );
}