// app/(auth)/login.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { setAuthOk } from '../../src/storage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Formato de correo inválido';
    if (!password) e.password = 'La contraseña es obligatoria';
    else if (password.length < 6)
      e.password = 'La contraseña debe tener al menos 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      await setAuthOk(true);
      router.replace('/(tabs)/home' as any);
    } catch (e: any) {
      Alert.alert('Error al ingresar', e?.message ?? 'Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert(
        'Ingresá tu correo',
        'Escribí tu dirección de email en el campo de arriba y luego tocá "Olvidé mi contraseña".',
      );
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: 'amistadapp://reset-password',
      });
      if (error) throw error;
      Alert.alert(
        'Revisá tu correo',
        `Te enviamos un link para restablecer tu contraseña a ${trimmedEmail}.`,
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo enviar el correo.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Amistad 🌍</Text>
        <Text style={styles.subtitle}>Hacé amigos en todo el mundo</Text>

        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErrors((e) => ({ ...e, email: undefined }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#aaa"
          accessibilityLabel="Campo correo electrónico"
        />
        {errors.email ? (
          <Text style={styles.errorText}>{errors.email}</Text>
        ) : null}

        <TextInput
          style={[styles.input, errors.password ? styles.inputError : null]}
          placeholder="Contraseña"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setErrors((e) => ({ ...e, password: undefined }));
          }}
          secureTextEntry
          placeholderTextColor="#aaa"
          accessibilityLabel="Campo contraseña"
        />
        {errors.password ? (
          <Text style={styles.errorText}>{errors.password}</Text>
        ) : null}

        {/* ✅ Olvidé mi contraseña — requerido por App Store */}
        <TouchableOpacity
          onPress={onForgotPassword}
          disabled={resetLoading}
          style={styles.forgotContainer}
          accessibilityLabel="Olvidé mi contraseña"
          accessibilityRole="button"
        >
          <Text style={styles.forgotText}>
            {resetLoading ? 'Enviando…' : '¿Olvidaste tu contraseña?'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
          accessibilityLabel="Botón entrar"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register' as any)}
          style={styles.linkContainer}
          accessibilityLabel="Ir a registro"
          accessibilityRole="button"
        >
          <Text style={styles.link}>
            ¿No tenés cuenta?{' '}
            <Text style={styles.linkBold}>Registrate</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
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
  errorText: { color: '#ff4d4f', fontSize: 12, marginBottom: 8, marginLeft: 4 },
  forgotContainer: { alignSelf: 'flex-end', marginBottom: 8, marginTop: 2 },
  forgotText: { color: '#4C8EFF', fontSize: 13, fontWeight: '600' },
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