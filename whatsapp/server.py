import logging, threading, os, io
from typing import Optional
import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from config.keys import WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_ID, WORKSPACE_DIR

logger = logging.getLogger(__name__)
app    = FastAPI(title="AI Dev Agent", version="5.0")

_job_thread: Optional[threading.Thread] = None
_last_status = None
_lock = threading.Lock()

# Contexto fijo del proyecto — el usuario NO necesita repetirlo en cada mensaje
APP_CONTEXT = """
CONTEXTO DEL PROYECTO:
- Nombre: Amistad App
- Tecnología: React Native + Expo + TypeScript + Supabase
- Carpeta raíz: C:\\Users\\ferna\\Documents\\app
- Estructura:
  * app/ → pantallas Expo Router (tabs, auth, onboarding)
  * src/storage/ → funciones de almacenamiento
  * src/bots/ → lógica de bots con Gemini/Claude AI
  * src/lib/supabase.ts → cliente Supabase (export { supabase })
  * src/storage.ts → storage principal
  * src/safety.ts → reportar y bloquear usuarios
  * src/hooks/ → hooks de React
  * src/translate/ → traducción automática
  * src/mock/ → datos de prueba

REGLAS PERMANENTES DEL PROYECTO:
- NUNCA usar default import de supabase — siempre: import { supabase } from
- NUNCA hardcodear credenciales
- NUNCA importar módulos inexistentes
- NUNCA modificar src/mock/
- Para borrar archivos usar action="delete"
"""

def get_token():
    from dotenv import load_dotenv
    load_dotenv(".env", override=True)
    return os.getenv("WHATSAPP_TOKEN", "")


# ─────────────────────────────────────────────
# SOPORTE DE IMÁGENES — Gemini Vision
# ─────────────────────────────────────────────

