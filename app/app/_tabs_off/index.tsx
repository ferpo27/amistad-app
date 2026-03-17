import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { isLoggedIn, isOnboardingDone } from "../../../src/storage";


export default function IndexTabsOff() {
  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);
  const [onbDone, setOnbDone] = useState(false);

  useEffect(() => {
    (async () => {
      const l = await isLoggedIn();
      const o = await isOnboardingDone();
      setLogged(l);
      setOnbDone(o);
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  if (!logged) return <Redirect href={"/(auth)/login" as any} />;
  if (!onbDone) return <Redirect href={"/(app)/landing" as any} />;

  return <Redirect href={"/(tabs)/home" as any} />;
}
