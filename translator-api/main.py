# main.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="amistad-app translator-api", version="1.0.0")

# MVP diccionarios (base). Después lo conectamos a modelos reales.
# Clave: "from->to"
WORD_DICT = {
    "de->es": {
        "hallo": "hola",
        "danke": "gracias",
        "bitte": "por favor / de nada",
        "ich": "yo",
        "komme": "vengo",
        "aus": "de",
    },
    "de->en": {
        "hallo": "hello",
        "danke": "thanks",
        "bitte": "please / you're welcome",
        "ich": "I",
        "komme": "come",
        "aus": "from",
    },
    "ru->es": {"привет": "hola", "как": "cómo", "дела": "estás"},
    "ru->en": {"привет": "hi", "как": "how", "дела": "are things"},
    "ja->es": {"こんにちは": "hola", "ありがとう": "gracias"},
    "ja->en": {"こんにちは": "hello", "ありがとう": "thank you"},
    "zh->es": {"你好": "hola", "谢谢": "gracias"},
    "zh->en": {"你好": "hello", "谢谢": "thank you"},
}

class TranslateReq(BaseModel):
    text: str
    from_lang: str
    to_lang: str

class TranslateResp(BaseModel):
    translated: str

@app.get("/health")
def health():
    return {"ok": True}

def simple_translate(text: str, from_lang: str, to_lang: str) -> str:
    pair = f"{from_lang}->{to_lang}"
    d = WORD_DICT.get(pair, {})
    # Token simple (MVP). Luego lo hacemos mejor.
    parts = text.strip().split()
    out = []
    for p in parts:
        key = p.strip().lower()
        out.append(d.get(key, p))
    return " ".join(out)

@app.post("/translate", response_model=TranslateResp)
def translate(req: TranslateReq):
    return {"translated": simple_translate(req.text, req.from_lang, req.to_lang)}
