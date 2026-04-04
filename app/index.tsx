// app/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { isAuthOk, isOnboardingDone } from '../src/storage';
 
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
      router.replace('/(tabs)/home' as any);
    })();
  }, [router]);
 
  return null;
}
 