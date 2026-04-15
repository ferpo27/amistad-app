// src/theme.ts  ── SINGLE SOURCE OF TRUTH
// theme.tsx has been removed. All logic lives here.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getThemeMode, setThemeMode, type ThemeMode } from "./storage";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeScheme = "light" | "dark";

export type ThemeColors = {
  bg: string;
  background: string;   // alias de bg
  card: string;
  border: string;
  fg: string;
  text: string;
  accent: string;
  accentSoft: string;
  primarySoft: string;  // alias de accentSoft
  subtext: string;
  primary: string;
  error: string;
};

export type ThemeSpacing = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type ThemeFontSizes = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};

export type ThemeRadii = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
};

export { type ThemeMode };

// ─────────────────────────────────────────────────────────────────────────────
// Static tokens
// ─────────────────────────────────────────────────────────────────────────────

export const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fontSizes: ThemeFontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
};

export const radii: ThemeRadii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ─────────────────────────────────────────────────────────────────────────────
// Color palettes
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = "#4C8EFF";
const ERROR  = "#FF5C5C";

function colorsFor(scheme: ThemeScheme): ThemeColors {
  if (scheme === "dark") {
    const bg         = "#0B0D12";
    const accentSoft = "rgba(76,142,255,0.15)";
    return {
      bg,
      background:  bg,
      card:        "#121624",
      border:      "rgba(255,255,255,0.10)",
      fg:          "#FFFFFF",
      text:        "#FFFFFF",
      subtext:     "rgba(255,255,255,0.55)",
      primary:     ACCENT,
      accent:      ACCENT,
      accentSoft,
      primarySoft: accentSoft,
      error:       ERROR,
    };
  }
  const bg         = "#FFFFFF";
  const accentSoft = "rgba(76,142,255,0.10)";
  return {
    bg,
    background:  bg,
    card:        "#F5F7FB",
    border:      "rgba(0,0,0,0.10)",
    fg:          "#0B0D12",
    text:        "#0B0D12",
    subtext:     "rgba(11,13,18,0.55)",
    primary:     ACCENT,
    accent:      ACCENT,
    accentSoft,
    primarySoft: accentSoft,
    error:       ERROR,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useThemeMode() {
  const systemScheme = (useColorScheme() ?? "light") as ThemeScheme;
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    (async () => {
      const saved = await getThemeMode();
      if (saved) setModeState(saved);
    })();
  }, []);

  const scheme: ThemeScheme = mode === "system" ? systemScheme : (mode as ThemeScheme);
  const colors = useMemo(() => colorsFor(scheme), [scheme]);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    await setThemeMode(m);
  }, []);

  return { mode, scheme, colors, setMode, isDark: scheme === "dark" };
}

// Alias para compatibilidad
export function useTheme() {
  return useThemeMode();
}

/**
 * useAppTheme — devuelve colores + tokens de diseño (spacing, fontSizes, radii).
 * Úsalo en cualquier pantalla nueva en lugar de hardcodear valores.
 */
export function useAppTheme() {
  const { colors, isDark, mode, setMode, scheme } = useThemeMode();
  return { colors, spacing, fontSizes, radii, isDark, mode, setMode, scheme };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context + Provider
// ─────────────────────────────────────────────────────────────────────────────

type ThemeContextValue = ReturnType<typeof useThemeMode>;
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useThemeMode();
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used inside <ThemeProvider>");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy constant exports — kept for backward compatibility
// ─────────────────────────────────────────────────────────────────────────────

export const PRIMARY_COLOR         = ACCENT;
export const ACCENT_COLOR          = ACCENT;
export const ACCENT_SOFT_COLOR     = "rgba(76,142,255,0.10)";
export const BG_COLOR              = "#FFFFFF";
export const FG_COLOR              = "#0B0D12";
export const CARD_COLOR            = "#F5F7FB";
export const BORDER_COLOR          = "rgba(0,0,0,0.10)";
export const TEXT_COLOR            = "#0B0D12";
export const SUBTEXT_COLOR         = "rgba(11,13,18,0.55)";
export const SURFACE_COLOR         = "#F5F7FB";
export const ERROR_COLOR           = ERROR;
export const BACKGROUND_COLOR      = "#FFFFFF";
export const ON_PRIMARY_COLOR      = "#ffffff";
export const ON_SECONDARY_COLOR    = "#ffffff";
export const ON_BACKGROUND_COLOR   = "#0B0D12";
export const ON_SURFACE_COLOR      = "#0B0D12";
export const ON_ERROR_COLOR        = "#ffffff";
export const SECONDARY_COLOR       = "#dc004e";

export const DARK_BG_COLOR            = "#0B0D12";
export const DARK_CARD_COLOR          = "#121624";
export const DARK_FG_COLOR            = "#FFFFFF";
export const DARK_ACCENT_COLOR        = ACCENT;
export const DARK_ACCENT_SOFT_COLOR   = "rgba(76,142,255,0.15)";
export const DARK_BORDER_COLOR        = "rgba(255,255,255,0.10)";
export const DARK_TEXT_COLOR          = "#FFFFFF";
export const DARK_SUBTEXT_COLOR       = "rgba(255,255,255,0.55)";
export const DARK_PRIMARY_COLOR       = ACCENT;
export const DARK_SECONDARY_COLOR     = "#dc004e";
export const DARK_BACKGROUND_COLOR    = "#0B0D12";
export const DARK_SURFACE_COLOR       = "#121624";
export const DARK_ERROR_COLOR         = ERROR;
export const DARK_ON_PRIMARY_COLOR    = "#ffffff";
export const DARK_ON_SECONDARY_COLOR  = "#ffffff";
export const DARK_ON_BACKGROUND_COLOR = "#FFFFFF";
export const DARK_ON_SURFACE_COLOR    = "#FFFFFF";
export const DARK_ON_ERROR_COLOR      = "#ffffff";

export const themeColorSoft = ACCENT_SOFT_COLOR;

const theme = { colorsFor, ACCENT, spacing, fontSizes, radii };
export default theme;