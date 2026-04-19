// app/onboarding.tsx
//
// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDING / EDICIÓN DE PERFIL
//
// CAMBIOS vs versión anterior:
//   - Wrapped con withErrorBoundary — cualquier crash de render muestra
//     pantalla de retry en lugar de cerrar la app
//   - Sin cambios en lógica de negocio ni UI
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAppTheme } from '../src/theme';
import {
  setOnboardingDone,
  type LearningLang,
  type LanguageCode,
} from '../src/storage';
import {
  refreshProfile,
  updateProfile,
  syncProfileNow,
} from '../src/storage/profilesStorage';
import { withErrorBoundary } from '../src/components/ErrorBoundary';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const LANGUAGES: { code: LanguageCode; name: string; flag: string }[] = [
  { code: 'es', name: 'Español', flag: '🇦🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語',  flag: '🇯🇵' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文',    flag: '🇨🇳' },
];

const INTERESTS_OPTIONS = [
  'Música',     'Tecnología', 'Viajes',     'Deportes',   'Películas',
  'Libros',     'Gastronomía','Arte',       'Gaming',     'Fotografía',
  'Fitness',    'Naturaleza', 'Moda',       'Ciencia',    'Idiomas',
  'Diseño',     'Política',   'Historia',   'Psicología', 'Economía',
];

const USERNAME_REGEX = /^[a-z0-9._]{0,32}$/;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

function Label({
  text,
  colors,
  optional = false,
}: {
  text:      string;
  colors:    ReturnType<typeof useAppTheme>['colors'];
  optional?: boolean;
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: colors.fg }]}>{text}</Text>
      {optional ? (
        <Text style={[styles.labelOptional, { color: colors.fg }]}>OPCIONAL</Text>
      ) : null}
    </View>
  );
}

