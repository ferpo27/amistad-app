"""
main.py — AI Dev Agent v4
Uso:
  python main.py server              → Arranca servidor (sin preguntas)
  python main.py renovar TOKEN       → Convierte token Meta a 60 días
  python main.py check               → Verifica configuración
  python main.py run "objetivo"      → Prueba sin WhatsApp
"""
import argparse, logging, sys, os
from pathlib import Path

APP_ID     = "1446519646915953"
APP_SECRET = "f64892d60d358119822edbccaf9726e2"

def setup_logging():
    Path("logs").mkdir(exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("logs/agent.log", encoding="utf-8"),
        ],
    )
    for noisy in ["httpx","httpcore","uvicorn.access"]:
        logging.getLogger(noisy).setLevel(logging.WARNING)

def save_token_env(token: str):
    env_path = Path(".env")
    content  = env_path.read_text(encoding="utf-8")
    lines    = []
    replaced = False
    for line in content.splitlines():
        if line.startswith("WHATSAPP_TOKEN="):
            lines.append(f"WHATSAPP_TOKEN={token}")
            replaced = True
        else:
            lines.append(line.rstrip())
    if not replaced:
        lines.append(f"WHATSAPP_TOKEN={token}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    os.environ["WHATSAPP_TOKEN"] = token

def cmd_renovar(token_corto: str = ""):
    import httpx
    if not token_corto:
        from dotenv import load_dotenv
        load_dotenv(".env", override=True)
        token_corto = os.getenv("WHATSAPP_TOKEN", "").strip()
    if not token_corto:
        print("❌ No hay token. Uso: python main.py renovar TOKEN_DE_META")
        sys.exit(1)
    print("🔄 Convirtiendo token a 60 días...")
    try:
        r = httpx.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "grant_type":        "fb_exchange_token",
                "client_id":         APP_ID,
                "client_secret":     APP_SECRET,
                "fb_exchange_token": token_corto,
            },
            timeout=15,
        )
        data = r.json()
        if "access_token" in data:
            token_largo = data["access_token"]
            save_token_env(token_largo)
            print(f"✅ Token de 60 días guardado en .env")
            print(f"   {token_largo[:50]}...")
            print(f"\n✅ Listo! Arrancá el server: python main.py server")
        else:
            print(f"❌ Error de Meta: {data}")
            print("   Guardando token original como fallback...")
            save_token_env(token_corto)
            print("   Token guardado. Durará ~1 hora.")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("   Guardando token original...")
        save_token_env(token_corto)

def cmd_check():
    from config import keys
    print("\n🔍 Verificando configuración...\n")
    checks = [
        ("GROQ_API_KEY",         keys.GROQ_API_KEY,         True),
        ("WHATSAPP_TOKEN",       keys.WHATSAPP_TOKEN,       True),
        ("WHATSAPP_PHONE_ID",    keys.WHATSAPP_PHONE_ID,    True),
        ("WHATSAPP_VERIFY_TOKEN",keys.WHATSAPP_VERIFY_TOKEN,False),
        ("GITHUB_TOKEN",         keys.GITHUB_TOKEN,         False),
        ("GITHUB_REPO_URL",      keys.GITHUB_REPO_URL,      False),
        ("GROQ_MODEL",           keys.GROQ_MODEL,           False),
    ]
    all_ok = True
    for name, value, required in checks:
        if value and "PEGAR" not in value:
            display = value[:12]+"..." if len(value)>12 else value
            print(f"  ✅ {name}: {display}")
        else:
            mark = "❌" if required else "⚠️ "
            print(f"  {mark} {name}: NO CONFIGURADO{'  ← REQUERIDO' if required else ''}")
            if required: all_ok = False
    print(f"\n  🤖 Modelo: {keys.GROQ_MODEL}")
    print(f"  📁 Workspace: {keys.WORKSPACE_DIR}\n")
    if all_ok: print("✅ Todo OK\n")
    else: print("❌ Faltan variables críticas\n"); sys.exit(1)

def cmd_server():
    import uvicorn
    from whatsapp.server import app
    logger = logging.getLogger(__name__)
    logger.info("🚀 Servidor iniciando en http://localhost:8000")
    logger.info("📡 Exponé con ngrok: ngrok http 8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")

def cmd_run(objective: str):
    from config.keys import WORKSPACE_DIR
    from engine.loop import AgentLoop
    projects = [p for p in WORKSPACE_DIR.iterdir() if p.is_dir()] if WORKSPACE_DIR.exists() else []
    project_path = projects[0] if projects else WORKSPACE_DIR
    loop = AgentLoop(project_path=project_path,
                     on_progress=lambda s: print(s.log[-1]) if s.log else None)
    status = loop.run(objective)
    print("\n"+"="*50)
    print(f"{'✅ COMPLETADO' if status.completed else '⚠️  FINALIZADO'} | Tareas: {status.done_tasks}/{status.total_tasks}")
    if status.error: print(f"   Error: {status.error}")

if __name__ == "__main__":
    setup_logging()
    parser = argparse.ArgumentParser(description="AI Dev Agent v4")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("server")
    sub.add_parser("check")
    ren_p = sub.add_parser("renovar")
    ren_p.add_argument("token", nargs="?", default="")
    run_p = sub.add_parser("run")
    run_p.add_argument("objective")
    args = parser.parse_args()
    if args.cmd == "server":    cmd_server()
    elif args.cmd == "renovar": cmd_renovar(args.token)
    elif args.cmd == "run":     cmd_run(args.objective)
    elif args.cmd == "check":   cmd_check()
    else:                       parser.print_help()
