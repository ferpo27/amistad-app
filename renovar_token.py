"""
renovar_token.py — Convierte token temporal a token de 60 días
Uso: python renovar_token.py TOKEN_TEMPORAL
"""
import sys, httpx, os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(".env", override=True)

APP_ID     = "1446519646915953"
APP_SECRET = "f64892d60d358119822edbccaf9726e2"

def get_long_token(short_token: str) -> str:
    r = httpx.get(
        "https://graph.facebook.com/v19.0/oauth/access_token",
        params={
            "grant_type":        "fb_exchange_token",
            "client_id":         APP_ID,
            "client_secret":     APP_SECRET,
            "fb_exchange_token": short_token,
        },
        timeout=15,
    )
    data = r.json()
    if "access_token" in data:
        return data["access_token"]
    raise Exception(f"Error: {data}")

def save_token(token: str):
    env_path = Path(".env")
    content  = env_path.read_text(encoding="utf-8")
    lines    = []
    for line in content.splitlines():
        if line.startswith("WHATSAPP_TOKEN="):
            lines.append(f"WHATSAPP_TOKEN={token}")
        else:
            lines.append(line)
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    os.environ["WHATSAPP_TOKEN"] = token

if __name__ == "__main__":
    token_corto = os.getenv("WHATSAPP_TOKEN", "").strip()
    if len(sys.argv) > 1:
        token_corto = sys.argv[1].strip()

    if not token_corto:
        print("❌ No hay token. Uso: python renovar_token.py TOKEN")
        sys.exit(1)

    print(f"🔄 Convirtiendo token a 60 días...")
    try:
        token_largo = get_long_token(token_corto)
        save_token(token_largo)
        print(f"✅ Token de 60 días guardado en .env")
        print(f"   {token_largo[:40]}...")
    except Exception as e:
        print(f"❌ Error: {e}")
