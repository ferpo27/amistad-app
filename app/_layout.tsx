import React from 'react';
import { ThemeProvider } from '../src/theme';
import '../src/i18n';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}