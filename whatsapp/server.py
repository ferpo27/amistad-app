import logging, threading, os
from typing import Optional
import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from config.keys import WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_ID, WORKSPACE_DIR

logger = logging.getLogger(__name__)
app    = FastAPI(title="AI Dev Agent v4", version="4.0")

_job_thread: Optional[threading.Thread] = None
_last_status = None
_lock = threading.Lock()

APP_CONTEXT = """
CONTEXTO DEL PROYECTO:
- Nombre: Amistad App
- Tecnología: React Native + Expo + TypeScript + Supabase
- Carpeta raíz: C:\\Users\\ferna\\Documents\\app
- Estructura principal:
  * app/ → pantallas Expo Router (tabs, auth, onboarding)
  * src/storage/ → funciones de almacenamiento (AsyncStorage + Supabase)
  * src/bots/ → lógica de bots con Gemini/Claude AI
  * src/lib/supabase.ts → cliente Supabase centralizado (export { supabase })
  * src/storage.ts → archivo PRINCIPAL de storage (NO tocar su estructura)
  * src/safety.ts → reportar y bloquear usuarios
  * src/hooks/ → hooks de React
  * src/translate/ → traducción automática
  * src/mock/ → datos de prueba (NO modificar)

REGLAS CRÍTICAS — NO HACER JAMÁS:
- NO crear archivos en src/storage/ separados para funciones que ya están en src/storage.ts
- NO crear carpetas src/safety/, src/storage/chatStorage/, src/storage/profilesStorage/
- NO usar import supabase from (default import) — siempre usar import { supabase } from
- NO hardcodear credenciales como "tu-supabase-secret" o strings literales de keys
- NO importar desde módulos que no existen: ../api/chat, ../utils/matches, ../api/user, ../hooks/useUser, ../styles, ../services/api, react-native-paper, react-native-keyboard-aware-scroll-view
- NO modificar: src/mock/, src/storage.ts (solo leer), app/(tabs)/chat/[id].tsx (solo si es necesario)
- Para borrar archivos usar action="delete" en el plan

ARCHIVOS CLAVE QUE YA FUNCIONAN (NO REESCRIBIR):
- src/lib/supabase.ts — cliente Supabase con export { supabase }
- src/storage.ts — storage principal con AsyncStorage
- src/safety.ts — con export { getBlockedList, blockUser, reportUser, ReportReason }
- src/storage/profilesStorage.ts — con export { upsertMyProfile, uploadProfilePhoto, getDiscoveryProfiles }
- src/storage/chatStorage.ts — chat realtime con Supabase
- src/bots/botReply.ts — con export { getBotReply }

"""

def get_token():
    from dotenv import load_dotenv
    load_dotenv(".env", override=True)
    return os.getenv("WHATSAPP_TOKEN", "")

@app.get("/webhook")
async def verify(hub_mode: str=Query(None,alias="hub.mode"),
                 hub_challenge: str=Query(None,alias="hub.challenge"),
                 hub_verify_token: str=Query(None,alias="hub.verify_token")):
    if hub_mode == "subscribe" and hub_verify_token == WHATSAPP_VERIFY_TOKEN:
        logger.info("✅ Webhook verificado por Meta")
        return PlainTextResponse(hub_challenge)
    raise HTTPException(status_code=403, detail="Token inválido")

