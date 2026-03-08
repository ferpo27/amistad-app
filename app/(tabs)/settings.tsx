// app/(tabs)/settings.tsx
import React, { useCallback, useState } from "react";
import {
  Pressable, Text, View, Switch, ScrollView, Platform,
  Alert, Modal, Image, TextInput, ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAppLanguage, setAppLanguage, setAuthOk, setOnboardingDone,
  getProfile, updateProfile, clearAll, getSavedMatches,
  type LanguageCode, type LearningLang,
} from "../../src/storage";
import { getBlockedList } from "../../src/safety";
import { useThemeMode } from "../../src/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import * as Haptics from "expo-haptics";

// ─── Datos ────────────────────────────────────────────────────────────────────
const LANGS: { code: LanguageCode; label: string; flag: string; local: string }[] = [
  { code: "es", label: "Español", flag: "🇦🇷", local: "Español" },
  { code: "en", label: "English", flag: "🇺🇸", local: "English" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", local: "Deutsch" },
  { code: "ja", label: "Japonés", flag: "🇯🇵", local: "日本語"  },
  { code: "ru", label: "Ruso",    flag: "🇷🇺", local: "Русский" },
  { code: "zh", label: "Chino",   flag: "🇨🇳", local: "中文"    },
];
const FLAGS: Record<string, string> = { es:"🇦🇷", en:"🇺🇸", de:"🇩🇪", ja:"🇯🇵", ru:"🇷🇺", zh:"🇨🇳" };
const LANG_NAMES: Record<string, string> = { es:"Español", en:"English", de:"Deutsch", ja:"日本語", ru:"Русский", zh:"中文" };
const LEVELS = ["A1","A2","B1","B2","C1","C2"];
const LEVEL_COLORS: Record<string, string> = {
  A1:"#34C759", A2:"#30D158", B1:"#007AFF", B2:"#0A84FF", C1:"#AF52DE", C2:"#BF5AF2",
};
const ALL_INTERESTS = [
  "Música","Cine","Viajes","Deportes","Tecnología","Cocina",
  "Literatura","Arte","Gaming","Fotografía","Fitness","Anime",
  "Negocios","Ciencia","Historia","Naturaleza","Moda","Teatro",
];

// Tipo de conversación que le mostrás a tu compañero
const CONV_STYLES = [
  { key:"casual",     label:"Casual",        desc:"Charla libre, sin presión ni estructura",           icon:"chatbubble-outline"    },
  { key:"formal",     label:"Formal",        desc:"Trabajo, CV, situaciones académicas o serias",      icon:"briefcase-outline"     },
  { key:"cultural",   label:"Cultural",      desc:"Costumbres, tradiciones, cultura del país",         icon:"earth-outline"         },
  { key:"viajes",     label:"Viajes",        desc:"Planificar viajes, pedir indicaciones, turismo",    icon:"airplane-outline"      },
  { key:"negocios",   label:"Negocios",      desc:"Emails profesionales, reuniones, negociaciones",    icon:"stats-chart-outline"   },
  { key:"peliculas",  label:"Series y cine", desc:"Recomendar y debatir películas y series",           icon:"film-outline"          },
];

// Con quién querés practicar
const PARTNER_LEVELS = [
  { key:"any",      label:"Cualquier nivel", desc:"Lo que importa es practicar, el nivel no" },
  { key:"similar",  label:"Nivel similar",   desc:"Alguien parecido a donde estás vos ahora" },
  { key:"advanced", label:"Más avanzado",    desc:"Aprender de alguien con más experiencia"  },
  { key:"beginner", label:"Principiante",    desc:"Te gusta enseñar y ayudar a quien empieza"},
];

// Metas semanales
const GOALS_PER_WEEK = ["1","2","3","4","5","7"];

// Horarios disponibles para practicar
const AVAILABILITY_OPTIONS = ["Mañanas","Tardes","Noches","Fines de semana","Cualquier momento"];

// ─── UI base ─────────────────────────────────────────────────────────────────
function Divider({ colors }: { colors: any }) {
  return <View style={{ height:1, backgroundColor:colors.border, marginLeft:56 }} />;
}

function Row({
  icon, iconBg, label, sublabel, right, onPress,
  danger, first, last, colors, badge, noChevron,
}: {
  icon:string; iconBg:string; label:string; sublabel?:string;
  right?:React.ReactNode; onPress?:()=>void;
  danger?:boolean; first?:boolean; last?:boolean;
  colors:any; badge?:string; noChevron?:boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !right}
      style={({ pressed }) => ({
        flexDirection:"row", alignItems:"center",
        paddingHorizontal:16, paddingVertical:12, gap:13,
        backgroundColor: pressed && onPress ? colors.border+"55" : "transparent",
        borderTopLeftRadius: first?16:0, borderTopRightRadius: first?16:0,
        borderBottomLeftRadius: last?16:0, borderBottomRightRadius: last?16:0,
      })}
    >
      <View style={{
        width:34, height:34, borderRadius:9,
        backgroundColor: danger?"#FF375F":iconBg,
        alignItems:"center", justifyContent:"center",
        shadowColor: danger?"#FF375F":iconBg,
        shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:4, elevation:3,
      }}>
        <Ionicons name={icon as any} size={17} color="#fff" />
      </View>
      <View style={{ flex:1, gap:1 }}>
        <Text style={{ color:danger?"#FF375F":colors.fg, fontWeight:"600", fontSize:15 }}>{label}</Text>
        {sublabel && (
          <Text style={{ color:colors.fg, opacity:0.38, fontWeight:"500", fontSize:12 }} numberOfLines={2}>
            {sublabel}
          </Text>
        )}
      </View>
      {badge && (
        <View style={{ backgroundColor:colors.accent+"22", borderRadius:99, paddingHorizontal:8, paddingVertical:3 }}>
          <Text style={{ color:colors.accent, fontSize:11, fontWeight:"700" }}>{badge}</Text>
        </View>
      )}
      {right ?? (!noChevron && onPress
        ? <Ionicons name="chevron-forward" size={15} color={colors.fg} style={{ opacity:0.2 }} />
        : null)}
    </Pressable>
  );
}

