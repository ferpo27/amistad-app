import { useState } from 'react';

const lightColors = {
  primary: '#6C63FF',
  secondary: '#dc004e',
  background: '#f5f5f5',
  surface: '#ffffff',
  error: '#f44336',
  onPrimary: '#ffffff',
  onSecondary: '#ffffff',
  onBackground: '#000000',
  onSurface: '#000000',
  onError: '#ffffff',
  bg: '#f5f5f5',
  fg: '#1a1a2e',
  card: '#ffffff',
  border: '#e0e0e0',
  accent: '#6C63FF',
  accentSoft: '#ede9ff',
  text: '#1a1a2e',
  subtext: '#888888',
};

const darkColors = {
  primary: '#6C63FF',
  secondary: '#dc004e',
  background: '#1a1a2e',
  surface: '#16213e',
  error: '#f44336',
  onPrimary: '#ffffff',
  onSecondary: '#ffffff',
  onBackground: '#ffffff',
  onSurface: '#ffffff',
  onError: '#ffffff',
  bg: '#1a1a2e',
  fg: '#f5f5f5',
  card: '#16213e',
  border: '#2a2a4a',
  accent: '#6C63FF',
  accentSoft: '#2d2b55',
  text: '#f5f5f5',
  subtext: '#aaaaaa',
};

const theme = {
  fonts: {
    primary: "'Roboto', sans-serif",
    secondary: "'Open Sans', sans-serif",
    monospace: "'Courier New', monospace",
    sizeSmall: '0.8rem',
    sizeMedium: '1rem',
    sizeLarge: '1.2rem',
    weightLight: 300,
    weightRegular: 400,
    weightMedium: 500,
    weightBold: 700,
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    gutter: '16px',
    container: '1200px',
  },
};

export const PRIMARY_COLOR = '#6C63FF';
export const SECONDARY_COLOR = '#dc004e';
export const BACKGROUND_COLOR = '#f5f5f5';
export const SURFACE_COLOR = '#ffffff';
export const ERROR_COLOR = '#f44336';
export const ON_PRIMARY_COLOR = '#ffffff';
export const ON_SECONDARY_COLOR = '#ffffff';
export const ON_BACKGROUND_COLOR = '#000000';
export const ON_SURFACE_COLOR = '#000000';
export const ON_ERROR_COLOR = '#ffffff';
export const BG_COLOR = '#f5f5f5';
export const FG_COLOR = '#1a1a2e';
export const CARD_COLOR = '#ffffff';
export const BORDER_COLOR = '#e0e0e0';
export const ACCENT_COLOR = '#6C63FF';
export const ACCENT_SOFT_COLOR = '#ede9ff';
export const TEXT_COLOR = '#1a1a2e';
export const SUBTEXT_COLOR = '#888888';

export const DARK_PRIMARY_COLOR = '#6C63FF';
export const DARK_SECONDARY_COLOR = '#dc004e';
export const DARK_BACKGROUND_COLOR = '#1a1a2e';
export const DARK_SURFACE_COLOR = '#16213e';
export const DARK_ERROR_COLOR = '#f44336';
export const DARK_ON_PRIMARY_COLOR = '#ffffff';
export const DARK_ON_SECONDARY_COLOR = '#ffffff';
export const DARK_ON_BACKGROUND_COLOR = '#ffffff';
export const DARK_ON_SURFACE_COLOR = '#ffffff';
export const DARK_ON_ERROR_COLOR = '#ffffff';
export const DARK_BG_COLOR = '#1a1a2e';
export const DARK_FG_COLOR = '#f5f5f5';
export const DARK_CARD_COLOR = '#16213e';
export const DARK_BORDER_COLOR = '#2a2a4a';
export const DARK_ACCENT_COLOR = '#6C63FF';
export const DARK_ACCENT_SOFT_COLOR = '#2d2b55';
export const DARK_TEXT_COLOR = '#f5f5f5';
export const DARK_SUBTEXT_COLOR = '#aaaaaa';

export default theme;

export const useThemeMode = () => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const isDark = mode === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const toggleMode = () => setMode(isDark ? 'light' : 'dark');
  return { mode, setMode, toggleMode, isDark, colors };
};

export const useTheme = () => {
  const { colors, mode } = useThemeMode();
  return { ...theme, colors, mode };
};

export const ThemeProvider = ({ children }: { children: any }) => children;

export const themeColorSoft = '#ede9ff';