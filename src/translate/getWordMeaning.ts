import type { LanguageCode } from "../storage";

export type WordMeaningResult = {
  word: string;
  meaning: string;
  fromCache: boolean;
};

type PairKey = `${LanguageCode}->${LanguageCode}`;

// ─────────────────────────────────────────────────────────────
// Cache en memoria
// ─────────────────────────────────────────────────────────────
const _cache = new Map<string, string>();

// ─────────────────────────────────────────────────────────────
// Normalización — convierte comillas tipográficas y limpia
// ─────────────────────────────────────────────────────────────
function normalize(s: string): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    // Comillas tipográficas → apóstrofo estándar
    .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
    // Guiones especiales → guión normal
    .replace(/[\u2013\u2014]/g, "-");
}

// ─────────────────────────────────────────────────────────────
// Expansión de contracciones EN
// ─────────────────────────────────────────────────────────────
const CONTRACTIONS: Record<string, string> = {
  "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is",
  "it's": "it is", "we're": "we are", "they're": "they are",
  "i've": "i have", "you've": "you have", "we've": "we have",
  "i'll": "i will", "you'll": "you will", "he'll": "he will",
  "i'd": "i would", "you'd": "you would", "he'd": "he would",
  "isn't": "is not", "aren't": "are not", "wasn't": "was not",
  "weren't": "were not", "don't": "do not", "doesn't": "does not",
  "didn't": "did not", "won't": "will not", "wouldn't": "would not",
  "can't": "cannot", "couldn't": "could not", "shouldn't": "should not",
  "hasn't": "has not", "haven't": "have not", "hadn't": "had not",
  "let's": "let us", "that's": "that is", "there's": "there is",
  "here's": "here is", "what's": "what is", "how's": "how is",
  "where's": "where is", "who's": "who is", "why's": "why is",
};

function expandContraction(word: string): string {
  const n = normalize(word);
  return CONTRACTIONS[n] ?? word;
}

