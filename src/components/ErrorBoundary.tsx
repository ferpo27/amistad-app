/**
 * @file ErrorBoundary.tsx
 * @module src/components
 *
 * Production-grade React Error Boundary for Amistad.
 * Meta-scale: wraps every screen, catches render/lifecycle errors,
 * exposes retry, HOC, and imperative reset via context.
 *
 * React error boundaries MUST be class components — this is a React constraint,
 * not a stylistic choice. Hooks cannot catch render-phase errors.
 *
 * Exports:
 *  - default ErrorBoundary          ← for import ErrorBoundary from '...'
 *  - named  { ErrorBoundary }       ← for import { ErrorBoundary } from '...'
 *  - named  { withErrorBoundary }   ← HOC for per-screen wrapping
 *  - named  { useErrorBoundary }    ← hook to reset nearest boundary imperatively
 */

import React, { Component, createContext, useContext } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Optional custom fallback. Receives the error and a retry callback.
   * If omitted, the default Amistad fallback UI is used.
   */
  fallback?: (error: Error, retry: () => void) => React.ReactNode;
  /**
   * Called when an error is caught. Use for Sentry / analytics reporting.
   * @example onError={(e, info) => Sentry.captureException(e, { extra: info })}
   */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Granularity label for logging ("HomeScreen", "ChatList", etc.) */
  scope?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error:    Error | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT — imperative reset from any child
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryContextValue {
  resetError: () => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue>({
  resetError: () => {},
});

/**
 * Hook to imperatively reset the nearest ErrorBoundary from a child screen.
 *
 * @example
 * function SomeChild() {
 *   const { resetError } = useErrorBoundary();
 *   return <Button onPress={resetError} title="Reintentar" />;
 * }
 */
export function useErrorBoundary(): ErrorBoundaryContextValue {
  return useContext(ErrorBoundaryContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK UI
// ─────────────────────────────────────────────────────────────────────────────

function DefaultFallback({
  error,
  onRetry,
}: {
  error:   Error | null;
  onRetry: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons
          name="alert-circle-outline"
          size={52}
          color="#FF6B6B"
          style={styles.icon}
        />

        <Text style={styles.title}>Algo salió mal</Text>
        <Text style={styles.subtitle}>
          La pantalla encontró un error inesperado.{'\n'}
          Tus datos están a salvo.
        </Text>

        {/* Dev-only error details — stripped in production builds */}
        {__DEV__ && error ? (
          <ScrollView style={styles.devBox} showsVerticalScrollIndicator>
            <Text style={styles.devMessage}>{error.message}</Text>
            <Text style={styles.devStack}>{error.stack}</Text>
          </ScrollView>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          accessibilityHint="Toca para volver a cargar la pantalla"
        >
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  static displayName = 'ErrorBoundary';

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state    = { hasError: false, error: null };
    this.resetError = this.resetError.bind(this);
  }

  // React calls this synchronously after a render error.
  // Must return the new state — cannot have side effects.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // Called after the boundary has rendered the fallback UI.
  // Safe place for side effects: logging, analytics, Sentry.
  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const scope = this.props.scope ?? 'Unknown';

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(
        `[ErrorBoundary:${scope}]`,
        error.message,
        info.componentStack,
      );
    }

    // ── Sentry integration (uncomment when configured) ──────────────────────
    // import * as Sentry from '@sentry/react-native';
    // Sentry.captureException(error, {
    //   extra: { componentStack: info.componentStack, scope },
    // });
    // ────────────────────────────────────────────────────────────────────────

    this.props.onError?.(error, info);
  }

  resetError(): void {
    this.setState({ hasError: false, error: null });
  }

  render() {
    const { hasError, error }  = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return fallback
        ? fallback(error!, this.resetError)
        : <DefaultFallback error={error} onRetry={this.resetError} />;
    }

    return (
      <ErrorBoundaryContext.Provider value={{ resetError: this.resetError }}>
        {children}
      </ErrorBoundaryContext.Provider>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOC — ergonomic per-screen wrapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps any screen component with an ErrorBoundary.
 * Preserves displayName for React DevTools.
 *
 * @example
 * export default withErrorBoundary(HomeScreen, { scope: 'HomeScreen' });
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, 'children'>,
): React.ComponentType<P> {
  const displayName =
    WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component';

  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary scope={displayName} {...boundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: '#F8F9FA',
    padding:         24,
  } as ViewStyle,

  card: {
    width:           '100%',
    maxWidth:        360,
    backgroundColor: '#FFFFFF',
    borderRadius:    20,
    padding:         32,
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.08,
    shadowRadius:    16,
    elevation:       6,
  } as ViewStyle,

  icon: { marginBottom: 20 },

  title: {
    fontSize:     20,
    fontWeight:   '700',
    color:        '#1A1A2E',
    marginBottom: 10,
    textAlign:    'center',
  },

  subtitle: {
    fontSize:     15,
    color:        '#6B7280',
    textAlign:    'center',
    lineHeight:   22,
    marginBottom: 24,
  },

  devBox: {
    backgroundColor: '#1A1A2E',
    borderRadius:    8,
    padding:         12,
    marginBottom:    20,
    maxHeight:       180,
    width:           '100%',
  },

  devMessage: {
    color:        '#FF6B6B',
    fontFamily:   'monospace',
    fontSize:     12,
    marginBottom: 8,
    fontWeight:   '600',
  },

  devStack: {
    color:      '#A0AEC0',
    fontFamily: 'monospace',
    fontSize:   10,
    lineHeight: 16,
  },

  retryButton: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    backgroundColor:   '#6C63FF',
    paddingHorizontal: 28,
    paddingVertical:   14,
    borderRadius:      14,
  } as ViewStyle,

  retryButtonPressed: {
    opacity:   0.85,
    transform: [{ scale: 0.97 }],
  } as ViewStyle,

  retryText: {
    color:      '#FFFFFF',
    fontSize:   16,
    fontWeight: '600',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT
// Permite tanto:  import ErrorBoundary from '...'       (default)
// como:           import { ErrorBoundary } from '...'   (named)
// ─────────────────────────────────────────────────────────────────────────────

export default ErrorBoundary;