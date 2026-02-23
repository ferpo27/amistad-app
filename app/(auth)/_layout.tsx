import React, { useEffect } from "react";
import { Stack } from "expo-router";
import i18n, { initI18n } from "../../src/i18n";
import AppLangPicker from "../../src/components/AppLangPicker";
import { getAppLanguage } from "../../src/storage";

export default function TabsLayout() {
  useEffect(() => {
    (async () => {
      const saved = await getAppLanguage();
      await initI18n((saved as any) || "es");
      if (saved && i18n.language !== saved) await i18n.changeLanguage(saved);
    })();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: i18n.t("appName"),
        headerRight: () => <AppLangPicker />,
      }}
    />
  );
}
