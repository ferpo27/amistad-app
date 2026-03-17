// src/nav.ts
import type { Href } from "expo-router";

// Helper para evitar errores TS de rutas (ts2345).
// Usalo así: nav.replace(router, "/(tabs)/home")
export const nav = {
  push(router: any, href: string) {
    router.push(href as unknown as Href);
  },
  replace(router: any, href: string) {
    router.replace(href as unknown as Href);
  },
};
