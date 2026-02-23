import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { isAuthOk, isOnboardingDone } from "../src/storage";

export default function Index() {
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const logged = await isAuthOk();
      if (!logged) return setTo("/(auth)/login");

      const onb = await isOnboardingDone();
      if (!onb) return setTo("/onboarding");

      setTo("/(tabs)/home");
    })();
  }, []);

  if (!to) return null;
  return <Redirect href={to as any} />;
}
