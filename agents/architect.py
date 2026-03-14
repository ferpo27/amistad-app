import json, logging, re
from config.keys import MAX_TASKS_PER_PLAN
from agents.models import Task
from agents.base import GroqBase
logger = logging.getLogger(__name__)

PLAN_SYS = f"""Sos un arquitecto de software. Analizá el objetivo y generá un plan con tareas.
REGLAS:
- Una tarea = un archivo real con extensión.
- Máximo {MAX_TASKS_PER_PLAN} tareas.
- NO incluyas tareas de "estructura", "testing", "depurar" o sin extensión de archivo.
- Si el objetivo dice BORRAR o ELIMINAR archivos, usá action="delete".
- Si el objetivo dice MODIFICAR un archivo existente, usá action="modify".
- Si el objetivo dice CREAR un archivo nuevo, usá action="create".
- Para tareas de borrado el campo description debe decir exactamente "BORRAR ARCHIVO".
Devolvé ÚNICAMENTE este JSON válido (sin markdown):
{{"tasks":[{{"id":1,"title":"título","description":"qué hace","file_path":"carpeta/archivo.ext","action":"create","tech_notes":"detalles técnicos","depends_on":[]}}]}}"""

EVAL_SYS = """Revisá si el proyecto cumplió el objetivo. Devolvé SOLO este JSON (sin markdown):
{"completed":true/false,"score":0-100,"reason":"explicación breve","remaining":"qué falta"}"""

class Architect(GroqBase):
    def __init__(self):
        super().__init__()
        logger.info(f"Arquitecto listo | {self.model}")

    def create_plan(self, summary: str, objective: str) -> list[Task]:
        logger.info("🏗️  Arquitecto generando plan...")
        prompt = f"OBJETIVO: {objective}\n\nARCHIVOS EXISTENTES:\n{summary}\n\nGenerá el plan de tareas para cumplir el objetivo."
        raw = self._chat(PLAN_SYS, prompt, max_tokens=2048, temp=0.3)
        tasks = self._parse(raw)
        logger.info(f"Plan: {len(tasks)} tareas")
        return tasks

    def evaluate(self, summary: str, objective: str) -> dict:
        try:
            prompt = f"OBJETIVO: {objective}\n\nARCHIVOS DEL PROYECTO:\n{summary}"
            raw = self._chat(EVAL_SYS, prompt, max_tokens=256, temp=0.1)
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if m:
                result = json.loads(m.group())
                logger.info(f"Evaluación: {result.get('score',0)}/100")
                return result
        except Exception as e:
            logger.warning(f"Error evaluando: {e}")
        return {"completed": False, "score": 0, "reason": "Error", "remaining": ""}

    def _parse(self, raw: str) -> list[Task]:
        clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
        m = re.search(r"\{.*\}", clean, re.DOTALL)
        if not m:
            return []
        try:
            data = json.loads(m.group())
        except Exception:
            return []
        tasks = []
        for t in data.get("tasks", [])[:MAX_TASKS_PER_PLAN]:
            fp = (t.get("file_path") or "").strip()
            if not fp or "." not in fp.split("/")[-1]:
                continue
            action = t.get("action", "create").lower()
            tasks.append(Task(
                id=int(t.get("id", len(tasks)+1)),
                title=t.get("title", "Sin título"),
                description=t.get("description", ""),
                file_path=fp,
                action=action,
                tech_notes=t.get("tech_notes", ""),
                depends_on=[int(x) for x in t.get("depends_on", [])],
            ))
        return tasks