function Group({ label, labelRight, children, colors }: {
  label?:string; labelRight?:string; children:React.ReactNode; colors:any;
}) {
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap:5 }}>
      {label && (
        <View style={{ flexDirection:"row", justifyContent:"space-between", paddingHorizontal:4 }}>
          <Text style={{ color:colors.fg, opacity:0.35, fontWeight:"700", fontSize:11, letterSpacing:1.3 }}>{label}</Text>
          {labelRight && <Text style={{ color:colors.accent, fontWeight:"700", fontSize:11 }}>{labelRight}</Text>}
        </View>
      )}
      <View style={{ borderRadius:16, borderWidth:1, borderColor:colors.border, backgroundColor:colors.card, overflow:"hidden" }}>
        {kids.map((child, i) => (
          <View key={i}>
            {child}
            {i < kids.length-1 && <Divider colors={colors} />}
          </View>
        ))}
      </View>
    </View>
  );
}

function Sheet({ visible, onClose, title, subtitle, children, colors }: {
  visible:boolean; onClose:()=>void; title:string; subtitle?:string;
  children:React.ReactNode; colors:any;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable onPress={onClose} style={{ flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"flex-end" }}>
        <Pressable onPress={()=>{}} style={{
          backgroundColor:colors.bg, borderTopLeftRadius:26, borderTopRightRadius:26,
          paddingBottom: Platform.OS==="ios"?36:24,
          borderTopWidth:1, borderColor:colors.border, maxHeight:"90%",
        }}>
          <View style={{ alignItems:"center", paddingVertical:12 }}>
            <View style={{ width:36, height:4, borderRadius:2, backgroundColor:colors.border }} />
          </View>
          <View style={{ paddingHorizontal:20, marginBottom:16 }}>
            <Text style={{ color:colors.fg, fontWeight:"900", fontSize:20 }}>{title}</Text>
            {subtitle && <Text style={{ color:colors.fg, opacity:0.38, fontWeight:"500", fontSize:13, marginTop:3 }}>{subtitle}</Text>}
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:8 }}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── PANTALLA PRINCIPAL ───────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { i18n } = useTranslation();
  const { colors, isDark, setMode } = useThemeMode();
  const router = useRouter();

  // Perfil
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername]       = useState("");
  const [bio, setBio]                 = useState("");
  const [country, setCountry]         = useState("");
  const [city, setCity]               = useState("");
  const [photoUri, setPhotoUri]       = useState<string|null>(null);
  const [nativeLang, setNativeLang]   = useState<LanguageCode|"">("");
  const [learning, setLearning]       = useState<LearningLang[]>([]);
  const [interests, setInterests]     = useState<string[]>([]);
  const [userEmail, setUserEmail]     = useState<string|null>(null);
  const [uiLang, setUiLang]           = useState<LanguageCode>("es");

  // Stats
  const [savedCount, setSavedCount]   = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);

  // ── PREFERENCIAS DE CONVERSACIÓN (se muestran en tu perfil público) ──────
  const [convStyle, setConvStyle]         = useState("casual");
  const [partnerLevel, setPartnerLevel]   = useState("any");
  const [availability, setAvailability]   = useState<string[]>(["Cualquier momento"]);
  const [wantsCorrection, setWantsCorrection] = useState(true);
  const [openToTeach, setOpenToTeach]     = useState(true); // dispuesto a enseñar también
  const [exchangeOnly, setExchangeOnly]   = useState(false); // solo intercambio real (no solo "aprendiz")

  // ── CONFIG DE CHATS ───────────────────────────────────────────────────────
  const [showTranslation, setShowTranslation]     = useState(true);
  const [autoPlayAudio, setAutoPlayAudio]         = useState(false);
  const [sendWithEnter, setSendWithEnter]         = useState(false);
  const [showReadReceipts, setShowReadReceipts]   = useState(true);
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [msgFontSize, setMsgFontSize]             = useState<"pequeño"|"normal"|"grande">("normal");
  const [bubbleStyle, setBubbleStyle]             = useState<"moderno"|"clásico">("moderno");
  const [chatBackground, setChatBackground]       = useState<"default"|"gradient"|"minimal">("default");

  // ── NOTIFICACIONES ────────────────────────────────────────────────────────
  const [notifMessages, setNotifMessages]   = useState(true);
  const [notifMatches, setNotifMatches]     = useState(true);
  const [notifReminder, setNotifReminder]   = useState(false);

  // ── PRIVACIDAD / VISIBILIDAD ──────────────────────────────────────────────
  const [showProfile, setShowProfile]       = useState(true);
  const [showLevel, setShowLevel]           = useState(true);
  const [showInterests, setShowInterests]   = useState(true);
  const [showLastSeen, setShowLastSeen]     = useState(false);
  const [showCity, setShowCity]             = useState(true);

  // ── META SEMANAL ──────────────────────────────────────────────────────────
  const [goalsPerWeek, setGoalsPerWeek]     = useState("3");

  // Modales
  const [modal, setModal] = useState<null|
    "editProfile"|"nativeLang"|"uiLang"|"convStyle"|"partnerLevel"|
    "goals"|"fontSize"|"bubbleStyle"|"chatBg"|"blocked"
  >(null);

  // Edit temporales
  const [tmpName, setTmpName]       = useState("");
  const [tmpUser, setTmpUser]       = useState("");
  const [tmpBio, setTmpBio]         = useState("");
  const [tmpCountry, setTmpCountry] = useState("");
  const [tmpCity, setTmpCity]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [blockedList, setBlockedList] = useState<string[]>([]);

  const load = useCallback(async () => {
    const l = (await getAppLanguage()) ?? "es";
    setUiLang(l as LanguageCode);
    const { data } = await supabase.auth.getUser();
    setUserEmail(data?.user?.email ?? null);
    const prof = await getProfile();
    setDisplayName(prof.displayName ?? "");
    setUsername(prof.username ?? "");
    setBio((prof as any).bio ?? "");
    setCountry(prof.country ?? "");
    setCity(prof.city ?? "");
    setPhotoUri((prof as any).photoUri ?? null);
    setNativeLang((prof.nativeLang ?? "") as any);
    setLearning(prof.languageLearning?.learn ?? []);
    setInterests(prof.interests ?? []);
    const saved = await getSavedMatches();
    setSavedCount(saved.length);
    const blocked = await getBlockedList();
    setBlockedCount(blocked.length);
    setBlockedList(blocked);
    // Cargar prefs guardadas
    const cs   = await AsyncStorage.getItem("pref_conv_style");    if (cs)  setConvStyle(cs);
    const pl   = await AsyncStorage.getItem("pref_partner_level"); if (pl)  setPartnerLevel(pl);
    const av   = await AsyncStorage.getItem("pref_availability");  if (av)  setAvailability(JSON.parse(av));
    const wc   = await AsyncStorage.getItem("pref_wants_correction"); if (wc !== null) setWantsCorrection(wc==="1");
    const ot   = await AsyncStorage.getItem("pref_open_to_teach"); if (ot !== null) setOpenToTeach(ot==="1");
    const eo   = await AsyncStorage.getItem("pref_exchange_only"); if (eo !== null) setExchangeOnly(eo==="1");
    const st   = await AsyncStorage.getItem("pref_show_translation"); if (st !== null) setShowTranslation(st==="1");
    const apa  = await AsyncStorage.getItem("pref_auto_play_audio"); if (apa !== null) setAutoPlayAudio(apa==="1");
    const swe  = await AsyncStorage.getItem("pref_send_with_enter"); if (swe !== null) setSendWithEnter(swe==="1");
    const srr  = await AsyncStorage.getItem("pref_read_receipts"); if (srr !== null) setShowReadReceipts(srr==="1");
    const sti  = await AsyncStorage.getItem("pref_typing_indicator"); if (sti !== null) setShowTypingIndicator(sti==="1");
    const fs   = await AsyncStorage.getItem("pref_font_size");     if (fs)  setMsgFontSize(fs as any);
    const bs   = await AsyncStorage.getItem("pref_bubble_style");  if (bs)  setBubbleStyle(bs as any);
    const cbg  = await AsyncStorage.getItem("pref_chat_bg");       if (cbg) setChatBackground(cbg as any);
    const gpw  = await AsyncStorage.getItem("pref_goals_week");    if (gpw) setGoalsPerWeek(gpw);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pref = async (key: string, val: string) => AsyncStorage.setItem(key, val);
  const tog  = async (key: string, val: boolean, setter: (v:boolean)=>void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(val); await pref(key, val?"1":"0");
  };

  const currentLang      = LANGS.find(l => l.code === uiLang);
  const currentConvStyle = CONV_STYLES.find(s => s.key === convStyle);
  const currentPartner   = PARTNER_LEVELS.find(p => p.key === partnerLevel);
  const initials         = displayName.slice(0,2).toUpperCase() || "?";

  const saveProfile = async () => {
    setSaving(true);
    await updateProfile({ displayName:tmpName.trim()||displayName, username:tmpUser.trim()||username, bio:tmpBio.trim(), country:tmpCountry.trim(), city:tmpCity.trim() } as any);
    await load(); setSaving(false); setModal(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleInterest = async (it: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = interests.includes(it) ? interests.filter(x=>x!==it) : [...interests, it];
    setInterests(next); await updateProfile({ interests: next });
  };

  const cycleLevel = async (lang: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = learning.map(l => l.lang!==lang ? l : { ...l, level: LEVELS[(LEVELS.indexOf(l.level??"A1")+1)%LEVELS.length] as any });
    setLearning(next); await updateProfile({ languageLearning: { learn: next } });
  };

  const logout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Cerrar sesión","¿Seguro que querés salir?",[
      { text:"Cancelar", style:"cancel" },
      { text:"Cerrar sesión", style:"destructive", onPress: async () => {
        await supabase.auth.signOut(); await setAuthOk(false); await setOnboardingDone(false);
        router.replace("/(auth)/login" as any);
      }},
    ]);
  };

  return (
    <View style={{ flex:1, backgroundColor:colors.bg }}>

      {/* ── HEADER ── */}
      <View style={{
        paddingTop: Platform.OS==="ios"?54:22, paddingHorizontal:20, paddingBottom:14,
        borderBottomWidth:1, borderBottomColor:colors.border,
      }}>
        <Text style={{ color:colors.fg, fontSize:26, fontWeight:"900" }}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding:16, gap:22, paddingBottom:80 }} showsVerticalScrollIndicator={false}>

        {/* ── HERO PERFIL ── */}
        <Pressable
          onPress={() => { setTmpName(displayName); setTmpUser(username); setTmpBio(bio); setTmpCountry(country); setTmpCity(city); setModal("editProfile"); }}
          style={{ backgroundColor:colors.card, borderRadius:20, borderWidth:1, borderColor:colors.border, padding:16, flexDirection:"row", alignItems:"center", gap:14 }}
        >
          <View style={{ width:68, height:68, borderRadius:34, borderWidth:2.5, borderColor:colors.accent, overflow:"hidden", backgroundColor:colors.accent+"25", alignItems:"center", justifyContent:"center" }}>
            {photoUri ? <Image source={{uri:photoUri}} style={{width:68,height:68}} resizeMode="cover"/> : <Text style={{color:colors.accent,fontSize:24,fontWeight:"900"}}>{initials}</Text>}
          </View>
          <View style={{ flex:1, gap:3 }}>
            <Text style={{color:colors.fg,fontWeight:"800",fontSize:18}} numberOfLines={1}>{displayName||"Tu perfil"}</Text>
            {username ? <Text style={{color:colors.accent,fontWeight:"600",fontSize:13}}>@{username}</Text> : null}
            <Text style={{color:colors.fg,opacity:0.35,fontWeight:"500",fontSize:12}} numberOfLines={1}>{userEmail??""}</Text>
            <View style={{ flexDirection:"row", gap:8, marginTop:4 }}>
              {nativeLang ? (
                <View style={{backgroundColor:colors.accentSoft,borderRadius:99,paddingHorizontal:8,paddingVertical:3}}>
                  <Text style={{color:colors.accent,fontWeight:"700",fontSize:11}}>{FLAGS[nativeLang]} {LANG_NAMES[nativeLang]}</Text>
                </View>
              ) : null}
              {learning.length>0 ? (
                <View style={{backgroundColor:colors.border,borderRadius:99,paddingHorizontal:8,paddingVertical:3}}>
                  <Text style={{color:colors.fg,opacity:0.55,fontWeight:"700",fontSize:11}}>
                    Aprende {learning.length} idioma{learning.length>1?"s":""}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={{paddingHorizontal:12,paddingVertical:6,borderRadius:99,borderWidth:1,borderColor:colors.border}}>
            <Text style={{color:colors.fg,fontWeight:"700",fontSize:12}}>Editar</Text>
          </View>
        </Pressable>

        {/* ── MIS IDIOMAS ── */}
        <Group label="MIS IDIOMAS" colors={colors}>
          <Row icon="mic-outline" iconBg="#FF9500" label="Idioma nativo"
            sublabel={nativeLang ? `${FLAGS[nativeLang]} ${LANG_NAMES[nativeLang]}` : "No configurado"}
            onPress={() => setModal("nativeLang")} first last={learning.length>0} colors={colors}
          />
          {learning.length > 0 && (
            <View style={{ paddingHorizontal:16, paddingVertical:12, gap:10 }}>
              <Text style={{color:colors.fg,opacity:0.35,fontSize:11,fontWeight:"700",letterSpacing:0.8}}>APRENDIENDO — tocá el nivel para subirlo</Text>
              {learning.map(l => {
                const lc = LEVEL_COLORS[l.level??"A1"] ?? colors.accent;
                return (
                  <View key={l.lang} style={{flexDirection:"row",alignItems:"center",gap:10}}>
                    <Text style={{fontSize:22}}>{FLAGS[l.lang]??"🌍"}</Text>
                    <View style={{flex:1}}>
                      <Text style={{color:colors.fg,fontWeight:"600",fontSize:14}}>{LANG_NAMES[l.lang]??l.lang}</Text>
                    </View>
                    <Pressable onPress={()=>cycleLevel(l.lang)} style={{backgroundColor:lc+"22",borderRadius:99,paddingHorizontal:12,paddingVertical:5,borderWidth:1,borderColor:lc+"55"}}>
                      <Text style={{color:lc,fontWeight:"800",fontSize:12}}>{l.level??"A1"}</Text>
                    </Pressable>
                  </View>
                );
              })}
              <Pressable onPress={()=>router.push("/onboarding" as any)}>
                <Text style={{color:colors.accent,fontWeight:"700",fontSize:13}}>+ Agregar idioma</Text>
              </Pressable>
            </View>
          )}
        </Group>

        {/* ════════════════════════════════════════════════════════
            CÓMO QUERÉS PRACTICAR — el corazón de la app
        ════════════════════════════════════════════════════════ */}
        <Group label="CÓMO QUERÉS PRACTICAR" labelRight="Visible en tu perfil" colors={colors}>

          {/* Tipo de conversación */}
          <Row icon={currentConvStyle?.icon as any ?? "chatbubble-outline"} iconBg="#007AFF"
            label="Tipo de conversación"
            sublabel={currentConvStyle ? `${currentConvStyle.label} — ${currentConvStyle.desc}` : ""}
            onPress={() => setModal("convStyle")} first last={false} colors={colors}
          />

          {/* Nivel del compañero */}
          <Row icon="people-outline" iconBg="#34C759"
            label="¿Con quién querés practicar?"
            sublabel={currentPartner ? `${currentPartner.label} — ${currentPartner.desc}` : ""}
            onPress={() => setModal("partnerLevel")} first={false} last={false} colors={colors}
          />

          {/* Disponibilidad */}
          <View style={{ paddingHorizontal:16, paddingVertical:13, gap:9 }}>
            <View style={{ flexDirection:"row", alignItems:"center", gap:13 }}>
              <View style={{width:34,height:34,borderRadius:9,backgroundColor:"#5E5CE6",alignItems:"center",justifyContent:"center",shadowColor:"#5E5CE6",shadowOffset:{width:0,height:2},shadowOpacity:0.3,shadowRadius:4,elevation:3}}>
                <Ionicons name="time-outline" size={17} color="#fff"/>
              </View>
              <View style={{flex:1}}>
                <Text style={{color:colors.fg,fontWeight:"600",fontSize:15}}>Cuándo estás disponible</Text>
                <Text style={{color:colors.fg,opacity:0.38,fontSize:12,fontWeight:"500"}}>
                  {availability.length>0 ? availability.join(", ") : "No especificado"}
                </Text>
              </View>
            </View>
            <View style={{flexDirection:"row",flexWrap:"wrap",gap:7,paddingLeft:47}}>
              {AVAILABILITY_OPTIONS.map(a => {
                const active = availability.includes(a);
                return (
                  <Pressable key={a} onPress={async()=>{
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const next = active ? availability.filter(x=>x!==a) : [...availability, a];
                    setAvailability(next); await pref("pref_availability", JSON.stringify(next));
                  }} style={{paddingHorizontal:11,paddingVertical:5,borderRadius:99,borderWidth:1,borderColor:active?"#5E5CE6":colors.border,backgroundColor:active?"#5E5CE622":"transparent"}}>
                    <Text style={{color:active?"#5E5CE6":colors.fg,fontWeight:active?"700":"500",fontSize:12}}>{a}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Acepto correcciones */}
          <Row icon="checkmark-circle-outline" iconBg="#FF9500"
            label="Acepto que me corrijan"
            sublabel={wantsCorrection ? "Tu compañero puede señalarte errores con amabilidad" : "Preferís practicar sin correcciones por ahora"}
            first={false} last={false} colors={colors}
            right={<Switch value={wantsCorrection} onValueChange={v=>tog("pref_wants_correction",v,setWantsCorrection)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />

          {/* Dispuesto a enseñar */}
          <Row icon="school-outline" iconBg="#FF9500"
            label="También quiero enseñar"
            sublabel={openToTeach ? "Además de aprender, te animás a ayudar a tu compañero" : "Solo estás buscando aprender por ahora"}
            first={false} last={false} colors={colors}
            right={<Switch value={openToTeach} onValueChange={v=>tog("pref_open_to_teach",v,setOpenToTeach)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />

          {/* Solo intercambio real */}
          <Row icon="swap-horizontal-outline" iconBg="#34C759"
            label="Solo intercambio bidireccional"
            sublabel={exchangeOnly ? "Buscás que ambos practiquen los idiomas del otro" : "Cualquier tipo de práctica está bien"}
            first={false} last colors={colors}
            right={<Switch value={exchangeOnly} onValueChange={v=>tog("pref_exchange_only",v,setExchangeOnly)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
        </Group>

        {/* ════════════════════════════════════════════════════════
            CONFIGURACIÓN DE CHATS
        ════════════════════════════════════════════════════════ */}
        <Group label="CONFIGURACIÓN DE CHATS" colors={colors}>

          {/* Traducción */}
          <Row icon="language-outline" iconBg="#007AFF"
            label="Traducción al toque"
            sublabel={showTranslation ? "Tocá cualquier palabra o frase para traducirla" : "Desactivada"}
            first last={false} colors={colors}
            right={<Switch value={showTranslation} onValueChange={v=>tog("pref_show_translation",v,setShowTranslation)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />

          {/* Reproducir audios */}
          <Row icon="headset-outline" iconBg="#AF52DE"
            label="Reproducir audios automático"
            sublabel={autoPlayAudio ? "Los mensajes de audio se reproducen solos al llegar" : "Tocás para reproducir"}
            first={false} last={false} colors={colors}
            right={<Switch value={autoPlayAudio} onValueChange={v=>tog("pref_auto_play_audio",v,setAutoPlayAudio)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />

          {/* Enter para enviar */}
          <Row icon="return-down-forward-outline" iconBg="#8E8E93"
            label="Enter para enviar"
            sublabel={sendWithEnter ? "Enter manda el mensaje (sin Shift)" : "Hay que tocar el botón enviar"}
            first={false} last={false} colors={colors}
            right={<Switch value={sendWithEnter} onValueChange={v=>tog("pref_send_with_enter",v,setSendWithEnter)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />

          {/* Confirmaciones de lectura */}
          <Row icon="checkmark-done-outline" iconBg="#34C759"
            label="Confirmaciones de lectura"
            sublabel={showReadReceipts ? "Tu compañero ve cuando leíste sus mensajes" : "Nadie ve si leíste o no"}
            first={false} last={false} colors={colors}
            right={<Switch value={showReadReceipts} onValueChange={v=>tog("pref_read_receipts",v,setShowReadReceipts)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />

          {/* Indicador de escritura */}
          <Row icon="ellipsis-horizontal-outline" iconBg="#8E8E93"
            label="Indicador de escritura"
            sublabel={showTypingIndicator ? "Ves cuando tu compañero está escribiendo" : "Desactivado"}
            first={false} last={false} colors={colors}
            right={<Switch value={showTypingIndicator} onValueChange={v=>tog("pref_typing_indicator",v,setShowTypingIndicator)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />

          {/* Tamaño de fuente */}
          <Row icon="text-outline" iconBg="#FF9500"
            label="Tamaño de texto"
            sublabel={msgFontSize === "pequeño" ? "Pequeño" : msgFontSize === "grande" ? "Grande" : "Normal (por defecto)"}
            onPress={() => setModal("fontSize")}
            first={false} last={false} colors={colors}
          />

          {/* Estilo de burbujas */}
          <Row icon="chatbubbles-outline" iconBg="#5E5CE6"
            label="Estilo de burbujas"
            sublabel={bubbleStyle === "moderno" ? "Moderno — bordes redondeados y sombras" : "Clásico — estilo simple y limpio"}
            onPress={() => setModal("bubbleStyle")}
            first={false} last={false} colors={colors}
          />

          {/* Fondo del chat */}
          <Row icon="image-outline" iconBg="#5E5CE6"
            label="Fondo del chat"
            sublabel={chatBackground === "gradient" ? "Gradiente suave" : chatBackground === "minimal" ? "Minimal — sin textura" : "Por defecto"}
            onPress={() => setModal("chatBg")}
            first={false} last colors={colors}
          />
        </Group>

        {/* ── META SEMANAL ── */}
        <Group label="META DE PRÁCTICA" colors={colors}>
          <Row icon="trophy-outline" iconBg="#FF9500"
            label="Sesiones por semana"
            sublabel={`Meta: ${goalsPerWeek} sesión${Number(goalsPerWeek)>1?"es":""} con personas reales`}
            onPress={() => setModal("goals")}
            badge={`${goalsPerWeek}×`}
            first last={false} colors={colors}
          />
          <Row icon="alarm-outline" iconBg="#FF9500"
            label="Recordatorio diario"
            sublabel={notifReminder ? "Te avisamos para que no pierdas el ritmo" : "Sin recordatorios"}
            first={false} last colors={colors}
            right={<Switch value={notifReminder} onValueChange={v=>tog("pref_notif_reminder",v,setNotifReminder)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
        </Group>

        {/* ── INTERESES ── */}
        <Group label={`INTERESES — mejoran tu compatibilidad`} labelRight={`${interests.length} seleccionados`} colors={colors}>
          <View style={{ padding:16, gap:10 }}>
            <Text style={{color:colors.fg,opacity:0.38,fontSize:12,fontWeight:"500"}}>
              Los usamos para encontrarte compañeros que compartan tus hobbies
            </Text>
            <View style={{flexDirection:"row",flexWrap:"wrap",gap:7}}>
              {ALL_INTERESTS.map(it => {
                const active = interests.includes(it);
                return (
                  <Pressable key={it} onPress={()=>toggleInterest(it)} style={{paddingHorizontal:12,paddingVertical:6,borderRadius:99,borderWidth:1,borderColor:active?colors.accent:colors.border,backgroundColor:active?colors.accentSoft:"transparent"}}>
                    <Text style={{color:active?colors.accent:colors.fg,fontWeight:active?"700":"500",fontSize:13}}>{it}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Group>

        {/* ── VISIBILIDAD EN LA APP ── */}
        <Group label="TU VISIBILIDAD" colors={colors}>
          <Row icon="globe-outline" iconBg="#AF52DE" label="Aparecer en el descubridor"
            sublabel="Otros usuarios pueden encontrarte y escribirte"
            first last={false} colors={colors}
            right={<Switch value={showProfile} onValueChange={v=>tog("pref_show_profile",v,setShowProfile)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
          <Row icon="ribbon-outline" iconBg="#AF52DE" label="Mostrar mi nivel de idioma"
            sublabel="Tu nivel A1–C2 aparece en el perfil público"
            first={false} last={false} colors={colors}
            right={<Switch value={showLevel} onValueChange={v=>tog("pref_show_level",v,setShowLevel)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
          <Row icon="heart-outline" iconBg="#AF52DE" label="Mostrar intereses"
            sublabel="Tus hobbies aparecen en tu perfil"
            first={false} last={false} colors={colors}
            right={<Switch value={showInterests} onValueChange={v=>tog("pref_show_interests",v,setShowInterests)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
          <Row icon="location-outline" iconBg="#AF52DE" label="Mostrar ciudad"
            sublabel="Otros ven tu ciudad para conectar con personas cercanas"
            first={false} last={false} colors={colors}
            right={<Switch value={showCity} onValueChange={v=>tog("pref_show_city",v,setShowCity)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
          <Row icon="time-outline" iconBg="#AF52DE" label="Mostrar última conexión"
            first={false} last colors={colors}
            right={<Switch value={showLastSeen} onValueChange={v=>tog("pref_show_lastseen",v,setShowLastSeen)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
        </Group>

        {/* ── NOTIFICACIONES ── */}
        <Group label="NOTIFICACIONES" colors={colors}>
          <Row icon="chatbubble-outline" iconBg="#34C759" label="Mensajes nuevos"
            sublabel="Cuando alguien te escriba"
            first last={false} colors={colors}
            right={<Switch value={notifMessages} onValueChange={v=>tog("pref_notif_messages",v,setNotifMessages)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
          <Row icon="people-outline" iconBg="#FF9500" label="Nuevas conexiones"
            sublabel="Cuando alguien quiera practicar con vos"
            first={false} last colors={colors}
            right={<Switch value={notifMatches} onValueChange={v=>tog("pref_notif_matches",v,setNotifMatches)} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
        </Group>

        {/* ── APARIENCIA ── */}
        <Group label="APARIENCIA" colors={colors}>
          <Row icon={isDark?"moon":"sunny"} iconBg={isDark?"#5E5CE6":"#FF9500"} label="Tema"
            sublabel={isDark?"Modo oscuro":"Modo claro"}
            first last={false} colors={colors}
            right={<Switch value={isDark} onValueChange={async()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);await setMode(isDark?"light":"dark");}} trackColor={{false:colors.border,true:colors.accent}} thumbColor="#fff"/>}
          />
          <Row icon="language-outline" iconBg="#007AFF" label="Idioma de la app"
            sublabel={currentLang ? `${currentLang.flag} ${currentLang.label}` : uiLang}
            onPress={() => setModal("uiLang")} first={false} last colors={colors}
          />
        </Group>

        {/* ── SEGURIDAD ── */}
        <Group label="SEGURIDAD" colors={colors}>
          <Row icon="bookmark-outline" iconBg="#007AFF" label="Perfiles guardados"
            sublabel={`${savedCount} guardados`}
            onPress={() => router.push("/(tabs)/matches" as any)}
            first last={false} colors={colors}
          />
          <Row icon="ban-outline" iconBg="#FF375F" label="Usuarios bloqueados"
            sublabel={blockedCount > 0 ? `${blockedCount} bloqueado${blockedCount>1?"s":""}` : "Ninguno"}
            onPress={() => setModal("blocked")}
            first={false} last={false} colors={colors}
          />
          <Row icon="trash-outline" iconBg="#8E8E93" label="Limpiar historial de chats"
            sublabel="Borra mensajes guardados localmente"
            onPress={() => Alert.alert("Limpiar chats","¿Borrás todo el historial local?",[
              {text:"Cancelar",style:"cancel"},
              {text:"Limpiar",style:"destructive",onPress:async()=>{await clearAll();Alert.alert("Listo","Historial eliminado.");}}
            ])}
            first={false} last colors={colors}
          />
        </Group>

        {/* ── SESIÓN ── */}
        <Group colors={colors}>
          <Row icon="log-out-outline" iconBg="#FF375F" label="Cerrar sesión" danger onPress={logout} first last colors={colors}/>
        </Group>

        <View style={{alignItems:"center",gap:3,paddingVertical:6}}>
          <Text style={{color:colors.fg,opacity:0.12,fontWeight:"900",fontSize:14,letterSpacing:2}}>AMISTAD</Text>
          <Text style={{color:colors.fg,opacity:0.1,fontWeight:"600",fontSize:11}}>Conectá · Practicá · Aprendé</Text>
        </View>
      </ScrollView>

      {/* ══════════ MODALES ══════════════════════════════════════════════════ */}

      {/* Editar perfil */}
      <Sheet visible={modal==="editProfile"} onClose={()=>setModal(null)} title="Editar perfil" colors={colors}>
        <View style={{gap:14,paddingBottom:8}}>
          {[
            {label:"Nombre",  val:tmpName,    set:setTmpName,    ph:displayName||"Tu nombre"     },
            {label:"Usuario", val:tmpUser,    set:setTmpUser,    ph:username||"usuario123"        },
            {label:"País",    val:tmpCountry, set:setTmpCountry, ph:country||"Argentina"          },
            {label:"Ciudad",  val:tmpCity,    set:setTmpCity,    ph:city||"Buenos Aires"          },
          ].map(f=>(
            <View key={f.label} style={{gap:5}}>
              <Text style={{color:colors.fg,opacity:0.45,fontWeight:"700",fontSize:11,letterSpacing:0.8}}>{f.label.toUpperCase()}</Text>
              <TextInput value={f.val} onChangeText={f.set} placeholder={f.ph} placeholderTextColor={colors.fg+"33"}
                style={{backgroundColor:colors.card,borderRadius:12,borderWidth:1,borderColor:colors.border,paddingHorizontal:14,paddingVertical:11,color:colors.fg,fontWeight:"600",fontSize:15}}/>
            </View>
          ))}
          <View style={{gap:5}}>
            <Text style={{color:colors.fg,opacity:0.45,fontWeight:"700",fontSize:11,letterSpacing:0.8}}>BIO</Text>
            <TextInput value={tmpBio} onChangeText={setTmpBio} placeholder={bio||"Contá algo sobre vos…"} placeholderTextColor={colors.fg+"33"}
              multiline numberOfLines={3}
              style={{backgroundColor:colors.card,borderRadius:12,borderWidth:1,borderColor:colors.border,paddingHorizontal:14,paddingVertical:11,color:colors.fg,fontWeight:"500",fontSize:15,minHeight:80,textAlignVertical:"top"}}/>
          </View>
          <Pressable onPress={saveProfile} disabled={saving} style={{backgroundColor:colors.accent,borderRadius:14,paddingVertical:14,alignItems:"center"}}>
            {saving ? <ActivityIndicator color="#fff"/> : <Text style={{color:"#fff",fontWeight:"800",fontSize:16}}>Guardar cambios</Text>}
          </Pressable>
        </View>
      </Sheet>

      {/* Idioma nativo */}
      <Sheet visible={modal==="nativeLang"} onClose={()=>setModal(null)} title="Idioma nativo" subtitle="El idioma que hablás con fluidez" colors={colors}>
        <View style={{borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,overflow:"hidden",marginBottom:8}}>
          {LANGS.map((l,i)=>{
            const active = l.code === nativeLang;
            return (
              <View key={l.code}>
                <Pressable onPress={async()=>{setNativeLang(l.code);await updateProfile({nativeLang:l.code});setModal(null);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                  style={({pressed})=>({flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingVertical:13,gap:12,backgroundColor:active?colors.accentSoft:pressed?colors.border+"55":"transparent"})}>
                  <Text style={{fontSize:26}}>{l.flag}</Text>
                  <View style={{flex:1}}>
                    <Text style={{color:active?colors.accent:colors.fg,fontWeight:"700",fontSize:15}}>{l.label}</Text>
                    <Text style={{color:colors.fg,opacity:0.3,fontSize:12}}>{l.local}</Text>
                  </View>
                  {active && <View style={{width:22,height:22,borderRadius:11,backgroundColor:colors.accent,alignItems:"center",justifyContent:"center"}}><Ionicons name="checkmark" size={14} color="#fff"/></View>}
                </Pressable>
                {i<LANGS.length-1 && <View style={{height:1,backgroundColor:colors.border,marginLeft:56}}/>}
              </View>
            );
          })}
        </View>
      </Sheet>

      {/* Idioma UI */}
      <Sheet visible={modal==="uiLang"} onClose={()=>setModal(null)} title="Idioma de la app" subtitle="El idioma en que ves la interfaz" colors={colors}>
        <View style={{borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,overflow:"hidden",marginBottom:8}}>
          {LANGS.map((l,i)=>{
            const active = l.code === uiLang;
            return (
              <View key={l.code}>
                <Pressable onPress={async()=>{setUiLang(l.code);await setAppLanguage(l.code);await i18n.changeLanguage(l.code);setModal(null);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                  style={({pressed})=>({flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingVertical:13,gap:12,backgroundColor:active?colors.accentSoft:pressed?colors.border+"55":"transparent"})}>
                  <Text style={{fontSize:26}}>{l.flag}</Text>
                  <View style={{flex:1}}>
                    <Text style={{color:active?colors.accent:colors.fg,fontWeight:"700",fontSize:15}}>{l.label}</Text>
                    <Text style={{color:colors.fg,opacity:0.3,fontSize:12}}>{l.local}</Text>
                  </View>
                  {active && <View style={{width:22,height:22,borderRadius:11,backgroundColor:colors.accent,alignItems:"center",justifyContent:"center"}}><Ionicons name="checkmark" size={14} color="#fff"/></View>}
                </Pressable>
                {i<LANGS.length-1 && <View style={{height:1,backgroundColor:colors.border,marginLeft:56}}/>}
              </View>
            );
          })}
        </View>
      </Sheet>

      {/* Tipo de conversación */}
      <Sheet visible={modal==="convStyle"} onClose={()=>setModal(null)} title="Tipo de conversación" subtitle="¿Para qué querés usar el idioma?" colors={colors}>
        <View style={{gap:8,marginBottom:8}}>
          {CONV_STYLES.map(s=>{
            const active = s.key === convStyle;
            return (
              <Pressable key={s.key} onPress={async()=>{setConvStyle(s.key);await pref("pref_conv_style",s.key);setModal(null);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                style={{flexDirection:"row",alignItems:"center",gap:14,padding:14,borderRadius:14,borderWidth:1,borderColor:active?colors.accent:colors.border,backgroundColor:active?colors.accentSoft:colors.card}}>
                <View style={{width:42,height:42,borderRadius:12,backgroundColor:active?colors.accent:colors.border+"88",alignItems:"center",justifyContent:"center"}}>
                  <Ionicons name={s.icon as any} size={20} color={active?"#fff":colors.fg} style={{opacity:active?1:0.5}}/>
                </View>
                <View style={{flex:1}}>
                  <Text style={{color:active?colors.accent:colors.fg,fontWeight:"700",fontSize:15}}>{s.label}</Text>
                  <Text style={{color:colors.fg,opacity:0.4,fontSize:12,fontWeight:"500"}}>{s.desc}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={colors.accent}/>}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* Nivel del compañero */}
      <Sheet visible={modal==="partnerLevel"} onClose={()=>setModal(null)} title="¿Con quién querés practicar?" subtitle="Afecta las sugerencias del descubridor" colors={colors}>
        <View style={{borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,overflow:"hidden",marginBottom:8}}>
          {PARTNER_LEVELS.map((p,i)=>{
            const active = p.key === partnerLevel;
            return (
              <View key={p.key}>
                <Pressable onPress={async()=>{setPartnerLevel(p.key);await pref("pref_partner_level",p.key);setModal(null);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                  style={({pressed})=>({flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingVertical:14,gap:12,backgroundColor:active?colors.accentSoft:pressed?colors.border+"55":"transparent"})}>
                  <View style={{flex:1}}>
                    <Text style={{color:active?colors.accent:colors.fg,fontWeight:"700",fontSize:15}}>{p.label}</Text>
                    <Text style={{color:colors.fg,opacity:0.4,fontSize:12,fontWeight:"500"}}>{p.desc}</Text>
                  </View>
                  {active && <View style={{width:22,height:22,borderRadius:11,backgroundColor:colors.accent,alignItems:"center",justifyContent:"center"}}><Ionicons name="checkmark" size={14} color="#fff"/></View>}
                </Pressable>
                {i<PARTNER_LEVELS.length-1 && <View style={{height:1,backgroundColor:colors.border,marginLeft:16}}/>}
              </View>
            );
          })}
        </View>
      </Sheet>

      {/* Meta semanal */}
      <Sheet visible={modal==="goals"} onClose={()=>setModal(null)} title="Meta semanal" subtitle="¿Cuántas sesiones reales querés tener por semana?" colors={colors}>
        <View style={{flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:8}}>
          {GOALS_PER_WEEK.map(g=>{
            const active = g === goalsPerWeek;
            return (
              <Pressable key={g} onPress={async()=>{setGoalsPerWeek(g);await pref("pref_goals_week",g);setModal(null);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                style={{flex:1,minWidth:80,paddingVertical:20,borderRadius:16,borderWidth:1,borderColor:active?colors.accent:colors.border,backgroundColor:active?colors.accentSoft:colors.card,alignItems:"center",gap:4}}>
                <Text style={{color:active?colors.accent:colors.fg,fontWeight:"900",fontSize:28}}>{g}</Text>
                <Text style={{color:active?colors.accent:colors.fg,opacity:active?0.7:0.35,fontSize:11,fontWeight:"600"}}>{g==="1"?"vez":"veces"}/sem</Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* Tamaño de fuente */}
      <Sheet visible={modal==="fontSize"} onClose={()=>setModal(null)} title="Tamaño de texto en chats" colors={colors}>
        <View style={{borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,overflow:"hidden",marginBottom:8}}>
          {(["pequeño","normal","grande"] as const).map((s,i)=>{
            const active = s === msgFontSize;
            const labels = {pequeño:"Pequeño",normal:"Normal",grande:"Grande"};
            const sizes  = {pequeño:13,normal:15,grande:17};
            return (
              <View key={s}>
                <Pressable onPress={async()=>{setMsgFontSize(s);await pref("pref_font_size",s);setModal(null);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                  style={({pressed})=>({flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingVertical:14,gap:12,backgroundColor:active?colors.accentSoft:pressed?colors.border+"55":"transparent"})}>
                  <Text style={{color:active?colors.accent:colors.fg,fontWeight:"600",fontSize:sizes[s],flex:1}}>Hola, ¿cómo estás? — {labels[s]}</Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color={colors.accent}/>}
                </Pressable>
                {i<2 && <View style={{height:1,backgroundColor:colors.border}}/>}
              </View>
            );
          })}
        </View>
      </Sheet>

      {/* Estilo de burbuja */}
      <Sheet visible={modal==="bubbleStyle"} onClose={()=>setModal(null)} title="Estilo de burbujas" colors={colors}>
        <View style={{gap:10,marginBottom:8}}>
          {([
            {key:"moderno",label:"Moderno",desc:"Bordes muy redondeados, sombras suaves"},
            {key:"clásico",label:"Clásico",desc:"Simple, bordes menos pronunciados"},
          ] as const).map(s=>{
            const active = s.key === bubbleStyle;
            return (
              <Pressable key={s.key} onPress={async()=>{setBubbleStyle(s.key as any);await pref("pref_bubble_style",s.key);setModal(null);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                style={{padding:16,borderRadius:14,borderWidth:1,borderColor:active?colors.accent:colors.border,backgroundColor:active?colors.accentSoft:colors.card,gap:10}}>
                <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}}>
                  <Text style={{color:active?colors.accent:colors.fg,fontWeight:"700",fontSize:15}}>{s.label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color={colors.accent}/>}
                </View>
                {/* Preview burbuja */}
                <View style={{flexDirection:"row",gap:8,alignItems:"flex-end"}}>
                  <View style={{backgroundColor:colors.border,padding:10,maxWidth:"70%",borderRadius:s.key==="moderno"?18:8,borderBottomLeftRadius:s.key==="moderno"?4:2}}>
                    <Text style={{color:colors.fg,fontSize:13}}>¡Hola! ¿Cómo estás? 😊</Text>
                  </View>
                </View>
                <View style={{flexDirection:"row",gap:8,justifyContent:"flex-end"}}>
                  <View style={{backgroundColor:colors.accent,padding:10,maxWidth:"70%",borderRadius:s.key==="moderno"?18:8,borderBottomRightRadius:s.key==="moderno"?4:2}}>
                    <Text style={{color:"#fff",fontSize:13}}>¡Todo bien! ¿Y vos?</Text>
                  </View>
                </View>
                <Text style={{color:colors.fg,opacity:0.35,fontSize:11,fontWeight:"500"}}>{s.desc}</Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* Fondo del chat */}
      <Sheet visible={modal==="chatBg"} onClose={()=>setModal(null)} title="Fondo del chat" colors={colors}>
        <View style={{gap:10,marginBottom:8}}>
          {([
            {key:"default", label:"Por defecto", desc:"Fondo sólido según el tema"},
            {key:"gradient",label:"Gradiente",   desc:"Gradiente suave en el fondo"},
            {key:"minimal", label:"Minimal",     desc:"Fondo liso sin textura"},
          ] as const).map(bg=>{
            const active = bg.key === chatBackground;
            const getBg = () => {
              if(bg.key==="gradient") return {background:isDark?"#0B0D12":"#F0F4FF"};
              if(bg.key==="minimal") return {background:isDark?"#000":"#fff"};
              return {background:colors.bg};
            };
            return (
              <Pressable key={bg.key} onPress={async()=>{setChatBackground(bg.key as any);await pref("pref_chat_bg",bg.key);setModal(null);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                style={{borderRadius:14,borderWidth:1,borderColor:active?colors.accent:colors.border,overflow:"hidden"}}>
                <View style={{height:70,backgroundColor:getBg().background,padding:10,justifyContent:"flex-end",alignItems:"flex-end"}}>
                  <View style={{backgroundColor:colors.accent,paddingHorizontal:10,paddingVertical:6,borderRadius:12}}><Text style={{color:"#fff",fontSize:12}}>Hola 👋</Text></View>
                </View>
                <View style={{padding:12,flexDirection:"row",justifyContent:"space-between",alignItems:"center",backgroundColor:active?colors.accentSoft:colors.card}}>
                  <View>
                    <Text style={{color:active?colors.accent:colors.fg,fontWeight:"700",fontSize:14}}>{bg.label}</Text>
                    <Text style={{color:colors.fg,opacity:0.38,fontSize:11}}>{bg.desc}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={colors.accent}/>}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* Usuarios bloqueados */}
      <Sheet visible={modal==="blocked"} onClose={()=>setModal(null)} title="Usuarios bloqueados" subtitle={blockedList.length>0?`${blockedList.length} bloqueado${blockedList.length>1?"s":""}`:"No bloqueaste a nadie"} colors={colors}>
        {blockedList.length === 0 ? (
          <View style={{alignItems:"center",padding:32,gap:10}}>
            <Ionicons name="shield-checkmark-outline" size={48} color={colors.accent} style={{opacity:0.5}}/>
            <Text style={{color:colors.fg,opacity:0.45,fontWeight:"600",textAlign:"center"}}>No bloqueaste a nadie todavía</Text>
          </View>
        ) : (
          <View style={{borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,overflow:"hidden",marginBottom:8}}>
            {blockedList.map((uid,i)=>(
              <View key={uid}>
                <View style={{flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingVertical:13,gap:12}}>
                  <View style={{width:36,height:36,borderRadius:18,backgroundColor:colors.border,alignItems:"center",justifyContent:"center"}}>
                    <Ionicons name="person-outline" size={18} color={colors.fg} style={{opacity:0.4}}/>
                  </View>
                  <Text style={{flex:1,color:colors.fg,fontWeight:"600",fontSize:14}} numberOfLines={1}>{uid}</Text>
                  <Pressable onPress={async()=>{
                    const raw = await AsyncStorage.getItem("blocked");
                    const list: string[] = raw ? JSON.parse(raw) : [];
                    const next = list.filter(x=>x!==uid);
                    await AsyncStorage.setItem("blocked", JSON.stringify(next));
                    setBlockedList(next); setBlockedCount(next.length);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }} style={{paddingHorizontal:12,paddingVertical:5,borderRadius:99,borderWidth:1,borderColor:"#FF375F22",backgroundColor:"#FF375F11"}}>
                    <Text style={{color:"#FF375F",fontWeight:"700",fontSize:12}}>Desbloquear</Text>
                  </Pressable>
                </View>
                {i<blockedList.length-1 && <View style={{height:1,backgroundColor:colors.border,marginLeft:64}}/>}
              </View>
            ))}
          </View>
        )}
      </Sheet>

    </View>
  );
}