import { useState } from 'react';
const theme = {
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#f44336',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onBackground: '#000000',
    onSurface: '#000000',
    onError: '#ffffff',
  },
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

export default theme;

export const useThemeMode = () => {
  const [mode, setMode] = useState('light');
  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };
  return { mode, toggleMode };
};

export const useTheme = () => {
  const { mode } = useThemeMode();
  return { ...theme, mode };
};

export const ThemeProvider = ({ children }) => {
  const { mode } = useThemeMode();
  return (
    <div style={{ backgroundColor: mode === 'light' ? theme.colors.background : '#333' }}>
      {children}
    </div>
  );
};