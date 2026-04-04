// app/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { isAuthOk, isOnboardingDone } from '../src/storage';
import { View, Text } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const auth = await isAuthOk();
      if (!auth) {
        router.replace('/landing');
        return;
      }
      const onboarded = await isOnboardingDone();
      if (!onboarded) {
        router.replace('/onboarding');
        return;
      }
      // Check if the route '/(tabs)/home' exists and is correctly defined
      router.replace('/tabs/home'); // Assuming '/tabs/home' is the correct route
    })();
  }, [router]);

  return (
    <View>
      <Text>Loading...</Text>
    </View>
  );
}