@app.post("/webhook")
async def receive(request: Request):
    global _job_thread
    body = await request.json()
    try:
        entry  = body["entry"][0]["changes"][0]["value"]
        msg    = entry["messages"][0]
        sender = msg["from"]
        text   = msg.get("text",{}).get("body","").strip()
    except (KeyError, IndexError):
        return {"status": "ignored"}
    if not text: return {"status": "no_text"}
    logger.info(f"📩 Mensaje de {sender}: '{text[:100]}'")
    with _lock:
        if _job_thread and _job_thread.is_alive():
            send_text(sender, "⚙️ Ya hay un trabajo en progreso. Esperá que termine.")
            return {"status": "busy"}
        send_text(sender,
            f"✅ *Pedido recibido*\n\n_{text[:150]}_\n\n"
            f"🏗️ Planificando...\n💻 Generando código...\n🔍 Auditando...\n\n"
            f"⏳ Te aviso cuando esté listo.")
        objective = APP_CONTEXT + "\nTAREA DEL USUARIO:\n" + text
        _job_thread = threading.Thread(target=_run_agent, args=(objective, sender), daemon=True)
        _job_thread.start()
    return {"status": "processing"}

@app.get("/status")
async def status():
    running = _job_thread is not None and _job_thread.is_alive()
    if not _last_status: return {"status": "idle"}
    return {"status": "running" if running else "completed",
            "iteration": _last_status.iteration,
            "tasks_done": _last_status.done_tasks,
            "completed": _last_status.completed,
            "error": _last_status.error}

@app.get("/health")
async def health():
    return {"status": "ok", "version": "4.0"}

def _run_agent(objective: str, sender: str):
    global _last_status
    from engine.loop import AgentLoop
    project_path = WORKSPACE_DIR
    loop = AgentLoop(project_path=project_path)
    try:
        status = loop.run(objective)
        _last_status = status
        if status.completed:
            msg = (f"🎉 *¡Proyecto completado!*\n\n"
                   f"📋 Tareas: {status.done_tasks}/{status.total_tasks}\n"
                   f"💾 Commits: {len(status.commit_shas)}\n"
                   f"📁 Carpeta: `{project_path.name}`\n\n✅ Código listo")
        else:
            msg = f"⚠️ *Finalizado*\n📋 Tareas: {status.done_tasks}/{status.total_tasks}"
            if status.error: msg += f"\n❌ {status.error[:200]}"
    except Exception as e:
        logger.exception("Error en _run_agent")
        msg = f"❌ Error: {str(e)[:200]}"
    send_text(sender, msg)

def send_text(to: str, text: str) -> bool:
    token    = get_token()
    phone_id = WHATSAPP_PHONE_ID
    if not token or not phone_id or "PEGAR" in token:
        logger.info(f"[SIM → {to}]: {text[:80]}")
        return False
    to_clean = to.strip().replace("+","").replace(" ","")
    try:
        r = httpx.post(
            f"https://graph.facebook.com/v22.0/{phone_id}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": to_clean,
                "type": "text",
                "text": {"body": text, "preview_url": False}
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            timeout=15,
        )
        if r.status_code == 200:
            logger.info(f"✅ Enviado → {to_clean}")
            return True
        data = r.json()
        error_code = data.get("error", {}).get("code", 0)
        logger.error(f"WhatsApp error {r.status_code} #{error_code}: {r.text[:300]}")
        if r.status_code == 401:
            logger.error("⚠️  TOKEN EXPIRADO → python main.py renovar TOKEN")
        elif error_code == 131030:
            logger.warning(f"#131030 con {to_clean} → intentando formato alternativo...")
            return _try_alternative_format(to_clean, text, token, phone_id)
        return False
    except Exception as e:
        logger.error(f"Error send_text: {e}")
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
        logger.info(f"   Probando con: {alt}")
        try:
            r = httpx.post(
                f"https://graph.facebook.com/v22.0/{phone_id}/messages",
                json={
                    "messaging_product": "whatsapp",
                    "to": alt,
                    "type": "text",
                    "text": {"body": text, "preview_url": False}
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=15,
            )
            if r.status_code == 200:
                logger.info(f"✅ Enviado con formato alternativo → {alt}")
                return True
            logger.warning(f"   Falló {alt}: {r.status_code}")
        except Exception as e:
            logger.warning(f"   Error con {alt}: {e}")
    logger.error("❌ Todos los formatos fallaron.")
    return False