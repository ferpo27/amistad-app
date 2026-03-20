// app/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { isAuthOk, isOnboardingDone } from '../src/storage';
import { supabase } from '../src/lib/supabase';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const auth = await isAuthOk();
      if (!auth) {
        router.replace('/(auth)/login');
        return;
      }
      const onboarded = await isOnboardingDone();
      if (!onboarded) {
        router.replace('/onboarding');
        return;
      }
      router.replace('/(tabs)/home');
    })();
  }, []);

  return null;
}