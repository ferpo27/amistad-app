/**
 * @file useAuthSession.ts
 * @module src/hooks
 *
 * Production-grade auth session management hook for Amistad.
 *
 * Problems it solves:
 *  1. Supabase JWT expires after 1 hour — without proactive refresh the user
 *     gets silent 401s and sees empty screens instead of a login prompt.
 *  2. App backgrounded for hours → foregrounded → token stale → all API calls fail.
 *  3. Network offline during refresh → infinite loading state.
 *  4. No unified place to react to auth state changes (sign-out from another device, etc.)
 *
 * Architecture:
 *  - Listens to supabase.auth.onAuthStateChange (covers all auth events).
 *  - On AppState active: proactively refreshes if token expires in < REFRESH_THRESHOLD_MS.
 *  - On refresh failure (network error): schedules retry with exponential backoff.
 *  - On SIGNED_OUT or refresh-exhausted: clears local state + navigates to /index.
 *  - Exposes { session, user, status } for consumers.
 *
 * Usage:
 *  Place useAuthSession() in app/_layout.tsx (or a top-level provider).
 *  All other screens read from this hook — never call supabase.auth.getSession() directly.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { clearProfileCache } from '../storage/profilesStorage';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Refresh the token if it expires within this window. */
const REFRESH_THRESHOLD_MS   = 5 * 60 * 1000; // 5 minutes before expiry
const MAX_REFRESH_RETRIES    = 4;
const RETRY_BASE_DELAY_MS    = 1_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthStatus =
  | 'initializing'  // Cold start — checking for existing session
  | 'authenticated' // Valid session
  | 'unauthenticated'; // No session or signed out

export interface AuthSessionState {
  session:  Session  | null;
  user:     User     | null;
  status:   AuthStatus;
  /** Manually trigger a token refresh (e.g. after a network recovery banner). */
  refresh:  () => Promise<void>;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Returns true if the session JWT will expire within the threshold window. */
function isTokenStale(session: Session): boolean {
  if (!session.expires_at) return false;
  const expiresMs = session.expires_at * 1000; // Supabase uses Unix seconds
  return Date.now() + REFRESH_THRESHOLD_MS >= expiresMs;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthSession(): AuthSessionState {
  const router   = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<Session | null>(null);
  const [status,  setStatus]  = useState<AuthStatus>('initializing');

  // Track retry count across refresh attempts
  const retryCount = useRef(0);
  // Prevent concurrent refresh calls
  const isRefreshing = useRef(false);

  // ─── Navigation guard ──────────────────────────────────────────────────────

  /**
   * Redirects the user based on auth state.
   * - Unauthenticated + inside (tabs): push to /
   * - Authenticated + on auth screen: push to /(tabs)/home
   */
  const handleNavigation = useCallback(
    (currentStatus: AuthStatus) => {
      const inTabsGroup = segments[0] === '(tabs)';
      const inAuthScreen = !inTabsGroup;

      if (currentStatus === 'unauthenticated' && inTabsGroup) {
        router.replace('/');
      } else if (currentStatus === 'authenticated' && inAuthScreen) {
        // Only redirect from pure auth screens (index, onboarding)
        const authScreens = ['index', 'onboarding'];
        if (authScreens.includes(segments[0] ?? '')) {
          router.replace('/(tabs)/home');
        }
      }
    },
    [segments, router],
  );

  // ─── Session refresh ───────────────────────────────────────────────────────

  const refreshSession = useCallback(async (): Promise<void> => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_REFRESH_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase.auth.refreshSession();

        if (error) throw error;

        if (data.session) {
          setSession(data.session);
          setStatus('authenticated');
          retryCount.current = 0;
          isRefreshing.current = false;
          return;
        }
      } catch (err) {
        lastError = err as Error;

        if (attempt < MAX_REFRESH_RETRIES) {
          // Exponential back-off: 1s, 2s, 4s
          await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
        }
      }
    }

    // All retries exhausted
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[useAuthSession] Token refresh failed after all retries:', lastError?.message);
    }

    // Sign out locally — session is unrecoverable
    await supabase.auth.signOut();
    isRefreshing.current = false;
  }, []);

  // ─── Sign out + cleanup ────────────────────────────────────────────────────

  const handleSignOut = useCallback(async () => {
    await clearProfileCache();
    setSession(null);
    setStatus('unauthenticated');
  }, []);

  // ─── Initial session load ──────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;

      if (existingSession) {
        setSession(existingSession);
        setStatus('authenticated');

        // Proactively refresh if already close to expiry
        if (isTokenStale(existingSession)) {
          void refreshSession();
        }
      } else {
        setStatus('unauthenticated');
      }
    });

    return () => { mounted = false; };
  }, [refreshSession]);

  // ─── Auth state listener ───────────────────────────────────────────────────

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[useAuthSession] auth event:', event);
        }

        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            setSession(newSession);
            setStatus('authenticated');
            retryCount.current = 0;
            break;

          case 'SIGNED_OUT':
            await handleSignOut();
            break;

          case 'PASSWORD_RECOVERY':
            // Handle in a dedicated screen if needed
            break;

          default:
            break;
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [handleSignOut]);

  // ─── Navigation guard effect ───────────────────────────────────────────────

  useEffect(() => {
    if (status === 'initializing') return;
    handleNavigation(status);
  }, [status, handleNavigation]);

  // ─── AppState foreground refresh ───────────────────────────────────────────

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState !== 'active') return;
      if (!session) return;
      if (isTokenStale(session)) {
        void refreshSession();
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [session, refreshSession]);

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    session,
    user:    session?.user ?? null,
    status,
    refresh: refreshSession,
  };
}