// ─────────────────────────────────────────────────────────────
// Diccionario local — rápido y offline
// ─────────────────────────────────────────────────────────────
const WORD_MEANINGS: Partial<Record<PairKey, Record<string, string>>> = {
  "en->es": {
    // contracciones (normalizadas con apóstrofo estándar)
    "i'm":"soy/estoy", "you're":"sos/estás", "he's":"es/está",
    "she's":"es/está", "it's":"es/está", "we're":"somos",
    "they're":"son/están", "i've":"yo he", "i'll":"yo voy a",
    "don't":"no", "doesn't":"no", "didn't":"no", "won't":"no va a",
    "can't":"no puedo", "how's":"cómo está", "what's":"qué es",
    "let's":"vamos a", "that's":"eso es", "there's":"hay",
    "i'd":"yo querría", "you'd":"vos querrías",
    // pronombres
    i:"yo", you:"vos", he:"él", she:"ella", we:"nosotros",
    they:"ellos", it:"eso", me:"mí", my:"mi", your:"tu",
    his:"su", her:"su", our:"nuestro", their:"su",
    // verbos base
    be:"ser", am:"soy", is:"es", are:"son", was:"era", were:"eran",
    have:"tener", has:"tiene", had:"tenía", do:"hacer", does:"hace",
    did:"hizo", get:"obtener", got:"obtuvo", make:"hacer", made:"hizo",
    go:"ir", went:"fue", come:"venir", came:"vino", take:"tomar",
    took:"tomó", give:"dar", gave:"dio", know:"saber", knew:"sabía",
    think:"pensar", thought:"pensó", see:"ver", saw:"vio",
    look:"mirar", want:"querer", need:"necesitar", feel:"sentir",
    say:"decir", said:"dijo", tell:"contar", told:"contó",
    ask:"preguntar", work:"trabajar", play:"jugar", run:"correr",
    walk:"caminar", talk:"hablar", speak:"hablar", live:"vivir",
    love:"amar", like:"gustar", hate:"odiar", help:"ayudar",
    try:"intentar", use:"usar", find:"encontrar", keep:"mantener",
    call:"llamar", show:"mostrar", hear:"escuchar", leave:"salir",
    let:"dejar", put:"poner", bring:"traer", write:"escribir",
    read:"leer", eat:"comer", drink:"beber", sleep:"dormir",
    buy:"comprar", start:"empezar", stop:"parar", change:"cambiar",
    open:"abrir", close:"cerrar", learn:"aprender", study:"estudiar",
    travel:"viajar", meet:"conocer", send:"enviar",
    understand:"entender", remember:"recordar", forget:"olvidar",
    wait:"esperar", hope:"esperar", move:"mover", lose:"perder",
    win:"ganar", pay:"pagar", stay:"quedarse", sit:"sentarse",
    // gerundios
    going:"yendo", doing:"haciendo", being:"siendo", having:"teniendo",
    coming:"viniendo", getting:"obteniendo", looking:"mirando",
    working:"trabajando", talking:"hablando", thinking:"pensando",
    trying:"intentando", living:"viviendo", loving:"amando",
    feeling:"sintiendo", saying:"diciendo", making:"haciendo",
    taking:"tomando", playing:"jugando", running:"corriendo",
    walking:"caminando", learning:"aprendiendo", eating:"comiendo",
    drinking:"bebiendo", sleeping:"durmiendo", helping:"ayudando",
    // sustantivos
    thing:"cosa", way:"manera", day:"día", time:"tiempo", year:"año",
    month:"mes", week:"semana", hour:"hora", minute:"minuto",
    man:"hombre", woman:"mujer", people:"gente", person:"persona",
    child:"niño", friend:"amigo", family:"familia", home:"hogar",
    house:"casa", school:"escuela", city:"ciudad", country:"país",
    world:"mundo", life:"vida", name:"nombre", place:"lugar",
    hand:"mano", eye:"ojo", head:"cabeza", face:"cara", body:"cuerpo",
    heart:"corazón", word:"palabra", door:"puerta", room:"habitación",
    street:"calle", water:"agua", food:"comida", money:"dinero",
    book:"libro", language:"idioma", question:"pregunta", idea:"idea",
    story:"historia", night:"noche", morning:"mañana", evening:"tarde",
    today:"hoy", tomorrow:"mañana", yesterday:"ayer", music:"música",
    movie:"película", game:"juego", sport:"deporte", trip:"viaje",
    job:"trabajo", plan:"plan", dream:"sueño", news:"noticias",
    phone:"teléfono", message:"mensaje", photo:"foto", number:"número",
    problem:"problema", reason:"razón", moment:"momento",
    hobby:"pasatiempo", hobbies:"pasatiempos", culture:"cultura",
    interest:"interés", color:"color", park:"parque", beach:"playa",
    mountain:"montaña", river:"río", sea:"mar", sky:"cielo", sun:"sol",
    moon:"luna", star:"estrella", tree:"árbol", flower:"flor",
    dog:"perro", cat:"gato", bird:"pájaro", car:"auto", train:"tren",
    bus:"colectivo", plane:"avión", restaurant:"restaurante",
    coffee:"café", tea:"té", bread:"pan", fruit:"fruta", meat:"carne",
    london:"Londres", paris:"París", tokyo:"Tokio", madrid:"Madrid",
    berlin:"Berlín", moscow:"Moscú", beijing:"Pekín",
    // adjetivos
    good:"bueno", great:"genial", bad:"malo", nice:"agradable",
    big:"grande", small:"pequeño", long:"largo", short:"corto",
    new:"nuevo", old:"viejo", young:"joven", high:"alto", low:"bajo",
    hot:"caliente", cold:"frío", fast:"rápido", slow:"lento",
    easy:"fácil", hard:"difícil", important:"importante", free:"libre",
    happy:"feliz", sad:"triste", funny:"gracioso",
    interesting:"interesante", beautiful:"hermoso", cool:"genial",
    sure:"seguro", ready:"listo", alone:"solo", together:"juntos",
    early:"temprano", late:"tarde", special:"especial",
    amazing:"increíble", wonderful:"maravilloso", perfect:"perfecto",
    ok:"está bien", okay:"está bien", right:"correcto", wrong:"incorrecto",
    // conectores
    and:"y", or:"o", but:"pero", so:"entonces", because:"porque",
    if:"si", when:"cuando", where:"dónde", what:"qué", who:"quién",
    how:"cómo", why:"por qué", that:"que", this:"esto",
    about:"sobre", after:"después", before:"antes", for:"para",
    from:"de", in:"en", of:"de", on:"sobre", at:"a", by:"por",
    to:"a", with:"con", without:"sin", not:"no", also:"también",
    just:"solo", very:"muy", more:"más", much:"mucho", many:"muchos",
    all:"todo", now:"ahora", here:"aquí", there:"allá",
    always:"siempre", never:"nunca", sometimes:"a veces",
    well:"bien", still:"todavía", already:"ya", back:"atrás",
    both:"ambos", each:"cada", really:"realmente",
    // saludos — palabras MUY cortas las manejamos local para evitar errores de API
    hello:"hola", hi:"hola", hey:"oye", bye:"chau", goodbye:"adiós",
    thanks:"gracias", thank:"gracias", please:"por favor",
    sorry:"lo siento", welcome:"bienvenido", yes:"sí", no:"no",
    ok2:"está bien", yep:"sí", nope:"no", wow:"vaya", oh:"oh",
    ah:"ah", um:"em", well2:"bueno",
  },
  "es->en": {
    hola:"hello", chau:"bye", gracias:"thanks", favor:"please",
    perdón:"sorry", sí:"yes", si:"yes", no:"no",
    yo:"I", vos:"you", él:"he", ella:"she", nosotros:"we", ellos:"they",
    ser:"to be", estar:"to be", soy:"I am", estoy:"I am", es:"is",
    son:"are", tener:"to have", tengo:"I have", hacer:"to do",
    ir:"to go", hablar:"to speak", querer:"to want", poder:"can",
    saber:"to know", conocer:"to know", ver:"to see",
    escuchar:"to listen", comer:"to eat", beber:"to drink",
    dormir:"to sleep", vivir:"to live", trabajar:"to work",
    estudiar:"to study", aprender:"to learn", jugar:"to play",
    viajar:"to travel", ciudad:"city", país:"country", mundo:"world",
    vida:"life", amigo:"friend", familia:"family", casa:"house",
    trabajo:"job", tiempo:"time", día:"day", noche:"night",
    mañana:"morning", comida:"food", agua:"water", idioma:"language",
    música:"music", película:"movie", deporte:"sport",
    bueno:"good", malo:"bad", grande:"big", pequeño:"small",
    nuevo:"new", viejo:"old", feliz:"happy", triste:"sad",
    fácil:"easy", difícil:"hard", interesante:"interesting",
    importante:"important", gente:"people", nombre:"name",
    hoy:"today", ayer:"yesterday", siempre:"always", nunca:"never",
    también:"also", pero:"but", porque:"because", cuando:"when",
    cómo:"how", qué:"what", quién:"who", dónde:"where",
  },
  "ja->es": {
    "こんにちは":"hola", "ありがとう":"gracias", "すみません":"disculpe",
    "はい":"sí", "いいえ":"no", "おはよう":"buenos días",
    "こんばんは":"buenas noches", "さようなら":"adiós",
    "ごめんなさい":"lo siento", "わかりました":"entendido",
    "どうぞ":"por favor", "どういたしまして":"de nada",
    "はじめまして":"mucho gusto", "元気ですか":"¿cómo estás?",
    "元気":"bien", "私":"yo", "あなた":"vos", "彼":"él", "彼女":"ella",
    "名前":"nombre", "日本":"Japón", "東京":"Tokio",
    "好き":"gustar", "大好き":"amar", "友達":"amigo", "家族":"familia",
    "家":"casa", "仕事":"trabajo", "学校":"escuela", "音楽":"música",
    "映画":"película", "今日":"hoy", "明日":"mañana", "昨日":"ayer",
    "いい":"bueno", "悪い":"malo", "大きい":"grande", "小さい":"pequeño",
    "新しい":"nuevo", "嬉しい":"feliz", "悲しい":"triste",
    "難しい":"difícil", "簡単":"fácil", "面白い":"interesante",
    "かわいい":"lindo", "すごい":"increíble", "食べる":"comer",
    "飲む":"beber", "行く":"ir", "来る":"venir", "話す":"hablar",
    "聞く":"escuchar", "読む":"leer", "書く":"escribir",
  },
  "ja->en": {
    "こんにちは":"hello", "ありがとう":"thanks", "はい":"yes",
    "いいえ":"no", "おはよう":"good morning", "こんばんは":"good evening",
    "さようなら":"goodbye", "ごめんなさい":"sorry",
    "どういたしまして":"you're welcome",
    "はじめまして":"nice to meet you", "元気ですか":"how are you?",
    "私":"I", "あなた":"you", "名前":"name", "日本":"Japan", "東京":"Tokyo",
    "好き":"like", "友達":"friend", "家族":"family", "仕事":"work",
    "今日":"today", "明日":"tomorrow", "昨日":"yesterday",
  },
  "zh->es": {
    "你好":"hola", "谢谢":"gracias", "对不起":"lo siento",
    "是":"sí", "不":"no", "好的":"está bien", "再见":"adiós",
    "早上好":"buenos días", "晚上好":"buenas noches",
    "请":"por favor", "不客气":"de nada",
    "我":"yo", "你":"vos", "他":"él", "她":"ella",
    "我们":"nosotros", "他们":"ellos", "名字":"nombre",
    "中国":"China", "北京":"Pekín", "喜欢":"gustar", "爱":"amar",
    "朋友":"amigo", "家":"casa", "家人":"familia", "工作":"trabajo",
    "学校":"escuela", "音乐":"música", "电影":"película",
    "今天":"hoy", "明天":"mañana", "昨天":"ayer",
    "好":"bueno", "大":"grande", "小":"pequeño", "新":"nuevo",
    "高兴":"feliz", "难过":"triste", "难":"difícil", "容易":"fácil",
    "有趣":"interesante", "可爱":"lindo",
    "你好吗":"¿cómo estás?", "怎么样":"¿cómo estás?",
  },
  "zh->en": {
    "你好":"hello", "谢谢":"thanks", "对不起":"sorry",
    "是":"yes", "不":"no", "好的":"okay", "再见":"goodbye",
    "请":"please", "不客气":"you're welcome",
    "我":"I", "你":"you", "他":"he", "她":"she", "我们":"we",
    "名字":"name", "中国":"China", "北京":"Beijing",
    "喜欢":"like", "爱":"love", "朋友":"friend", "工作":"work",
    "今天":"today", "明天":"tomorrow", "昨天":"yesterday",
    "你好吗":"how are you?", "怎么样":"how are you?",
  },
  "ru->es": {
    "привет":"hola", "пока":"chau", "спасибо":"gracias",
    "пожалуйста":"por favor", "да":"sí", "нет":"no",
    "я":"yo", "ты":"vos", "он":"él", "она":"ella",
    "мы":"nosotros", "они":"ellos", "имя":"nombre",
    "город":"ciudad", "страна":"país", "друг":"amigo",
    "семья":"familia", "дом":"casa", "работа":"trabajo",
    "язык":"idioma", "музыка":"música", "фильм":"película",
    "хорошо":"bien", "плохо":"mal", "большой":"grande",
    "маленький":"pequeño", "новый":"nuevo", "красивый":"bonito",
    "интересный":"interesante", "как":"cómo", "где":"dónde",
    "что":"qué", "кто":"quién", "много":"mucho", "день":"día",
    "ночь":"noche", "еда":"comida", "вода":"agua",
    "жить":"vivir", "любить":"amar", "говорить":"hablar", "идти":"ir",
  },
  "de->es": {
    "hallo":"hola", "tschüss":"chau", "danke":"gracias",
    "bitte":"por favor", "ja":"sí", "nein":"no",
    "entschuldigung":"disculpe", "ich":"yo", "du":"vos",
    "er":"él", "sie":"ella", "wir":"nosotros",
    "haben":"tener", "machen":"hacer", "gehen":"ir",
    "kommen":"venir", "sprechen":"hablar", "wollen":"querer",
    "können":"poder", "wissen":"saber", "sehen":"ver",
    "essen":"comer", "trinken":"beber", "schlafen":"dormir",
    "leben":"vivir", "arbeiten":"trabajar", "lernen":"aprender",
    "spielen":"jugar", "lieben":"amar",
    "stadt":"ciudad", "land":"país", "freund":"amigo",
    "familie":"familia", "haus":"casa", "arbeit":"trabajo",
    "sprache":"idioma", "musik":"música", "film":"película",
    "gut":"bueno", "schlecht":"malo", "groß":"grande", "klein":"pequeño",
    "neu":"nuevo", "schön":"bonito", "interessant":"interesante",
    "wie":"cómo", "was":"qué", "wer":"quién", "wo":"dónde",
    "und":"y", "aber":"pero", "weil":"porque",
    "heute":"hoy", "morgen":"mañana", "gestern":"ayer",
    "immer":"siempre", "nie":"nunca", "auch":"también",
  },
};

