// app/onboarding.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Easing, Image, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, Text, TextInput, View, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useThemeMode } from "@/src/theme";
import {
  getProfile, setOnboardingDone, updateProfile,
  type LanguageCode, type LanguageGoal, type LanguageLevel, type LearningLang,
} from "@/src/storage";
import { upsertMyProfile } from "@/src/storage/profilesStorage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import CountryPickerModal from "@/src/components/CountryPickerModal";

const { width: SW } = Dimensions.get("window");

// ─── Datos ────────────────────────────────────────────────────────────────────
const LEARN_LANGS: { code: LanguageCode; label: string; flag: string; native: string }[] = [
  { code: "en", label: "Inglés",   flag: "🇺🇸", native: "English"  },
  { code: "es", label: "Español",  flag: "🇦🇷", native: "Español"  },
  { code: "de", label: "Alemán",   flag: "🇩🇪", native: "Deutsch"  },
  { code: "ja", label: "Japonés",  flag: "🇯🇵", native: "日本語"   },
  { code: "ru", label: "Ruso",     flag: "🇷🇺", native: "Русский"  },
  { code: "zh", label: "Chino",    flag: "🇨🇳", native: "中文"     },
];

const LEVELS: LanguageLevel[] = ["A1","A2","B1","B2","C1","C2"];
const LEVEL_DESC: Record<string, string> = {
  A1: "Principiante — entendo muy poco",
  A2: "Básico — frases simples",
  B1: "Intermedio — me defiendo",
  B2: "Intermedio alto — conversación fluida",
  C1: "Avanzado — casi sin esfuerzo",
  C2: "Nativo — dominio total",
};
const LEVEL_COLORS: Record<string, string> = {
  A1:"#34C759", A2:"#30D158", B1:"#007AFF", B2:"#0A84FF", C1:"#AF52DE", C2:"#BF5AF2",
};

const INTERESTS_LIST = [
  { label:"Viajes",       icon:"airplane-outline"        },
  { label:"Música",       icon:"musical-notes-outline"   },
  { label:"Cine",         icon:"film-outline"            },
  { label:"Arte",         icon:"color-palette-outline"   },
  { label:"Historia",     icon:"library-outline"         },
  { label:"Tecnología",   icon:"hardware-chip-outline"   },
  { label:"Gaming",       icon:"game-controller-outline" },
  { label:"Deportes",     icon:"football-outline"        },
  { label:"Gastronomía",  icon:"restaurant-outline"      },
  { label:"Fotografía",   icon:"camera-outline"          },
  { label:"Libros",       icon:"book-outline"            },
  { label:"Fitness",      icon:"barbell-outline"         },
  { label:"Trading",      icon:"stats-chart-outline"     },
  { label:"Diseño",       icon:"brush-outline"           },
  { label:"Naturaleza",   icon:"leaf-outline"            },
  { label:"Podcasts",     icon:"mic-outline"             },
];

const GOALS: { key: LanguageGoal; label: string; desc: string; icon: string; color: string }[] = [
  {
    key: "Amistad",
    label: "Hacer amigos",
    desc: "Conectar con personas de todo el mundo con quien compartir el día a día",
    icon: "people-outline",
    color: "#007AFF",
  },
  {
    key: "Intercambio",
    label: "Intercambio de idiomas",
    desc: "Practicar juntos — vos le enseñás tu idioma y ellos te enseñan el suyo",
    icon: "swap-horizontal-outline",
    color: "#34C759",
  },
];

