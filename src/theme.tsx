// src/theme.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import { getThemeMode, setThemeMode, type ThemeMode } from "./storage";

type Theme = {
  mode: ThemeMode;              // "system" | "light" | "dark"
  scheme: "light" | "dark";     // el resultado final aplicado
  setMode: (m: ThemeMode) => Promise<void>;
  colors: {
    bg: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
    primary: string;
    bubbleMe: string;
    bubbleThem: string;
  };
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await getThemeMode();
      if (saved) setModeState(saved);
    })();
  }, []);

  const scheme: "light" | "dark" = useMemo(() => {
    if (mode === "light") return "light";
    if (mode === "dark") return "dark";
    return systemScheme === "dark" ? "dark" : "light";
  }, [mode, systemScheme]);

  const colors = useMemo(() => {
    const dark = scheme === "dark";
    return {
      bg: dark ? "#0B0B0E" : "#FFFFFF",
      card: dark ? "#14141A" : "#F6F6F7",
      text: dark ? "#FFFFFF" : "#111111",
      subtext: dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)",
      border: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
      primary: "#111111",
      bubbleMe: dark ? "#FFFFFF" : "#111111",
      bubbleThem: dark ? "#1B1B22" : "#F1F1F1",
    };
  }, [scheme]);

  async function setMode(m: ThemeMode) {
    setModeState(m);
    await setThemeMode(m);
  }

  const value: Theme = useMemo(
    () => ({ mode, scheme, setMode, colors }),
    [mode, scheme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
