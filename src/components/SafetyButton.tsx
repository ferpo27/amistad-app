// src/components/SafetyButton.tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { useThemeMode } from '../theme.tsx';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'harassment'
  | 'underage'
  | 'fake_profile'
  | 'hate_speech'
  | 'other';

type ReportOption = {
  id: ReportReason;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
};

type Props = {
  /** ID of the user being reported */
  reportedUserId: string;
  /** Display name shown in confirmation message */
  reportedUsername?: string;
  /** Visual variant — 'icon' shows just the flag icon, 'full' shows icon + label */
  variant?: 'icon' | 'full';
  /** Override size of the trigger icon */
  iconSize?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: 'spam',
    icon: 'mail-unread-outline',
    label: 'Spam o publicidad',
    description: 'Envía mensajes no deseados o links externos.',
  },
  {
    id: 'inappropriate_content',
    icon: 'eye-off-outline',
    label: 'Contenido inapropiado',
    description: 'Fotos, mensajes o perfil con contenido sexual o violento.',
  },
  {
    id: 'harassment',
    icon: 'alert-circle-outline',
    label: 'Acoso o amenazas',
    description: 'Me está acosando, intimidando o amenazando.',
  },
  {
    id: 'underage',
    icon: 'person-remove-outline',
    label: 'Menor de edad',
    description: 'Parece ser menor de 13 años.',
  },
  {
    id: 'fake_profile',
    icon: 'person-outline',
    label: 'Perfil falso',
    description: 'Está haciéndose pasar por otra persona.',
  },
  {
    id: 'hate_speech',
    icon: 'megaphone-outline',
    label: 'Discurso de odio',
    description: 'Promueve discriminación, racismo o violencia.',
  },
  {
    id: 'other',
    icon: 'ellipsis-horizontal-circle-outline',
    label: 'Otro motivo',
    description: 'Algo más que no está en estas opciones.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SuccessView({
  username,
  onClose,
  colors,
}: {
  username: string;
  onClose: () => void;
  colors: ReturnType<typeof useThemeMode>['colors'];
}) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [scale, opacity]);

  return (
    <Animated.View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 16,
        opacity,
        transform: [{ scale }],
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: '#34C759' + '20',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="checkmark-circle" size={44} color="#34C759" />
      </View>
      <Text style={{ color: colors.fg, fontWeight: '900', fontSize: 22, textAlign: 'center' }}>
        Reporte enviado
      </Text>
      <Text
        style={{
          color: colors.subtext,
          fontSize: 15,
          textAlign: 'center',
          lineHeight: 22,
          fontWeight: '500',
        }}
      >
        Gracias por ayudarnos a mantener Amistad seguro.{'\n'}
        Revisaremos el perfil de{' '}
        <Text style={{ fontWeight: '800', color: colors.fg }}>{username}</Text>.
      </Text>
      <Text
        style={{
          color: colors.subtext,
          fontSize: 13,
          textAlign: 'center',
          lineHeight: 19,
          fontWeight: '500',
          opacity: 0.7,
        }}
      >
        También podés bloquear a esta persona desde la pantalla de chat para no recibir más mensajes.
      </Text>
      <TouchableOpacity
        onPress={onClose}
        style={{
          marginTop: 8,
          backgroundColor: '#34C759',
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 40,
        }}
        accessibilityLabel="Cerrar confirmación de reporte"
        accessibilityRole="button"
      >
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Entendido</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function SafetyButton({
  reportedUserId,
  reportedUsername = 'este usuario',
  variant = 'icon',
  iconSize = 20,
}: Props) {
  const { colors } = useThemeMode();
  const insets = useSafeAreaInsets();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [step, setStep] = useState<'select' | 'details' | 'success'>('select');
  const [submitting, setSubmitting] = useState(false);

  const slideY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openSheet = useCallback(() => {
    setStep('select');
    setSelectedReason(null);
    setDetails('');
    setSheetOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideY, backdropOpacity]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSheetOpen(false);
      setStep('select');
      setSelectedReason(null);
      setDetails('');
    });
  }, [slideY, backdropOpacity]);

  const handleSelectReason = useCallback(
    (reason: ReportReason) => {
      setSelectedReason(reason);
      Haptics.selectionAsync();
      if (reason === 'other') {
        setStep('details');
      } else {
        // For non-other reasons, show details step optionally
        setStep('details');
      }
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return;
    setSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const reporterId = session.session?.user.id;

      const { error } = await supabase.from('reports').insert({
        reported_user_id: reportedUserId,
        reporter_id: reporterId ?? null,
        reason: selectedReason,
        details: details.trim() || null,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setStep('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      Alert.alert('No se pudo enviar', message, [{ text: 'OK' }]);
    } finally {
      setSubmitting(false);
    }
  }, [selectedReason, reportedUserId, details]);

  const sheetHeight = step === 'success' ? 360 : step === 'details' ? 480 : 580;

  const styles = StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 6,
    },
    triggerLabel: {
      color: '#FF3B30',
      fontWeight: '700',
      fontSize: 14,
    },
    backdropFill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: insets.bottom + 12,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: -6 },
      elevation: 20,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 14,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      color: colors.fg,
      fontWeight: '900',
      fontSize: 17,
    },
    headerSub: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 14,
    },
    optionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionLabel: {
      fontWeight: '700',
      fontSize: 15,
    },
    optionDesc: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 1,
    },
    selectedDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailsInput: {
      backgroundColor: colors.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      color: colors.fg,
      fontSize: 15,
      fontWeight: '500',
      minHeight: 100,
      textAlignVertical: 'top',
      marginHorizontal: 20,
      marginTop: 16,
    },
    submitBtn: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: '#FF3B30',
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 16,
    },
    backBtn: {
      paddingHorizontal: 20,
      paddingTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
  });

  const selectedOption = REPORT_OPTIONS.find((o) => o.id === selectedReason);

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={openSheet}
        accessibilityLabel={`Reportar a ${reportedUsername}`}
        accessibilityRole="button"
      >
        <Ionicons name="flag-outline" size={iconSize} color="#FF3B30" />
        {variant === 'full' ? (
          <Text style={styles.triggerLabel}>Denunciar</Text>
        ) : null}
      </TouchableOpacity>

      {/* Bottom sheet overlay — rendered inline, no Modal dependency */}
      {sheetOpen ? (
        <View
          style={{
            position: 'absolute',
            top: -9999,
            left: -9999,
            width: 0,
            height: 0,
          }}
          pointerEvents="none"
        />
      ) : null}
      {sheetOpen ? (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            elevation: 20,
          }}
          pointerEvents="box-none"
        >
          {/* Backdrop */}
          <Animated.View style={[styles.backdropFill, { opacity: backdropOpacity }]}>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={closeSheet}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
            />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              { height: sheetHeight, transform: [{ translateY: slideY }] },
            ]}
          >
            <View style={styles.handle} />

          {step === 'success' ? (
            <SuccessView
              username={reportedUsername}
              onClose={closeSheet}
              colors={colors}
            />
          ) : step === 'select' ? (
            <>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Denunciar perfil</Text>
                  <Text style={styles.headerSub}>¿Cuál es el problema?</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={closeSheet}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <Ionicons name="close" size={18} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              {/* Options list */}
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {REPORT_OPTIONS.map((option) => {
                  const isSelected = selectedReason === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[
                        styles.optionRow,
                        isSelected && { backgroundColor: '#FF3B3010' },
                      ]}
                      onPress={() => handleSelectReason(option.id)}
                      accessibilityLabel={option.label}
                      accessibilityRole="button"
                    >
                      <View
                        style={[
                          styles.optionIcon,
                          {
                            backgroundColor: isSelected
                              ? '#FF3B3020'
                              : colors.bg,
                          },
                        ]}
                      >
                        <Ionicons
                          name={option.icon}
                          size={20}
                          color={isSelected ? '#FF3B30' : colors.subtext}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.optionLabel,
                            { color: isSelected ? '#FF3B30' : colors.fg },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.optionDesc,
                            { color: colors.subtext },
                          ]}
                        >
                          {option.description}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.selectedDot,
                          {
                            backgroundColor: isSelected
                              ? '#FF3B30'
                              : colors.border,
                          },
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            /* details step */
            <>
              {/* Back header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => setStep('select')}
                  accessibilityRole="button"
                  accessibilityLabel="Volver a selección de motivo"
                >
                  <Ionicons name="chevron-back" size={20} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>
                    Volver
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={closeSheet}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <Ionicons name="close" size={18} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 4 }}>
                <Text style={{ color: colors.fg, fontWeight: '900', fontSize: 17 }}>
                  {selectedOption?.label}
                </Text>
                <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '500' }}>
                  Podés agregar detalles adicionales (opcional).
                </Text>
              </View>

              <TextInput
                style={styles.detailsInput}
                value={details}
                onChangeText={setDetails}
                placeholder="Contanos qué pasó… (opcional)"
                placeholderTextColor={colors.subtext}
                multiline
                maxLength={500}
                accessibilityLabel="Detalles adicionales del reporte"
              />

              <Text
                style={{
                  color: colors.subtext,
                  fontSize: 11,
                  fontWeight: '500',
                  marginHorizontal: 20,
                  marginTop: 6,
                  textAlign: 'right',
                }}
              >
                {details.length}/500
              </Text>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityLabel="Confirmar denuncia"
                accessibilityRole="button"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    Confirmar denuncia
                  </Text>
                )}
              </TouchableOpacity>

              <Text
                style={{
                  color: colors.subtext,
                  fontSize: 11,
                  fontWeight: '500',
                  textAlign: 'center',
                  marginTop: 10,
                  marginHorizontal: 24,
                  lineHeight: 16,
                  opacity: 0.7,
                }}
              >
                Tu reporte es anónimo. Nuestro equipo lo revisará en menos de 24 horas.
              </Text>
            </>
          )}
          </Animated.View>
        </View>
      ) : null}
    </>
  );
}