// ─── Pasos ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "welcome",    title: "Bienvenido a Amistad",   sub: "El lugar donde el idioma se aprende hablando" },
  { id: "name",       title: "¿Cómo te llamás?",       sub: "Tu nombre o apodo — lo que quieras mostrar"   },
  { id: "country",    title: "¿De dónde sos?",         sub: "Para conectarte con personas cercanas y lejanas" },
  { id: "native",     title: "¿Qué idioma hablás?",    sub: "El idioma que dominás con fluidez"             },
  { id: "learning",   title: "¿Qué querés aprender?",  sub: "Podés agregar más de uno"                      },
  { id: "level",      title: "¿Cuál es tu nivel?",     sub: "Sé honesto, nadie te juzga"                    },
  { id: "goal",       title: "¿Qué buscás?",           sub: "Podés cambiar esto cuando quieras"             },
  { id: "interests",  title: "¿Qué te gusta?",         sub: "Conectamos mejor cuando compartimos intereses" },
  { id: "bio",        title: "Contate en pocas palabras", sub: "Opcional — pero suma mucho"                 },
  { id: "done",       title: "¡Todo listo!",            sub: "Ya podés empezar a conectar"                  },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, total, colors }: { step: number; total: number; colors: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: step / (total - 1),
      duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [step]);
  return (
    <View style={{ height: 3, backgroundColor: colors.border, borderRadius: 2, marginHorizontal: 20, marginTop: 8 }}>
      <Animated.View style={{
        height: 3, borderRadius: 2, backgroundColor: colors.accent,
        width: anim.interpolate({ inputRange:[0,1], outputRange:["0%","100%"] }),
      }} />
    </View>
  );
}

