// app/(tabs)/modal.tsx
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// @types/react-native@0.73 has incomplete Modal typings for RN 0.81
const TypedModal = Modal as React.ComponentType<{
  visible: boolean; transparent?: boolean; animationType?: string;
  onRequestClose?: () => void; statusBarTranslucent?: boolean;
  children?: React.ReactNode;
}>;

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../src/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SnapPoint = 'half' | 'full' | number; // number = exact pixel height

type Props = {
  visible: boolean;
  /**
   * Safe to not pass — component handles missing onClose gracefully.
   * Always call onClose when you have it so the parent can toggle visibility.
   */
  onClose?: () => void;
  children?: React.ReactNode;
  /** Title shown in the drag handle row */
  title?: string;
  /** Snap point: 'half' (default), 'full', or exact px height */
  snapPoint?: SnapPoint;
  /** Whether tapping the backdrop closes the sheet (default: true) */
  closeOnBackdrop?: boolean;
  /** Whether swipe-down gesture closes the sheet (default: true) */
  closeOnSwipe?: boolean;
  /** Accent color override for the close button */
  accentColor?: string;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function resolveHeight(snap: SnapPoint): number {
  if (snap === 'full') return SCREEN_HEIGHT * 0.92;
  if (snap === 'half') return SCREEN_HEIGHT * 0.52;
  return snap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const BottomSheetModal: React.FC<Props> = ({
  visible,
  onClose,
  children,
  title,
  snapPoint = 'half',
  closeOnBackdrop = true,
  closeOnSwipe = true,
  accentColor,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const sheetHeight = resolveHeight(snapPoint);
  const accent = accentColor ?? colors.accent;

  // ── Animations ─────────────────────────────────────────────────────────────
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const safeClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
    // Regardless of whether parent handles it, animate out
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [onClose, translateY, backdropOpacity, sheetHeight]);

  // Open / close animations driven by `visible`
  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
          mass: 0.9,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity, dragY, sheetHeight]);

  // ── Swipe-down gesture ─────────────────────────────────────────────────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => closeOnSwipe,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          closeOnSwipe && gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          const dy = Math.max(0, gestureState.dy);
          translateY.setValue(dy);
          // fade backdrop as you drag
          const progress = Math.min(dy / sheetHeight, 1);
          backdropOpacity.setValue(1 - progress * 0.8);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > sheetHeight * 0.3 || gestureState.vy > 0.8) {
            safeClose();
          } else {
            // snap back
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 250,
            }).start();
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 180,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 250,
          }).start();
        },
      }),
    [closeOnSwipe, safeClose, translateY, backdropOpacity, sheetHeight]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────────────────────────────────

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdropFill: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.55)',
        },
        sheet: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: sheetHeight,
          backgroundColor: colors.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -6 },
          elevation: 16,
        },
        handleArea: {
          paddingTop: 14,
          paddingHorizontal: 20,
          paddingBottom: 10,
          alignItems: 'center',
        },
        handle: {
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginBottom: title ? 14 : 4,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        },
        titleText: {
          color: colors.fg,
          fontWeight: '800',
          fontSize: 18,
          flex: 1,
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        content: {
          flex: 1,
          paddingBottom: insets.bottom,
        },
        divider: {
          height: 1,
          backgroundColor: colors.border,
          marginBottom: 4,
        },
      }),
    [colors, sheetHeight, insets.bottom, title]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  // Mount/unmount is driven purely by the `visible` prop and animation state.
  // We always render when visible; when not visible the sheet slides out via animation.

  return (
    <TypedModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={safeClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdropFill, { opacity: backdropOpacity }]}>
        {closeOnBackdrop ? (
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={safeClose}
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
          />
        ) : (
          <View style={StyleSheet.absoluteFillObject} />
        )}
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Handle + optional title */}
        <View style={styles.handleArea}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.titleRow}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={safeClose}
                accessibilityLabel="Cerrar modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color={colors.subtext} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {title ? <View style={styles.divider} /> : null}

        {/* Children */}
        <View style={styles.content}>
          {children ?? (
            <View
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}
            >
              <Ionicons name="information-circle-outline" size={40} color={colors.subtext} style={{ opacity: 0.4 }} />
              <Text style={{ color: colors.subtext, fontWeight: '600' }}>
                Sin contenido
              </Text>
              <TouchableOpacity
                onPress={safeClose}
                style={{
                  marginTop: 8,
                  backgroundColor: accent + '20',
                  borderRadius: 12,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                }}
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
              >
                <Text style={{ color: accent, fontWeight: '800' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    </TypedModal>
  );
};

export default BottomSheetModal;

// ─────────────────────────────────────────────────────────────────────────────
// Named re-export so consumers can also do: import { ReusableModal }
// ─────────────────────────────────────────────────────────────────────────────
export { BottomSheetModal as ReusableModal };