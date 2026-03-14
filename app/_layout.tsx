import React from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSearchParams } from 'expo-router';

export default function Layout(props: { children: React.ReactNode }) {
  const { children } = props;
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Stack />
    </View>
  );
}