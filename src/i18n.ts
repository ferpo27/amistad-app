// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LanguageCode } from "./storage";
import { getAppLanguage } from "./storage";

// Guard: si algo raro se guarda, cae a "es"
function normalizeLang(x: any): LanguageCode {
  return x === "es" || x === "en" || x === "de" || x === "ja" || x === "ru" || x === "zh" ? x : "es";
}

/**
 * Keys mínimas que ya usás en la app:
 * chat, startConversation, close, tapToLearn, typeMessage, send, tips
 * stories, addStory, editStory
 * (podés sumar más cuando quieras)
 */
const resources = {
  es: {
    translation: {
      chat: "Chat",
      startConversation: "Empezá la conversación",
      close: "Cerrar",
      tapToLearn: "Tocá para aprender (estilo Duolingo)",
      typeMessage: "Escribí un mensaje",
      send: "Enviar",
      tips: "Tips",

      stories: "Historias",
      addStory: "Agregar",
      editStory: "Editar historia",

      profile: "Perfil",
      settings: "Ajustes",
      language: "Idioma",
      theme: "Tema",
      save: "Guardar",
      cancel: "Cancelar",
    },
  },
  en: {
    translation: {
      chat: "Chat",
      startConversation: "Start the conversation",
      close: "Close",
      tapToLearn: "Tap to learn (Duolingo-style)",
      typeMessage: "Type a message",
      send: "Send",
      tips: "Tips",

      stories: "Stories",
      addStory: "Add",
      editStory: "Edit story",

      profile: "Profile",
      settings: "Settings",
      language: "Language",
      theme: "Theme",
      save: "Save",
      cancel: "Cancel",
    },
  },
  de: {
    translation: {
      chat: "Chat",
      startConversation: "Gespräch starten",
      close: "Schließen",
      tapToLearn: "Tippe zum Lernen (Duolingo-Stil)",
      typeMessage: "Nachricht schreiben",
      send: "Senden",
      tips: "Tipps",

      stories: "Stories",
      addStory: "Hinzufügen",
      editStory: "Story bearbeiten",

      profile: "Profil",
      settings: "Einstellungen",
      language: "Sprache",
      theme: "Design",
      save: "Speichern",
      cancel: "Abbrechen",
    },
  },
  ru: {
    translation: {
      chat: "Чат",
      startConversation: "Начать разговор",
      close: "Закрыть",
      tapToLearn: "Нажми, чтобы учиться (как Duolingo)",
      typeMessage: "Напиши сообщение",
      send: "Отправить",
      tips: "Советы",

      stories: "Истории",
      addStory: "Добавить",
      editStory: "Редактировать историю",

      profile: "Профиль",
      settings: "Настройки",
      language: "Язык",
      theme: "Тема",
      save: "Сохранить",
      cancel: "Отмена",
    },
  },
  ja: {
    translation: {
      chat: "チャット",
      startConversation: "会話を始める",
      close: "閉じる",
      tapToLearn: "タップして学ぶ（Duolingo風）",
      typeMessage: "メッセージを書く",
      send: "送信",
      tips: "ヒント",

      stories: "ストーリー",
      addStory: "追加",
      editStory: "ストーリー編集",

      profile: "プロフィール",
      settings: "設定",
      language: "言語",
      theme: "テーマ",
      save: "保存",
      cancel: "キャンセル",
    },
  },
  zh: {
    translation: {
      chat: "聊天",
      startConversation: "开始对话",
      close: "关闭",
      tapToLearn: "点击学习（Duolingo 风格）",
      typeMessage: "输入消息",
      send: "发送",
      tips: "提示",

      stories: "动态",
      addStory: "添加",
      editStory: "编辑动态",

      profile: "个人资料",
      settings: "设置",
      language: "语言",
      theme: "主题",
      save: "保存",
      cancel: "取消",
    },
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

// ✅ Cargar idioma guardado al iniciar
export async function loadI18nLanguage(): Promise<LanguageCode> {
  const saved = await getAppLanguage();
  const lang = normalizeLang(saved);
  if (i18n.language !== lang) await i18n.changeLanguage(lang);
  return lang;
}

// ✅ Cambiar idioma y persistir (lo vas a usar desde Settings)
export async function setI18nLanguage(lang: LanguageCode): Promise<void> {
  const next = normalizeLang(lang);
  await AsyncStorage.setItem("appLang", next);
  if (i18n.language !== next) await i18n.changeLanguage(next);
}

export default i18n;
