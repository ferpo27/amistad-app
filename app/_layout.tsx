/**
 * @file app/_layout.tsx
 *
 * Root layout de la app.
 *
 * Integrations:
 *  - Sentry.init + Sentry.wrap — crash reporting, session replay, feedback
 *  - ErrorBoundary global — UI de retry en lugar de cierre silencioso
 *  - useAuthSession — JWT refresh proactivo, sign-out handling, redirección
 *  - usePushNotifications — registro de token, listeners de notificación
 *  - initI18n — carga asíncrona del idioma real del usuario
 */

import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { ThemeProvider }    from '../src/theme';
import { ErrorBoundary }    from '../src/components/ErrorBoundary';
import { useAuthSession }   from '../src/hooks/useAuthSession';
import {
  configurePushHandler,
  usePushNotifications,
}                           from '../src/hooks/usePushNotifications';
import { initI18n }         from '../src/i18n';

// ─── Sentry init ───────────────────────────────────────────────────────────
// Debe ejecutarse lo antes posible — antes del primer render.

Sentry.init({
  dsn: 'https://941bbf1e455388427ff3038696e32ed1@o4511243090329600.ingest.us.sentry.io/4511243091247104',

  sendDefaultPii:           true,
  enableLogs:               true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // Activar Spotlight en desarrollo (descomentar si usás spotlight.js)
  // spotlight: __DEV__,
});

// ─── Push handler ──────────────────────────────────────────────────────────
// Se configura una sola vez al módulo load, fuera del árbol de React.

configurePushHandler();

// ─── Inner layout ──────────────────────────────────────────────────────────
// Componente hijo separado para que los hooks tengan acceso al contexto
// del router de Expo (requiere estar dentro del árbol de ThemeProvider).

function RootLayoutInner() {
  useAuthSession();       // JWT refresh proactivo + redirección por sesión expirada
  usePushNotifications(); // Registro de token + listeners de navegación

  useEffect(() => {
    void initI18n(); // Carga el idioma real del usuario (async, no bloquea el render)
  }, []);

  return <Slot />;
}

// ─── Root layout ───────────────────────────────────────────────────────────

export default Sentry.wrap(function Layout() {
  return (
    <ThemeProvider>
      <ErrorBoundary scope="RootLayout">
        <RootLayoutInner />
      </ErrorBoundary>
    </ThemeProvider>
  );
});