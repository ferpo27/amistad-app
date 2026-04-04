import { isOnboardingDone } from '../src/storage';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { isAuthOk } from '../src/storage';
import { View, Text } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const auth = await isAuthOk();
      if (!auth) {
        if (router && router.push) { 
          router.push('/auth');
        } else { 
          router.push('/app');
        }
      } else {
        const onboarded = await isOnboardingDone();
        if (onboarded) { 
          router.push('/app');
        } else { 
          router.push('/onboarding');
        }
      }
      // Check if the route '/(tabs)/home' exists and is correctly defined
      if (router && router.canGo) { 
        if (router.canGo('/tabs/home')) {
          if (router && router.replace) { 
            router.replace('/tabs/home'); 
          }
        } else {
          console.error('Route /tabs/home does not exist');
        }
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