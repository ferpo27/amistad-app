export default {
  expo: {
    name: 'Amistad',
    slug: 'amistad',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'amistad',
    plugins: ['expo-router'],
    ios: { supportsTablet: false, bundleIdentifier: 'com.amistad.app' },
    android: { package: 'com.amistad.app' },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: { projectId: 'dd65c5f4-228a-4119-9e78-eff0688b9fa1' },
    },
    experiments: { typedRoutes: true },
    router: {
      ignorelist: [
        'app/src/types/app\\.d\\.ts',
        'app/src/types/react-native\\.d\\.ts',
      ],
    },
  },
};
