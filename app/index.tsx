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
        router.push('/landing');
        return;
      }
      const onboarded = await isOnboardingDone();
      if (!onboarded) {
        router.push('/onboarding');
        return;
      }
      // Check if the route '/(tabs)/home' exists and is correctly defined
      if (router.canGo('/tabs/home')) {
        router.replace('/tabs/home'); 
      } else {
        console.error('Route /tabs/home does not exist');
      }
    })();
    return () => {
      // cleanup
    };
  }, [router]);

  return (
    <View>
      <Text>Loading...</Text>
    </View>
  );
}