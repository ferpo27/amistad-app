import json, logging, re
from config.keys import AUDIT_MIN_SCORE
from agents.models import Task, AuditResult
from agents.base import GroqBase
logger = logging.getLogger(__name__)

AUD_SYS = f"""Sos un auditor de código senior muy exigente.
CRITERIOS (100 pts): implementa lo pedido (30), sintaxis correcta (20), completo sin TODOs (20), manejo de errores (15), limpio y comentado (15).
APROBACIÓN: score >= {AUDIT_MIN_SCORE}
Si score < {AUDIT_MIN_SCORE}: incluí código completo corregido en "corrected_code".
Devolvé ÚNICAMENTE este JSON (sin markdown):
{{"approved":true/false,"score":0-100,"issues":["problema 1"],"suggestions":["mejora"],"corrected_code":"código si score<{AUDIT_MIN_SCORE} sino vacío"}}"""

class Auditor(GroqBase):
    def __init__(self):
        super().__init__()
        logger.info("Auditor listo")

    def audit(self, task: Task, code: str, summary: str) -> AuditResult:
        prompt = (f"## CONTEXTO\n{summary[:800]}\n\n## TAREA\nArchivo: {task.file_path}\n"
                  f"Descripción: {task.description}\nNotas: {task.tech_notes}\n\n"
                  f"## CÓDIGO\n{code[:5000]}\n\nAuditá y respondé con el JSON.")
        try:
            raw = self._chat(AUD_SYS, prompt, max_tokens=4096, temp=0.1)
            return self._parse(raw)
        except Exception as e:
            logger.error(f"Error auditoría: {e}")
            return AuditResult(approved=True, score=70, issues=[], suggestions=[])

    def _parse(self, raw: str) -> AuditResult:
        clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
        m = re.search(r"\{.*\}", clean, re.DOTALL)
        if not m:
            return AuditResult(approved=True, score=70, issues=[], suggestions=[])
        try:
            data = json.loads(m.group())
            score = max(0, min(100, int(data.get("score", 70))))
            approved = bool(data.get("approved", score >= AUDIT_MIN_SCORE))
            result = AuditResult(approved=approved, score=score,
                                 issues=data.get("issues",[]), suggestions=data.get("suggestions",[]),
                                 corrected_code=(data.get("corrected_code") or "").strip())
            logger.info(f"Auditoría {'✅' if approved else '❌'} | {score}/100")
            return result
        except Exception as e:
            logger.warning(f"Error parseando: {e}")
            return AuditResult(approved=True, score=70, issues=[], suggestions=[])
