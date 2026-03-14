import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)

# ── Groq (fallback gratuito) ──────────────────────────────────────────────────
GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL    = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ── Gemini (principal si está configurado) ────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# ── WhatsApp ──────────────────────────────────────────────────────────────────
WHATSAPP_TOKEN        = os.getenv("WHATSAPP_TOKEN", "")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "miagente2024")
WHATSAPP_PHONE_ID     = os.getenv("WHATSAPP_PHONE_ID", "")
WHATSAPP_RECIPIENT    = os.getenv("WHATSAPP_RECIPIENT", "")

# ── GitHub ────────────────────────────────────────────────────────────────────
GITHUB_TOKEN    = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO_URL = os.getenv("GITHUB_REPO_URL", "")
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME", "")
GITHUB_EMAIL    = os.getenv("GITHUB_EMAIL", "ai-agent@example.com")

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent.parent
WORKSPACE_DIR = Path(os.getenv("WORKSPACE_DIR", str(BASE_DIR / "workspace" / "projects")))
LOGS_DIR      = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)
WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

# ── Engine ────────────────────────────────────────────────────────────────────
MAX_ITERATIONS     = int(os.getenv("MAX_ITERATIONS", "10"))
MAX_TASKS_PER_PLAN = int(os.getenv("MAX_TASKS_PER_PLAN", "8"))
MAX_AUDIT_RETRIES  = int(os.getenv("MAX_AUDIT_RETRIES", "3"))
AUDIT_MIN_SCORE    = int(os.getenv("AUDIT_MIN_SCORE", "75"))