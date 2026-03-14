import logging, time
from config.keys import GROQ_API_KEY, GROQ_MODEL, GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

class GroqBase:
    def __init__(self):
        if GEMINI_API_KEY:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            self.gemini_model = genai.GenerativeModel(GEMINI_MODEL)
            self.backend = "gemini"
            self.model = GEMINI_MODEL
            logger.info(f"Usando Gemini | {self.model}")
        elif GROQ_API_KEY and "PEGAR" not in GROQ_API_KEY:
            from groq import Groq
            self.client  = Groq(api_key=GROQ_API_KEY)
            self.model   = GROQ_MODEL
            self.backend = "groq"
            logger.info(f"Usando Groq | {self.model}")
        else:
            raise ValueError("Configurá GEMINI_API_KEY o GROQ_API_KEY en .env")

    def _chat(self, system: str, user: str, max_tokens: int = 4096, temp: float = 0.2) -> str:
        if self.backend == "gemini":
            return self._chat_gemini(system, user, temp)
        return self._chat_groq(system, user, max_tokens, temp)

    def _chat_gemini(self, system: str, user: str, temp: float) -> str:
        import google.generativeai as genai
        waits = [30, 60, 90]
        for attempt in range(4):
            try:
                import google.generativeai as genai
                model = genai.GenerativeModel(
                    self.model,
                    system_instruction=system,
                    generation_config=genai.GenerationConfig(temperature=temp, max_output_tokens=4096)
                )
                resp = model.generate_content(user)
                time.sleep(1)
                return resp.text
            except Exception as e:
                err = str(e)
                if "429" in err or "quota" in err.lower() or "rate" in err.lower():
                    if attempt < 3:
                        wait = waits[min(attempt, len(waits)-1)]
                        logger.warning(f"Rate limit Gemini, esperando {wait}s... (intento {attempt+1})")
                        time.sleep(wait)
                    else:
                        raise Exception("Rate limit persistente. Esperá 2 minutos.")
                elif "503" in err or "unavailable" in err.lower():
                    logger.warning("Gemini no disponible, reintentando en 15s...")
                    time.sleep(15)
                else:
                    raise
        raise Exception("Gemini no respondió.")

    def _chat_groq(self, system: str, user: str, max_tokens: int, temp: float) -> str:
        waits = [30, 60, 90]
        for attempt in range(4):
            try:
                resp = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user},
                    ],
                    max_tokens=max_tokens,
                    temperature=temp,
                )
                time.sleep(2)
                return resp.choices[0].message.content
            except Exception as e:
                err = str(e)
                if "429" in err or "rate" in err.lower():
                    if attempt < 3:
                        wait = waits[min(attempt, len(waits)-1)]
                        logger.warning(f"Rate limit Groq, esperando {wait}s... (intento {attempt+1})")
                        time.sleep(wait)
                    else:
                        raise Exception("Rate limit persistente. Esperá 2 minutos.")
                elif "503" in err or "unavailable" in err.lower():
                    logger.warning("Groq no disponible, reintentando en 15s...")
                    time.sleep(15)
                else:
                    raise
        raise Exception("Groq no respondió.")