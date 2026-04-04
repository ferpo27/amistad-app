import React from 'react';
import { Slot } from 'expo-router';
import { ThemeProvider } from '../../theme';
import '../src/i18n';
 
export default function Layout() {
  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}