function LangChip({
  name,
  flag,
  selected,
  onPress,
  colors,
}: {
  code:     LanguageCode;
  name:     string;
  flag:     string;
  selected: boolean;
  onPress:  () => void;
  colors:   ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent  : colors.card,
          borderColor:     selected ? colors.accent  : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${selected ? 'Deseleccionar' : 'Seleccionar'} ${name}`}
      accessibilityState={{ selected }}
    >
      <Text style={styles.chipFlag}>{flag}</Text>
      <Text style={[styles.chipText, { color: selected ? '#fff' : colors.fg }]}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

function LearningChip({
  name,
  flag,
  selected,
  onPress,
  colors,
}: {
  code:     LanguageCode;
  name:     string;
  flag:     string;
  selected: boolean;
  onPress:  () => void;
  colors:   ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent + '20' : colors.card,
          borderColor:     selected ? colors.accent        : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${selected ? 'Quitar' : 'Aprender'} ${name}`}
      accessibilityState={{ selected }}
    >
      <Text style={styles.chipFlag}>{flag}</Text>
      <Text style={[styles.chipText, { color: selected ? colors.accent : colors.fg }]}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

function InterestChip({
  label,
  selected,
  onPress,
  colors,
}: {
  label:    string;
  selected: boolean;
  onPress:  () => void;
  colors:   ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent + '20' : colors.card,
          borderColor:     selected ? colors.accent        : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${selected ? 'Quitar' : 'Agregar'} ${label}`}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, { color: selected ? colors.accent : colors.fg }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

function OnboardingScreen() {
  const router     = useRouter();
  const { colors } = useAppTheme();

  // ── Formulario ─────────────────────────────────────────────────────────────
  const [displayName,   setDisplayName]   = useState('');
  const [username,      setUsername]      = useState('');
  const [country,       setCountry]       = useState('');
  const [city,          setCity]          = useState('');
  const [bio,           setBio]           = useState('');
  const [nativeLang,    setNativeLang]    = useState<LanguageCode | ''>('');
  const [learningLangs, setLearningLangs] = useState<LanguageCode[]>([]);
  const [interests,     setInterests]     = useState<string[]>([]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [saving,      setSaving]      = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [savePhase,   setSavePhase]   = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    refreshProfile().then((prof) => {
      if (!mounted) return;
      if (prof.displayName)             setDisplayName(prof.displayName);
      if (prof.username)                setUsername(prof.username);
      if (prof.country)                 setCountry(prof.country);
      if (prof.city)                    setCity(prof.city);
      if (prof.bio)                     setBio(prof.bio);
      if (prof.nativeLang)              setNativeLang(prof.nativeLang);
      if (prof.languageLearning?.learn) setLearningLangs(prof.languageLearning.learn.map((l) => l.lang));
      if (prof.interests)               setInterests(prof.interests);
      setLoadingInit(false);
    });
    return () => { mounted = false; };
  }, []);

  // ── Toggles ────────────────────────────────────────────────────────────────

  const toggleLearning = useCallback((code: LanguageCode) => {
    setLearningLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }, []);

  const toggleInterest = useCallback((interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  }, []);

  const handleUsernameChange = useCallback((text: string) => {
    const lower = text.toLowerCase();
    if (USERNAME_REGEX.test(lower)) setUsername(lower);
  }, []);

  // ── Guardar ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Falta info', 'Ingresá tu nombre para continuar.');
      return;
    }
    if (!nativeLang) {
      Alert.alert('Falta info', 'Seleccioná tu idioma nativo.');
      return;
    }
    if (learningLangs.length === 0) {
      Alert.alert('Falta info', 'Seleccioná al menos un idioma que querés aprender.');
      return;
    }

    setSaving(true);
    setSavePhase('idle');

    try {
      const learn: LearningLang[] = learningLangs
        .filter((c) => c !== nativeLang)
        .map((lang) => ({ lang, level: null }));

      // 1. Escritura optimista en AsyncStorage
      await updateProfile({
        displayName:      displayName.trim(),
        username:         username.trim()  || undefined,
        country:          country.trim()   || undefined,
        city:             city.trim()      || undefined,
        bio:              bio.trim()       || undefined,
        nativeLang:       nativeLang as LanguageCode,
        interests,
        languageLearning: { learn, goal: 'Amistad' },
      });

      // 2. Sync garantizado a Supabase
      setSavePhase('syncing');
      const { syncStatus, error: syncError } = await syncProfileNow();

      if (syncStatus === 'error') {
        setSavePhase('error');
        Alert.alert(
          'Sin conexión',
          'Tu perfil se guardó localmente. Se sincronizará cuando recuperes la conexión.',
          [{ text: 'OK', onPress: () => continueToHome() }],
        );
        return;
      }

      setSavePhase('done');
      await continueToHome();

    } catch (e: unknown) {
      setSavePhase('error');
      const msg = e instanceof Error ? e.message : 'No se pudo guardar.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const continueToHome = async () => {
    await setOnboardingDone(true);
    router.replace('/(tabs)/home' as any);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.card,
      borderColor:     colors.border,
      color:           colors.fg,
    },
  ];

  if (loadingInit) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const saveButtonLabel = () => {
    if (!saving)                 return 'Guardar perfil ✓';
    if (savePhase === 'syncing') return 'Sincronizando…';
    return 'Guardando…';
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingBottom: 80,
        paddingTop:    Platform.OS === 'ios' ? 60 : 28,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingHorizontal: 24 }}>

        <Text style={[styles.title, { color: colors.fg }]}>Tu perfil 🙋</Text>
        <Text style={[styles.subtitle, { color: colors.fg }]}>
          Así te van a conocer tus nuevos amigos.
        </Text>

        {/* NOMBRE */}
        <Label text="NOMBRE" colors={colors} />
        <TextInput
          style={inputStyle}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Cómo te llamás"
          placeholderTextColor={colors.fg + '55'}
          maxLength={50}
          returnKeyType="next"
        />

        {/* USUARIO */}
        <Label text="USUARIO" colors={colors} optional />
        <TextInput
          style={inputStyle}
          value={username}
          onChangeText={handleUsernameChange}
          placeholder="letras, números, . y _"
          placeholderTextColor={colors.fg + '55'}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={32}
          returnKeyType="next"
        />

        {/* PAÍS */}
        <Label text="PAÍS" colors={colors} optional />
        <TextInput
          style={inputStyle}
          value={country}
          onChangeText={setCountry}
          placeholder="Argentina, España…"
          placeholderTextColor={colors.fg + '55'}
          maxLength={60}
          returnKeyType="next"
        />

        {/* CIUDAD */}
        <Label text="CIUDAD" colors={colors} optional />
        <TextInput
          style={inputStyle}
          value={city}
          onChangeText={setCity}
          placeholder="Buenos Aires, Madrid…"
          placeholderTextColor={colors.fg + '55'}
          maxLength={60}
          returnKeyType="next"
        />

        {/* BIO */}
        <Label text="BIO" colors={colors} optional />
        <TextInput
          style={[inputStyle, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="Contá algo sobre vos…"
          placeholderTextColor={colors.fg + '55'}
          multiline
          maxLength={200}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.fg }]}>
          {bio.length}/200
        </Text>

        {/* IDIOMA NATIVO */}
        <Label text="IDIOMA NATIVO" colors={colors} />
        <View style={styles.chipRow}>
          {LANGUAGES.map((l) => (
            <LangChip
              key={l.code}
              code={l.code}
              name={l.name}
              flag={l.flag}
              selected={nativeLang === l.code}
              onPress={() => {
                setNativeLang(l.code);
                setLearningLangs((prev) => prev.filter((c) => c !== l.code));
              }}
              colors={colors}
            />
          ))}
        </View>

        {/* QUIERO APRENDER */}
        <Label text="QUIERO APRENDER" colors={colors} />
        <View style={styles.chipRow}>
          {LANGUAGES
            .filter((l) => l.code !== nativeLang)
            .map((l) => (
              <LearningChip
                key={l.code}
                code={l.code}
                name={l.name}
                flag={l.flag}
                selected={learningLangs.includes(l.code)}
                onPress={() => toggleLearning(l.code)}
                colors={colors}
              />
            ))}
        </View>
        {nativeLang && learningLangs.length === 0 ? (
          <Text style={[styles.hintText, { color: colors.error ?? '#FF5C5C' }]}>
            Seleccioná al menos un idioma.
          </Text>
        ) : null}

        {/* INTERESES */}
        <Label text="INTERESES" colors={colors} optional />
        <View style={styles.chipRow}>
          {INTERESTS_OPTIONS.map((interest) => (
            <InterestChip
              key={interest}
              label={interest}
              selected={interests.includes(interest)}
              onPress={() => toggleInterest(interest)}
              colors={colors}
            />
          ))}
        </View>
        <Text style={[styles.hintText, { color: colors.fg }]}>
          Elegí los que más te representan. Mejora tus matches.
        </Text>

        {/* BOTÓN GUARDAR */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.accent, opacity: saving ? 0.75 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Guardar perfil"
        >
          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.saveButtonText}>{saveButtonLabel()}</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Guardar perfil ✓</Text>
          )}
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  title: {
    fontSize:      30,
    fontWeight:    '900',
    marginBottom:  6,
    letterSpacing: -0.5,
  },
  subtitle: {
    opacity:      0.45,
    fontWeight:   '600',
    marginBottom: 28,
    fontSize:     15,
    lineHeight:   22,
  },
  labelRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   8,
  },
  label: {
    opacity:       0.4,
    fontWeight:    '800',
    fontSize:      11,
    letterSpacing: 1.2,
  },
  labelOptional: {
    opacity:       0.25,
    fontWeight:    '700',
    fontSize:      9,
    letterSpacing: 0.8,
  },
  input: {
    borderWidth:       1.5,
    borderRadius:      12,
    paddingHorizontal: 16,
    marginBottom:      20,
    fontSize:          16,
    height:            52,
  },
  bioInput: {
    height:       90,
    paddingTop:   12,
    marginBottom: 4,
  },
  charCount: {
    textAlign:    'right',
    fontSize:     11,
    opacity:      0.3,
    marginBottom: 20,
    fontWeight:   '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    marginBottom:  24,
  },
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: 14,
    paddingVertical:   9,
    borderRadius:      99,
    borderWidth:       1.5,
  },
  chipFlag: { fontSize: 16 },
  chipText: { fontWeight: '700', fontSize: 13 },
  hintText: {
    fontSize:     12,
    opacity:      0.45,
    fontWeight:   '500',
    marginTop:    -16,
    marginBottom: 24,
  },
  saveButton: {
    height:         56,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      8,
  },
  saveButtonText: {
    color:      '#fff',
    fontWeight: '900',
    fontSize:   17,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT — wrapped con ErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────

export default withErrorBoundary(OnboardingScreen, { scope: 'OnboardingScreen' });