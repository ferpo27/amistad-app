// src/theme.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getThemeMode, setThemeMode, type ThemeMode } from "./storage";

export type ThemeScheme = "light" | "dark";
export type ThemeColors = {
  bg: string;
  card: string;
  border: string;
  fg: string;
  text: string;
  accent: string;
  accentSoft: string;
  subtext: string;
  primary: string;
};

function colorsFor(scheme: ThemeScheme): ThemeColors {
  const accent = "#4C8EFF";
  if (scheme === "dark") {
    return {
      bg: "#0B0D12",
      card: "#121624",
      border: "rgba(255,255,255,0.10)",
      fg: "#FFFFFF",
      text: "#FFFFFF",
      subtext: "rgba(255,255,255,0.55)",
      primary: "#4C8EFF",
      accent,
      accentSoft: "rgba(76,142,255,0.15)",
    };
  }
  return {
    bg: "#FFFFFF",
    card: "#F5F7FB",
    border: "rgba(0,0,0,0.10)",
    fg: "#0B0D12",
    text: "#0B0D12",
    subtext: "rgba(11,13,18,0.55)",
    primary: "#4C8EFF",
    accent,
    accentSoft: "rgba(76,142,255,0.10)",
  };
}

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

export function useTheme() {
  return useThemeMode();
}

// ── ThemeProvider (Context) ──────────────────────────────────────────────────
type ThemeContextValue = ReturnType<typeof useThemeMode>;
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useThemeMode();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { type ThemeMode };