// ─── Chip de idioma ───────────────────────────────────────────────────────────
function LangChip({ lang, active, onPress, colors }: { lang: typeof LEARN_LANGS[0]; active: boolean; onPress: ()=>void; colors: any }) {
  return (
    <Pressable onPress={onPress} style={{
      flexDirection:"row", alignItems:"center", gap:8,
      paddingVertical:12, paddingHorizontal:16, borderRadius:14,
      borderWidth:1.5,
      borderColor: active ? colors.accent : colors.border,
      backgroundColor: active ? colors.accentSoft : colors.card,
      flex:1, minWidth: (SW - 56) / 2,
    }}>
      <Text style={{ fontSize:24 }}>{lang.flag}</Text>
      <View style={{ flex:1 }}>
        <Text style={{ color: active?colors.accent:colors.fg, fontWeight:"700", fontSize:15 }}>{lang.label}</Text>
        <Text style={{ color: active?colors.accent:colors.fg, opacity:0.5, fontSize:12, fontWeight:"500" }}>{lang.native}</Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
    </Pressable>
  );
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const router  = useRouter();
  const { colors, isDark } = useThemeMode();

  const [step,          setStep]          = useState(0);
  const [displayName,   setDisplayName]   = useState("");
  const [username,      setUsername]      = useState("");
  const [bio,           setBio]           = useState("");
  const [country,       setCountry]       = useState("");
  const [city,          setCity]          = useState("");
  const [nativeLang,    setNativeLang]    = useState<LanguageCode|null>(null);
  const [goal,          setGoal]          = useState<LanguageGoal>("Amistad");
  const [learn,         setLearn]         = useState<LearningLang[]>([]);
  const [selectedLang,  setSelectedLang]  = useState<LanguageCode|null>(null);
  const [interests,     setInterests]     = useState<string[]>([]);
  const [countryModal,  setCountryModal]  = useState(false);

  const slideAnim  = useRef(new Animated.Value(0)).current;
  const opacAnim   = useRef(new Animated.Value(1)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setCountry((p as any).country ?? "");
      setCity((p as any).city ?? "");
      setDisplayName(p.displayName ?? "");
      setUsername(p.username ?? "");
      setBio((p as any).bio ?? "");
      setInterests(p.interests ?? []);
      const saved = p.languageLearning?.learn ?? [];
      setLearn(saved);
      setGoal((p.languageLearning?.goal ?? "Amistad") as LanguageGoal);
      setSelectedLang(saved[0]?.lang ?? null);
      setNativeLang((p.nativeLang ?? null) as any);
    })();
  }, []);

  const animateStep = (dir: 1 | -1, cb: () => void) => {
    Animated.parallel([
      Animated.timing(opacAnim, { toValue:0, duration:120, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue: -30*dir, duration:120, useNativeDriver:true }),
    ]).start(() => {
      slideAnim.setValue(30*dir); cb();
      Animated.parallel([
        Animated.timing(opacAnim, { toValue:1, duration:220, useNativeDriver:true }),
        Animated.timing(slideAnim, { toValue:0, duration:220, easing:Easing.out(Easing.cubic), useNativeDriver:true }),
      ]).start();
    });
  };

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) animateStep(1, () => setStep(s => s+1));
    else finish();
  };

  const goBack = () => {
    if (step === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateStep(-1, () => setStep(s => s-1));
  };

  const toggleLang = (code: LanguageCode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLearn(prev => {
      const exists = prev.some(x => x.lang === code);
      if (exists) {
        const next = prev.filter(x => x.lang !== code);
        if (selectedLang === code) setSelectedLang(next[0]?.lang ?? null);
        return next;
      }
      const next = [...prev, { lang: code, level: null }];
      if (!selectedLang) setSelectedLang(code);
      return next;
    });
  };

  const toggleInterest = (item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInterests(prev => prev.includes(item) ? prev.filter(x=>x!==item) : [...prev, item]);
  };

  const setLevelForSelected = (lvl: LanguageLevel) => {
    if (!selectedLang) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLearn(prev => prev.map(x => x.lang===selectedLang ? {...x, level:lvl} : x));
  };

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile({
      displayName: displayName.trim() || undefined,
      username: username.trim() || undefined,
      country: country.trim() || undefined,
      city: city.trim() || undefined,
      bio: bio.trim() || undefined,
      nativeLang: nativeLang ?? undefined,
      interests,
      languageLearning: { learn, goal },
    } as any);
    await upsertMyProfile({
      displayName: displayName.trim() || undefined,
      username: username.trim() || undefined,
      country: country.trim() || undefined,
      city: city.trim() || undefined,
      nativeLang: nativeLang ?? undefined,
      bio: bio.trim() || undefined,
      interests,
      learning: learn.map(x => ({ lang: x.lang, level: x.level ?? null })),
    });
    await setOnboardingDone(true);
    router.replace("/(tabs)/home" as any);
  };

  // Validación por paso
  const canContinue = () => {
    const id = STEPS[step].id;
    if (id === "welcome")   return true;
    if (id === "name")      return displayName.trim().length >= 2;
    if (id === "country")   return country.trim().length > 0;
    if (id === "native")    return nativeLang !== null;
    if (id === "learning")  return learn.length > 0;
    if (id === "level")     return learn.every(x => x.level !== null);
    if (id === "goal")      return true;
    if (id === "interests") return interests.length >= 2;
    if (id === "bio")       return true; // opcional
    if (id === "done")      return true;
    return true;
  };

  const selectedEntry = learn.find(x => x.lang === selectedLang);
  const currentStepId = STEPS[step].id;

  // ─── Render por paso ────────────────────────────────────────────────────────
  const renderStepContent = () => {
    switch (currentStepId) {

      // ── BIENVENIDA ──────────────────────────────────────────────────────────
      case "welcome":
        return (
          <View style={{ alignItems:"center", gap:28, paddingTop:20 }}>
            {/* Logo animado */}
            <View style={{
              width:100, height:100, borderRadius:50,
              backgroundColor: colors.accentSoft,
              borderWidth:2, borderColor:colors.accent,
              alignItems:"center", justifyContent:"center",
            }}>
              <Text style={{ fontSize:52 }}>🌍</Text>
            </View>

            <View style={{ gap:12, alignItems:"center" }}>
              <Text style={{ color:colors.fg, fontSize:16, fontWeight:"600", textAlign:"center", opacity:0.6, lineHeight:24 }}>
                Aprendé idiomas de la única forma en que realmente funciona:
              </Text>
              <Text style={{ color:colors.accent, fontSize:20, fontWeight:"900", textAlign:"center", lineHeight:30 }}>
                hablando con personas reales
              </Text>
            </View>

            {/* Features */}
            {[
              { icon:"people-outline",           color:"#007AFF", text:"Conectás con nativos y personas como vos" },
              { icon:"swap-horizontal-outline",   color:"#34C759", text:"Intercambio real — todos enseñan y aprenden" },
              { icon:"language-outline",          color:"#AF52DE", text:"Traducciones al toque mientras conversás"  },
            ].map(f => (
              <View key={f.text} style={{ flexDirection:"row", alignItems:"center", gap:14, paddingHorizontal:8, width:"100%" }}>
                <View style={{ width:40, height:40, borderRadius:12, backgroundColor:f.color+"22", alignItems:"center", justifyContent:"center" }}>
                  <Ionicons name={f.icon as any} size={20} color={f.color} />
                </View>
                <Text style={{ color:colors.fg, fontSize:14, fontWeight:"600", flex:1, opacity:0.75 }}>{f.text}</Text>
              </View>
            ))}
          </View>
        );

      // ── NOMBRE ──────────────────────────────────────────────────────────────
      case "name":
        return (
          <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined}>
            <View style={{ gap:16 }}>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Tu nombre o apodo"
                placeholderTextColor={colors.fg+"44"}
                autoFocus
                style={{
                  color:colors.fg, backgroundColor:colors.card,
                  borderWidth:1.5, borderColor: displayName.trim().length>=2 ? colors.accent : colors.border,
                  borderRadius:16, paddingHorizontal:18, paddingVertical:15,
                  fontWeight:"700", fontSize:20,
                }}
              />
              <TextInput
                value={username}
                onChangeText={t => setUsername(t.replace(/[^a-z0-9_]/gi,"").toLowerCase())}
                placeholder="@nombre_usuario (opcional)"
                placeholderTextColor={colors.fg+"44"}
                autoCapitalize="none"
                style={{
                  color:colors.fg, backgroundColor:colors.card,
                  borderWidth:1.5, borderColor:colors.border,
                  borderRadius:16, paddingHorizontal:18, paddingVertical:13,
                  fontWeight:"600", fontSize:15,
                }}
              />
              {displayName.trim().length >= 2 && (
                <View style={{ flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:4 }}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759"/>
                  <Text style={{ color:"#34C759", fontWeight:"600", fontSize:13 }}>
                    Hola, {displayName.trim().split(" ")[0]} 👋
                  </Text>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        );

      // ── PAÍS ────────────────────────────────────────────────────────────────
      case "country":
        return (
          <View style={{ gap:12 }}>
            <Pressable
              onPress={() => setCountryModal(true)}
              style={{
                flexDirection:"row", alignItems:"center", justifyContent:"space-between",
                backgroundColor:colors.card, borderWidth:1.5,
                borderColor: country ? colors.accent : colors.border,
                borderRadius:16, paddingHorizontal:18, paddingVertical:15,
              }}
            >
              <Text style={{ color: country?colors.fg:colors.fg+"44", fontWeight:"700", fontSize:16 }}>
                {country || "Elegí tu país"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.fg} style={{opacity:0.4}}/>
            </Pressable>

            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Ciudad (opcional)"
              placeholderTextColor={colors.fg+"44"}
              style={{
                color:colors.fg, backgroundColor:colors.card,
                borderWidth:1.5, borderColor:colors.border,
                borderRadius:16, paddingHorizontal:18, paddingVertical:13,
                fontWeight:"600", fontSize:15,
              }}
            />

            {country ? (
              <View style={{ flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:4 }}>
                <Ionicons name="location" size={16} color={colors.accent}/>
                <Text style={{ color:colors.accent, fontWeight:"600", fontSize:13 }}>
                  {country}{city ? `, ${city}` : ""}
                </Text>
              </View>
            ) : null}

            <CountryPickerModal
              visible={countryModal}
              onClose={() => setCountryModal(false)}
              onSelect={(label) => { setCountry(label); setCountryModal(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            />
          </View>
        );

      // ── IDIOMA NATIVO ────────────────────────────────────────────────────────
      case "native":
        return (
          <View style={{ gap:10 }}>
            {LEARN_LANGS.map(l => {
              const active = nativeLang === l.code;
              return (
                <Pressable key={l.code} onPress={() => { setNativeLang(l.code); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{
                    flexDirection:"row", alignItems:"center", gap:14,
                    padding:14, borderRadius:14, borderWidth:1.5,
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.accentSoft : colors.card,
                  }}>
                  <Text style={{fontSize:28}}>{l.flag}</Text>
                  <View style={{flex:1}}>
                    <Text style={{color:active?colors.accent:colors.fg, fontWeight:"700", fontSize:16}}>{l.label}</Text>
                    <Text style={{color:colors.fg, opacity:0.4, fontSize:12}}>{l.native}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color={colors.accent}/>}
                </Pressable>
              );
            })}
          </View>
        );

      // ── IDIOMAS A APRENDER ───────────────────────────────────────────────────
      case "learning":
        return (
          <View style={{ gap:10 }}>
            <View style={{ flexDirection:"row", flexWrap:"wrap", gap:10 }}>
              {LEARN_LANGS.filter(l => l.code !== nativeLang).map(l => {
                const active = learn.some(x => x.lang === l.code);
                return <LangChip key={l.code} lang={l} active={active} onPress={()=>toggleLang(l.code)} colors={colors}/>;
              })}
            </View>
            {learn.length > 0 && (
              <View style={{ flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:4 }}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759"/>
                <Text style={{ color:"#34C759", fontWeight:"600", fontSize:13 }}>
                  {learn.length === 1 ? `1 idioma seleccionado` : `${learn.length} idiomas seleccionados`}
                </Text>
              </View>
            )}
          </View>
        );

      // ── NIVEL ────────────────────────────────────────────────────────────────
      case "level":
        return (
          <View style={{ gap:14 }}>
            {/* Tabs de idiomas si hay más de uno */}
            {learn.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingBottom:4 }}>
                {learn.map(x => {
                  const meta = LEARN_LANGS.find(l => l.code === x.lang);
                  const active = selectedLang === x.lang;
                  const done = x.level !== null;
                  return (
                    <Pressable key={x.lang} onPress={() => { setSelectedLang(x.lang); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={{ flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:14, paddingVertical:8, borderRadius:99, borderWidth:1.5, borderColor:active?colors.accent:colors.border, backgroundColor:active?colors.accentSoft:colors.card }}>
                      <Text>{meta?.flag}</Text>
                      <Text style={{color:active?colors.accent:colors.fg,fontWeight:"700",fontSize:13}}>{meta?.label}</Text>
                      {done && <View style={{width:7,height:7,borderRadius:4,backgroundColor:"#34C759"}}/>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Grilla de niveles */}
            <View style={{ gap:8 }}>
              {LEVELS.map(lvl => {
                const active = selectedEntry?.level === lvl;
                const lc = LEVEL_COLORS[lvl];
                return (
                  <Pressable key={lvl} onPress={() => setLevelForSelected(lvl)}
                    style={{
                      flexDirection:"row", alignItems:"center", gap:14, padding:14,
                      borderRadius:14, borderWidth:1.5,
                      borderColor: active ? lc : colors.border,
                      backgroundColor: active ? lc+"18" : colors.card,
                    }}>
                    <View style={{ width:36, height:36, borderRadius:10, backgroundColor: active?lc:colors.border, alignItems:"center", justifyContent:"center" }}>
                      <Text style={{ color:active?"#fff":colors.fg, fontWeight:"900", fontSize:13, opacity:active?1:0.5 }}>{lvl}</Text>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={{color:active?lc:colors.fg, fontWeight:"700", fontSize:14}}>{LEVEL_DESC[lvl]}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={lc}/>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      // ── OBJETIVO ─────────────────────────────────────────────────────────────
      case "goal":
        return (
          <View style={{ gap:12 }}>
            {GOALS.map(g => {
              const active = goal === g.key;
              return (
                <Pressable key={g.key} onPress={() => { setGoal(g.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{
                    padding:18, borderRadius:18, borderWidth:1.5,
                    borderColor: active ? g.color : colors.border,
                    backgroundColor: active ? g.color+"15" : colors.card,
                    gap:10,
                  }}>
                  <View style={{ flexDirection:"row", alignItems:"center", gap:12 }}>
                    <View style={{ width:44, height:44, borderRadius:13, backgroundColor: active?g.color:colors.border, alignItems:"center", justifyContent:"center" }}>
                      <Ionicons name={g.icon as any} size={22} color={active?"#fff":colors.fg} style={{opacity:active?1:0.4}}/>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={{ color:active?g.color:colors.fg, fontWeight:"800", fontSize:17 }}>{g.label}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={g.color}/>}
                  </View>
                  <Text style={{ color:colors.fg, opacity:0.5, fontSize:14, fontWeight:"500", lineHeight:20 }}>{g.desc}</Text>
                </Pressable>
              );
            })}
          </View>
        );

      // ── INTERESES ────────────────────────────────────────────────────────────
      case "interests":
        return (
          <View style={{ gap:14 }}>
            <Text style={{ color:colors.fg, opacity:0.4, fontSize:13, fontWeight:"600" }}>
              Elegí al menos 2 — los usamos para encontrarte mejores compañeros
            </Text>
            <View style={{ flexDirection:"row", flexWrap:"wrap", gap:9 }}>
              {INTERESTS_LIST.map(it => {
                const active = interests.includes(it.label);
                return (
                  <Pressable key={it.label} onPress={() => toggleInterest(it.label)}
                    style={{
                      flexDirection:"row", alignItems:"center", gap:7,
                      paddingHorizontal:13, paddingVertical:9, borderRadius:99,
                      borderWidth:1.5,
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active ? colors.accentSoft : colors.card,
                    }}>
                    <Ionicons name={it.icon as any} size={14} color={active?colors.accent:colors.fg} style={{opacity:active?1:0.5}}/>
                    <Text style={{ color:active?colors.accent:colors.fg, fontWeight:active?"700":"500", fontSize:14 }}>
                      {it.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {interests.length >= 2 && (
              <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759"/>
                <Text style={{ color:"#34C759", fontWeight:"600", fontSize:13 }}>
                  {interests.length} intereses seleccionados
                </Text>
              </View>
            )}
          </View>
        );

      // ── BIO ──────────────────────────────────────────────────────────────────
      case "bio":
        return (
          <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined}>
            <View style={{ gap:12 }}>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder={"Ejemplo: «Hola! Soy de Buenos Aires, me encanta el anime y quiero practicar inglés con alguien que tenga paciencia 😄»"}
                placeholderTextColor={colors.fg+"33"}
                multiline
                maxLength={200}
                style={{
                  color:colors.fg, backgroundColor:colors.card,
                  borderWidth:1.5, borderColor: bio.trim() ? colors.accent : colors.border,
                  borderRadius:16, paddingHorizontal:16, paddingVertical:14,
                  fontWeight:"500", fontSize:15, minHeight:140, textAlignVertical:"top", lineHeight:22,
                }}
              />
              <View style={{ flexDirection:"row", justifyContent:"space-between" }}>
                <Text style={{ color:colors.fg, opacity:0.3, fontSize:12, fontWeight:"600" }}>Opcional</Text>
                <Text style={{ color: bio.length > 160 ? "#FF375F" : colors.fg, opacity:0.3, fontSize:12, fontWeight:"600" }}>
                  {bio.length}/200
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        );

      // ── DONE ─────────────────────────────────────────────────────────────────
      case "done":
        return (
          <View style={{ alignItems:"center", gap:24, paddingTop:12 }}>
            <View style={{
              width:100, height:100, borderRadius:50,
              backgroundColor: "#34C75922", borderWidth:2.5, borderColor:"#34C759",
              alignItems:"center", justifyContent:"center",
            }}>
              <Ionicons name="checkmark" size={52} color="#34C759"/>
            </View>

            {/* Resumen */}
            <View style={{ width:"100%", backgroundColor:colors.card, borderRadius:18, borderWidth:1, borderColor:colors.border, overflow:"hidden" }}>
              {[
                { label:"Nombre",   value: displayName || "—"                                                   },
                { label:"País",     value: country || "—"                                                        },
                { label:"Hablo",    value: nativeLang ? LEARN_LANGS.find(l=>l.code===nativeLang)?.label ?? nativeLang : "—" },
                { label:"Aprendo",  value: learn.map(x => `${LEARN_LANGS.find(l=>l.code===x.lang)?.flag} ${x.level}`).join("  ") || "—" },
                { label:"Intereses",value: interests.slice(0,3).join(", ") + (interests.length>3?` +${interests.length-3}`:"") || "—" },
              ].map((row, i) => (
                <View key={row.label}>
                  <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:16, paddingVertical:12 }}>
                    <Text style={{ color:colors.fg, opacity:0.4, fontWeight:"700", fontSize:12 }}>{row.label.toUpperCase()}</Text>
                    <Text style={{ color:colors.fg, fontWeight:"600", fontSize:14, maxWidth:"60%", textAlign:"right" }} numberOfLines={1}>{row.value}</Text>
                  </View>
                  {i < 4 && <View style={{ height:1, backgroundColor:colors.border }}/>}
                </View>
              ))}
            </View>

            <Text style={{ color:colors.fg, opacity:0.4, fontSize:13, fontWeight:"600", textAlign:"center" }}>
              Podés editar todo esto desde Ajustes en cualquier momento
            </Text>
          </View>
        );

      default: return null;
    }
  };

  const isLast = step === STEPS.length - 1;
  const btnLabel = isLast ? "¡Empezar!" : currentStepId === "bio" ? "Continuar (o saltear)" : "Continuar";
  const ok = canContinue();

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.bg }} edges={["top","bottom"]}>

      {/* Header con progreso */}
      <View style={{ paddingHorizontal:20, paddingTop:8, paddingBottom:4 }}>
        <View style={{ flexDirection:"row", alignItems:"center", gap:12 }}>
          {step > 0 && (
            <Pressable onPress={goBack} style={{ padding:4 }}>
              <Ionicons name="arrow-back" size={22} color={colors.fg} style={{ opacity:0.6 }}/>
            </Pressable>
          )}
          <View style={{ flex:1 }}>
            <Text style={{ color:colors.fg, opacity:0.35, fontWeight:"700", fontSize:11, letterSpacing:1 }}>
              {currentStepId === "welcome" ? "AMISTAD" : `PASO ${step} DE ${STEPS.length - 2}`}
            </Text>
          </View>
          {step > 0 && step < STEPS.length - 1 && (
            <Pressable onPress={goNext} style={{ padding:4 }}>
              <Text style={{ color:colors.accent, fontWeight:"700", fontSize:14, opacity: currentStepId==="bio"?1:0 }}>
                Saltar
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <ProgressBar step={step} total={STEPS.length} colors={colors} />

      {/* Título + contenido */}
      <ScrollView
        contentContainerStyle={{ padding:20, paddingBottom:140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity:opacAnim, transform:[{translateY:slideAnim}] }}>
          {/* Título del paso */}
          <View style={{ marginBottom:24 }}>
            <Text style={{ color:colors.fg, fontSize:26, fontWeight:"900", lineHeight:32 }}>
              {STEPS[step].title}
            </Text>
            <Text style={{ color:colors.fg, opacity:0.45, fontSize:15, fontWeight:"600", marginTop:4, lineHeight:22 }}>
              {STEPS[step].sub}
            </Text>
          </View>

          {renderStepContent()}
        </Animated.View>
      </ScrollView>

      {/* Botón fijo abajo */}
      <View style={{
        position:"absolute", bottom:0, left:0, right:0,
        padding:20, paddingBottom: Platform.OS==="ios"?36:20,
        backgroundColor:colors.bg, borderTopWidth:1, borderTopColor:colors.border,
      }}>
        <Pressable
          onPress={goNext}
          disabled={!ok}
          style={({ pressed }) => ({
            backgroundColor: ok ? colors.accent : colors.border,
            paddingVertical:16, borderRadius:16, alignItems:"center",
            opacity: pressed ? 0.85 : 1,
            flexDirection:"row", justifyContent:"center", gap:8,
          })}
        >
          <Text style={{ color:"#fff", fontWeight:"900", fontSize:16 }}>{btnLabel}</Text>
          {ok && !isLast && <Ionicons name="arrow-forward" size={18} color="#fff"/>}
          {isLast && <Ionicons name="rocket-outline" size={18} color="#fff"/>}
        </Pressable>
      </View>

    </SafeAreaView>
  );
}