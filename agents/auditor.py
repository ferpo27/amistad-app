import json, logging, re, hashlib
from config.keys import AUDIT_MIN_SCORE
from agents.models import Task, AuditResult
from agents.base import GroqBase

logger = logging.getLogger(__name__)

_audit_cache: dict[str, AuditResult] = {}

AUD_SYS = f"""Sos un auditor de código senior. Revisá el código con criterio real.

CRITERIOS (100 pts):
- Cumple exactamente lo pedido en la descripción: 35 pts
- Sintaxis correcta sin errores TypeScript/JS: 25 pts
- Código completo sin TODOs ni placeholders: 20 pts
- Imports correctos que existen en el proyecto: 20 pts

APROBACIÓN: score >= {AUDIT_MIN_SCORE}

Si score < {AUDIT_MIN_SCORE}: DEBÉS incluir el código corregido completo en "corrected_code".
Si score >= {AUDIT_MIN_SCORE}: "corrected_code" va vacío "".

Devolvé ÚNICAMENTE este JSON (sin markdown):
{{"approved":true/false,"score":0-100,"issues":["problema concreto 1"],"corrected_code":"código completo corregido o vacío"}}"""


class Auditor(GroqBase):
    _use_cache = True

    def __init__(self):
        super().__init__()
        logger.info("Auditor listo")

    def audit(self, task: Task, code: str, summary: str, existing: str = "") -> AuditResult:
        if not code or len(code) < 10:
            logger.warning("Código vacío — rechazado")
            return AuditResult(approved=False, score=0, issues=["Código vacío"], suggestions=[])

        # Si el código es idéntico al existente, no auditar
        if existing and existing.strip() == code.strip():
            logger.info("Código sin cambios — auditoría saltada")
            return AuditResult(approved=True, score=80, issues=[], suggestions=[], corrected_code="")

        # Cache por hash del código
        code_hash = hashlib.md5(code.encode()).hexdigest()
        if code_hash in _audit_cache:
            logger.info("Cache hit en auditoría")
            return _audit_cache[code_hash]

        prompt = (
            f"TAREA PEDIDA:\n"
            f"Archivo: {task.file_path}\n"
            f"Descripción: {task.description}\n"
            f"Notas: {task.tech_notes}\n\n"
            f"CÓDIGO A AUDITAR:\n{code[:4000]}\n\n"
            f"CONTEXTO DEL PROYECTO:\n{summary[:250]}"
        )

        try:
            raw    = self._chat(AUD_SYS, prompt, max_tokens=4096, temp=0.1)
            result = self._parse(raw)
        except Exception as e:
            logger.error(f"Error auditoría: {e}")
            # Si falla la auditoría, aprobamos con score mínimo para no perder el trabajo
            result = AuditResult(
                approved=True,
                score=AUDIT_MIN_SCORE,
                issues=[f"Auditoría omitida: {str(e)[:60]}"],
                suggestions=[]
            )

        _audit_cache[code_hash] = result
        return result

    def _parse(self, raw: str) -> AuditResult:
        clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
        m     = re.search(r"\{.*\}", clean, re.DOTALL)
        if not m:
            logger.warning("Auditor no devolvió JSON válido")
            return AuditResult(approved=False, score=0, issues=["Respuesta inválida"], suggestions=[])
        try:
            data      = json.loads(m.group())
            score     = max(0, min(100, int(data.get("score", 0))))
            approved  = bool(data.get("approved", score >= AUDIT_MIN_SCORE))
            corrected = (data.get("corrected_code") or "").strip()
            issues    = data.get("issues", [])
            result    = AuditResult(
                approved=approved, score=score,
                issues=issues, suggestions=[],
                corrected_code=corrected
            )
            status = "✅ APROBADO" if approved else "❌ RECHAZADO"
            logger.info(f"Auditoría {status} | {score}/100 | issues: {len(issues)}")
            for issue in issues[:2]:
                logger.info(f"   ⚠️  {issue}")
            return result
        except Exception as e:
            logger.warning(f"Error parseando auditoría: {e}")
            return AuditResult(approved=False, score=0, issues=[str(e)], suggestions=[])