def _descargar_media(media_id: str, token: str) -> bytes:
    r = httpx.get(
        f"https://graph.facebook.com/v22.0/{media_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    r.raise_for_status()
    media_url = r.json().get("url", "")
    if not media_url:
        raise Exception("No se pudo obtener la URL de la imagen")
    r2 = httpx.get(
        media_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    r2.raise_for_status()
    return r2.content


def _analizar_imagen_con_gemini(image_bytes: bytes, caption: str = "") -> str:
    from google import genai
    from google.genai import types
    from config.keys import GEMINI_API_KEY

    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY no configurada — agregala en .env")

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = (
        "Sos un asistente técnico senior de React Native, TypeScript y Expo.\n"
        "Analizá esta captura de pantalla en detalle.\n\n"
        "Listá todo lo que ves:\n"
        "- Mensajes de error completos (texto exacto, código de error, número de línea)\n"
        "- Rutas de archivos afectados\n"
        "- Tipo de error (TypeScript, módulo faltante, runtime, etc.)\n"
        "- Fragmentos de código visibles relevantes\n\n"
        "Respondé en español con el máximo detalle para que un agente de desarrollo "
        "pueda resolver el problema sin ver la imagen."
        + (f"\n\nContexto del usuario: {caption}" if caption else "")
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            types.Part.from_text(text=prompt),
        ],
    )
    return response.text


def _procesar_imagen_whatsapp(media_id: str, caption: str, sender: str) -> str:
    token = get_token()
    logger.info(f"📸 Procesando imagen (id={media_id})")
    image_bytes = _descargar_media(media_id, token)
    logger.info(f"   Descargada: {len(image_bytes)} bytes")
    descripcion = _analizar_imagen_con_gemini(image_bytes, caption)
    logger.info(f"   Gemini Vision: {descripcion[:100]}...")
    return descripcion


# ─────────────────────────────────────────────
# WEBHOOK
# ─────────────────────────────────────────────

@app.get("/webhook")
async def verify(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    if hub_mode == "subscribe" and hub_verify_token == WHATSAPP_VERIFY_TOKEN:
        logger.info("✅ Webhook verificado")
        return PlainTextResponse(hub_challenge)
    raise HTTPException(status_code=403, detail="Token inválido")


@app.post("/webhook")
async def receive(request: Request):
    global _job_thread
    body = await request.json()

    try:
        entry    = body["entry"][0]["changes"][0]["value"]
        msg      = entry["messages"][0]
        sender   = msg["from"]
        msg_type = msg.get("type", "text")
    except (KeyError, IndexError):
        return {"status": "ignored"}

    text = ""

    if msg_type == "text":
        text = msg.get("text", {}).get("body", "").strip()

    elif msg_type == "image":
        media_id = msg["image"]["id"]
        caption  = msg["image"].get("caption", "").strip()
        send_text(sender, "📸 Imagen recibida. Analizando con Gemini Vision...")
        try:
            descripcion = _procesar_imagen_whatsapp(media_id, caption, sender)
            text = descripcion
            if caption:
                text = f"Instrucción del usuario: {caption}\n\nContenido de la imagen:\n{descripcion}"
        except Exception as e:
            logger.error(f"Error procesando imagen: {e}")
            send_text(sender, f"❌ No pude analizar la imagen: {str(e)[:150]}\nDescribí el error en texto.")
            return {"status": "image_error"}

    else:
        send_text(sender, "⚠️ Solo acepto texto o capturas de pantalla.")
        return {"status": "unsupported"}

    if not text:
        return {"status": "empty"}

    logger.info(f"📩 [{sender}] {text[:80]}")

    with _lock:
        if _job_thread and _job_thread.is_alive():
            send_text(sender, "⚙️ Ya hay un trabajo corriendo. Esperá que termine.")
            return {"status": "busy"}

        # Preview de lo que va a hacer
        send_text(sender,
            f"✅ *Recibido*\n\n_{text[:120]}_\n\n"
            f"🏗️ Planificando...\n💻 Escribiendo código...\n🔍 Auditando...\n\n"
            f"⏳ Te aviso cuando esté listo."
        )

        objective   = APP_CONTEXT + "\nTAREA:\n" + text
        _job_thread = threading.Thread(target=_run_agent, args=(objective, sender), daemon=True)
        _job_thread.start()

    return {"status": "processing"}


# ─────────────────────────────────────────────
# ESTADO
# ─────────────────────────────────────────────

@app.get("/status")
async def status():
    running = _job_thread is not None and _job_thread.is_alive()
    if not _last_status:
        return {"status": "idle"}
    return {
        "status":       "running" if running else "completed",
        "iteration":    _last_status.iteration,
        "tasks_done":   _last_status.done_tasks,
        "tasks_failed": _last_status.failed_tasks,
        "completed":    _last_status.completed,
        "error":        _last_status.error,
    }

@app.get("/health")
async def health():
    return {"status": "ok", "version": "5.0"}


# ─────────────────────────────────────────────
# AGENTE
# ─────────────────────────────────────────────

def _run_agent(objective: str, sender: str):
    global _last_status
    from engine.loop import AgentLoop
    project_path = WORKSPACE_DIR
    loop = AgentLoop(project_path=project_path)
    try:
        s = loop.run(objective)
        _last_status = s
        if s.completed:
            msg = (
                f"🎉 *Completado*\n\n"
                f"✅ Tareas OK: {s.done_tasks}\n"
                f"❌ Fallidas: {s.failed_tasks}\n"
                f"💾 Commits: {len(s.commit_shas)}"
            )
        else:
            msg = (
                f"⚠️ *Finalizado*\n\n"
                f"✅ Tareas OK: {s.done_tasks}\n"
                f"❌ Fallidas: {s.failed_tasks}"
            )
            if s.error:
                msg += f"\n\n🔴 Error: {s.error[:150]}"
    except Exception as e:
        logger.exception("Error en _run_agent")
        msg = f"❌ Error inesperado: {str(e)[:200]}"
    send_text(sender, msg)


# ─────────────────────────────────────────────
# ENVÍO DE MENSAJES
# ─────────────────────────────────────────────

def send_text(to: str, text: str) -> bool:
    token    = get_token()
    phone_id = WHATSAPP_PHONE_ID
    if not token or not phone_id or "PEGAR" in token:
        logger.info(f"[SIM → {to}]: {text[:80]}")
        return False
    to_clean = to.strip().replace("+", "").replace(" ", "")
    try:
        r = httpx.post(
            f"https://graph.facebook.com/v22.0/{phone_id}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": to_clean,
                "type": "text",
                "text": {"body": text, "preview_url": False},
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        if r.status_code == 200:
            logger.info(f"✅ Enviado → {to_clean}")
            return True
        data = r.json()
        error_code = data.get("error", {}).get("code", 0)
        logger.error(f"WhatsApp {r.status_code} #{error_code}: {r.text[:200]}")
        if r.status_code == 401:
            logger.error("TOKEN EXPIRADO → python main.py renovar TOKEN")
        elif error_code == 131030:
            return _try_alternative_format(to_clean, text, token, phone_id)
        return False
    except Exception as e:
        logger.error(f"send_text error: {e}")
        return False


def _try_alternative_format(numero: str, text: str, token: str, phone_id: str) -> bool:
    alternativas = set()
    if numero.startswith("549"):
        alternativas.add("54" + numero[3:])
    elif numero.startswith("54") and not numero.startswith("549"):
        alternativas.add("549" + numero[2:])
    if len(numero) > 10:
        alternativas.add(numero[-10:])
    for alt in alternativas:
        try:
            r = httpx.post(
                f"https://graph.facebook.com/v22.0/{phone_id}/messages",
                json={
                    "messaging_product": "whatsapp",
                    "to": alt,
                    "type": "text",
                    "text": {"body": text, "preview_url": False},
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                timeout=15,
            )
            if r.status_code == 200:
                logger.info(f"✅ Enviado (alt) → {alt}")
                return True
        except Exception:
            pass
    return False