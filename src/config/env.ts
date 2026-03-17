// src/config/env.ts
// En React Native / Expo NO se usa dotenv.
// Las variables se definen en .env con prefijo EXPO_PUBLIC_

export const env = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? '',
} as const;

export default env;