// ─────────────────────────────────────────────────────────────
// Lookup local
// ─────────────────────────────────────────────────────────────
function lookupLocal(word: string, from: LanguageCode, to: LanguageCode): string | null {
  const key = normalize(word);

  // Directo
  const direct = WORD_MEANINGS[`${from}->${to}` as PairKey];
  if (direct?.[key] != null) return direct[key];

  // Expandir contracción y reintentar (solo EN)
  if (from === "en") {
    const expanded = expandContraction(key);
    if (expanded !== key) {
      const firstWord = expanded.split(" ")[0];
      if (direct?.[firstWord] != null) return direct[firstWord];
    }
  }

  // Pivot via EN
  if (from !== "en" && to !== "en") {
    const toEn = WORD_MEANINGS[`${from}->en` as PairKey];
    if (toEn?.[key]) {
      const pivot = toEn[key].split(/[\s/,]+/)[0].trim();
      const enTo = WORD_MEANINGS[`en->${to}` as PairKey];
      if (enTo?.[normalize(pivot)]) return enTo[normalize(pivot)];
      return toEn[key];
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// MyMemory API — gratuita, sin API key, 75 idiomas
// Solo se usa para palabras NO encontradas en el diccionario local
// ─────────────────────────────────────────────────────────────
const LANG_ISO: Record<LanguageCode, string> = {
  es: "es", en: "en", de: "de", ru: "ru", ja: "ja", zh: "zh-CN",
};

// Palabras demasiado cortas o ambiguas — NO enviar a la API
const SKIP_API = new Set([
  "a", "i", "o", "e", "u", "y", "hi", "ok", "no", "so", "do",
  "go", "be", "he", "me", "my", "by", "to", "of", "in", "on",
  "at", "it", "is", "an", "or", "as", "up", "if", "us",
]);

async function translateViaAPI(
  word: string,
  from: LanguageCode,
  to: LanguageCode
): Promise<string | null> {
  const clean = normalize(word);

  // No enviar palabras muy cortas o que están en la lista negra
  if (SKIP_API.has(clean) || clean.length <= 1) return null;

  try {
    const langPair = `${LANG_ISO[from]}|${LANG_ISO[to]}`;
    // Enviamos la palabra limpia con apóstrofo estándar
    const queryWord = word.trim().replace(/[\u2018\u2019\u02BC]/g, "'");
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(queryWord)}&langpair=${langPair}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;

    const data = await res.json();
    const translated: string = data?.responseData?.translatedText ?? "";

    // Si la API devuelve lo mismo que enviamos o está vacío, ignorar
    if (!translated || normalize(translated) === clean) return null;

    // Si contiene % es que algo salió mal con la codificación
    if (translated.includes("%")) return null;

    // Tomar solo la primera palabra limpia
    const first = translated
      .trim()
      .split(/[\s,.\-–:;/()\[\]]+/)
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0)[0];

    return first ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Export principal
// ─────────────────────────────────────────────────────────────
export async function getWordMeaning(
  word: string,
  fromLang: LanguageCode,
  toLang: LanguageCode
): Promise<WordMeaningResult> {
  const trimmed = (word ?? "").trim()
    // Normalizar comillas tipográficas en el input
    .replace(/[\u2018\u2019\u02BC]/g, "'");

  if (!trimmed || fromLang === toLang) {
    return { word: trimmed, meaning: trimmed, fromCache: true };
  }

  const cacheKey = `${fromLang}:${toLang}:${normalize(trimmed)}`;

  // 1) Cache
  if (_cache.has(cacheKey)) {
    return { word: trimmed, meaning: _cache.get(cacheKey)!, fromCache: true };
  }

  // 2) Diccionario local
  const local = lookupLocal(trimmed, fromLang, toLang);
  if (local !== null) {
    _cache.set(cacheKey, local);
    return { word: trimmed, meaning: local, fromCache: true };
  }

  // 3) MyMemory API
  const apiResult = await translateViaAPI(trimmed, fromLang, toLang);
  if (apiResult) {
    _cache.set(cacheKey, apiResult);
    return { word: trimmed, meaning: apiResult, fromCache: false };
  }

  // 4) Fallback
  return { word: trimmed, meaning: "—", fromCache: true };
}