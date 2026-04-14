// app/(auth)/register.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const router = useRouter();

  const [form, setForm] = useState<RegisterFormValues>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: keyof RegisterFormValues) =>
    (text: string): void => {
      setForm((prev) => ({ ...prev, [field]: text }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    if (!form.email.trim()) e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Formato de correo inválido';
    if (!form.password) e.password = 'La contraseña es obligatoria';
    else if (form.password.length < 6)
      e.password = 'Mínimo 6 caracteres';
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: { full_name: form.name.trim() },
        },
      });
      if (error) throw error;
      Alert.alert(
        'Revisá tu correo',
        'Te enviamos un link de confirmación. Hacé click en él para activar tu cuenta.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login' as any) }],
      );
    } catch (err: any) {
      Alert.alert('Error al registrarse', err?.message ?? 'Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Crear cuenta 🌍</Text>
        <Text style={styles.subtitle}>Unite a Amistad y hacé amigos en todo el mundo</Text>

        {/* Nombre */}
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          placeholder="Nombre"
          value={form.name}
          onChangeText={handleChange('name')}
          autoCapitalize="words"
          placeholderTextColor="#aaa"
          accessibilityLabel="Campo nombre"
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

        {/* Email */}
        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          placeholder="Correo electrónico"
          value={form.email}
          onChangeText={handleChange('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#aaa"
          accessibilityLabel="Campo correo electrónico"
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        {/* Contraseña */}
        <TextInput
          style={[styles.input, errors.password ? styles.inputError : null]}
          placeholder="Contraseña"
          value={form.password}
          onChangeText={handleChange('password')}
          secureTextEntry
          placeholderTextColor="#aaa"
          accessibilityLabel="Campo contraseña"
        />
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        {/* Confirmar contraseña */}
        <TextInput
          style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
          placeholder="Confirmar contraseña"
          value={form.confirmPassword}
          onChangeText={handleChange('confirmPassword')}
          secureTextEntry
          placeholderTextColor="#aaa"
          accessibilityLabel="Campo confirmar contraseña"
        />
        {errors.confirmPassword ? (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
          accessibilityLabel="Botón registrarse"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Registrarse</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.linkContainer}
          accessibilityLabel="Volver al inicio de sesión"
          accessibilityRole="button"
        >
          <Text style={styles.link}>
            ¿Ya tenés cuenta?{' '}
            <Text style={styles.linkBold}>Iniciá sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 36,
  },
  input: {
    height: 52,
    borderColor: '#ddd',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: { borderColor: '#ff4d4f' },
  errorText: {
    color: '#ff4d4f',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  button: {
    height: 52,
    backgroundColor: '#4C8EFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  linkContainer: { marginTop: 20, alignItems: 'center' },
  link: { color: '#666', fontSize: 14 },
  linkBold: { color: '#4C8EFF', fontWeight: '700' },
});