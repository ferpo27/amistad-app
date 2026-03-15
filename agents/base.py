import logging, time, hashlib
from config.keys import GROQ_API_KEY, GROQ_MODEL, GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

# Cache solo para Arquitecto y Auditor — el Developer NUNCA cachea
_global_cache: dict[str, str] = {}
_MAX_CACHE = 60


def _cache_key(system: str, user: str) -> str:
    return hashlib.md5((system[:200] + "|||" + user[:400]).encode()).hexdigest()


def _is_rate_limit(e: Exception) -> bool:
    err = str(e).lower()
    return any(x in err for x in ["429", "quota", "rate", "exhausted", "resource"])


def _is_unavailable(e: Exception) -> bool:
    err = str(e).lower()
    return "503" in err or "unavailable" in err


class GroqBase:
    # Subclases pueden sobreescribir: Developer pone False
    _use_cache: bool = True

    def __init__(self):
        self._gemini_ok = bool(GEMINI_API_KEY)
        self._groq_ok   = bool(GROQ_API_KEY and "PEGAR" not in GROQ_API_KEY)

        if not self._gemini_ok and not self._groq_ok:
            raise ValueError("Configurá GEMINI_API_KEY o GROQ_API_KEY en .env")

        self._groq_client = None
        if self._groq_ok:
            from groq import Groq
            self._groq_client = Groq(api_key=GROQ_API_KEY)

        self.model   = GEMINI_MODEL if self._gemini_ok else GROQ_MODEL
        self.backend = "gemini"     if self._gemini_ok else "groq"
        logger.info(f"Backend: {self.backend} | {self.model}")

    def _chat(self, system: str, user: str, max_tokens: int = 4096, temp: float = 0.2) -> str:
        # Developer no cachea — siempre genera código fresco
        if not self._use_cache:
            return self._chat_with_fallback(system, user, max_tokens, temp)

        key = _cache_key(system, user)
        if key in _global_cache:
            logger.info("Cache hit")
            return _global_cache[key]

        result = self._chat_with_fallback(system, user, max_tokens, temp)

        if len(_global_cache) >= _MAX_CACHE:
            del _global_cache[next(iter(_global_cache))]
        _global_cache[key] = result
        return result

    def _chat_with_fallback(self, system: str, user: str, max_tokens: int, temp: float) -> str:
        last_error = None

        # Intento 1 — Gemini
        if self._gemini_ok:
            try:
                result = self._call_gemini(system, user, temp)
                self.backend = "gemini"
                self.model   = GEMINI_MODEL
                return result
            except Exception as e:
                if _is_rate_limit(e):
                    logger.warning("Gemini rate limit → intentando Groq...")
                    last_error = e
                else:
                    raise

        # Intento 2 — Groq como fallback
        if self._groq_ok:
            try:
                result = self._call_groq(system, user, max_tokens, temp)
                self.backend = "groq"
                self.model   = GROQ_MODEL
                return result
            except Exception as e:
                if _is_rate_limit(e):
                    logger.warning("Groq rate limit también.")
                    last_error = e
                else:
                    raise

        raise Exception(
            f"Rate limit en todos los backends. Esperá unos minutos.\n"
            f"Detalle: {str(last_error)[:150]}"
        )

    def _call_gemini(self, system: str, user: str, temp: float) -> str:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)
        waits  = [10, 25, 50]

        for attempt in range(3):
            try:
                resp = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=[types.Part.from_text(text=f"{system}\n\n{user}")],
                    config=types.GenerateContentConfig(
                        temperature=temp,
                        max_output_tokens=4096,
                    ),
                )
                return resp.text
            except Exception as e:
                if _is_rate_limit(e):
                    if attempt < 2:
                        logger.warning(f"Gemini rate limit, esperando {waits[attempt]}s... ({attempt+1}/3)")
                        time.sleep(waits[attempt])
                    else:
                        raise
                elif _is_unavailable(e):
                    logger.warning("Gemini no disponible, reintentando en 8s...")
                    time.sleep(8)
                else:
                    raise
        raise Exception("Gemini no respondió.")

    def _call_groq(self, system: str, user: str, max_tokens: int, temp: float) -> str:
        if not self._groq_client:
            raise Exception("Groq no configurado.")

        waits = [10, 25, 50]
        for attempt in range(3):
            try:
                resp = self._groq_client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user},
                    ],
                    max_tokens=max_tokens,
                    temperature=temp,
                )
                return resp.choices[0].message.content
            except Exception as e:
                if _is_rate_limit(e):
                    if attempt < 2:
                        logger.warning(f"Groq rate limit, esperando {waits[attempt]}s... ({attempt+1}/3)")
                        time.sleep(waits[attempt])
                    else:
                        raise
                elif _is_unavailable(e):
                    logger.warning("Groq no disponible, reintentando en 8s...")
                    time.sleep(8)
                else:
                    raise
        raise Exception("Groq no respondió.")