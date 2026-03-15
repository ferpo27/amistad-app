import json, logging, re
from config.keys import MAX_TASKS_PER_PLAN
from agents.models import Task
from agents.base import GroqBase

logger = logging.getLogger(__name__)

PLAN_SYS = f"""Sos un arquitecto de software ESTRICTO. Tu único trabajo es traducir el pedido en tareas concretas.

REGLAS ABSOLUTAS:
1. Hacé EXACTAMENTE lo que pide el usuario. Ni más, ni menos.
2. Una tarea = un archivo real con extensión.
3. Máximo {MAX_TASKS_PER_PLAN} tareas.
4. NUNCA incluyas tareas de testing, estructura, documentación o deploy salvo que se pidan explícitamente.
5. Si dice BORRAR: action="delete". Si dice MODIFICAR: action="modify". Si dice CREAR: action="create".
6. Si hay archivos prohibidos en el prompt, NO los incluyas jamás.
7. Si no hay nada concreto para hacer, devolvé {{"tasks":[]}}

Devolvé ÚNICAMENTE este JSON (sin markdown, sin texto extra):
{{"tasks":[{{"id":1,"title":"título corto","description":"qué hace exactamente","file_path":"ruta/exacta/archivo.ext","action":"create|modify|delete","tech_notes":"detalles","depends_on":[]}}]}}"""

EVAL_SYS = """Evaluá si se cumplió exactamente lo que el usuario pidió mirando el contenido de los archivos.
Devolvé SOLO este JSON (sin markdown):
{"completed":true/false,"score":0-100,"reason":"qué se hizo o qué falta","remaining":"qué falta exactamente"}"""


class Architect(GroqBase):
    _use_cache = True  # El arquitecto sí cachea (evaluar/planificar)

    def __init__(self):
        super().__init__()
        logger.info(f"Arquitecto listo | {self.model}")

    def create_plan(self, summary: str, objective: str, protected: list[str] = []) -> list[Task]:
        logger.info("🏗️  Arquitecto generando plan...")

        protected_block = ""
        if protected:
            protected_block = "\n\nARCHIVOS PROHIBIDOS — NO incluir en el plan:\n" + "\n".join(f"- {p}" for p in protected)

        prompt = (
            f"PEDIDO DEL USUARIO:\n{objective}\n\n"
            f"ARCHIVOS EXISTENTES:\n{summary}"
            f"{protected_block}\n\n"
            "Generá el plan MÍNIMO y EXACTO."
        )
        raw   = self._chat(PLAN_SYS, prompt, max_tokens=1024, temp=0.1)
        tasks = self._parse(raw)

        # Filtro físico de protegidos
        if protected:
            norm  = lambda p: p.strip().replace("\\", "/").lower()
            antes = len(tasks)
            tasks = [t for t in tasks if norm(t.file_path) not in [norm(p) for p in protected]]
            if len(tasks) < antes:
                logger.warning(f"🛡️  {antes - len(tasks)} tarea(s) bloqueadas por protección")

        logger.info(f"Plan final: {len(tasks)} tareas")
        return tasks

    def evaluate(self, summary: str, objective: str) -> dict:
        try:
            prompt = f"PEDIDO ORIGINAL:\n{objective}\n\nESTADO ACTUAL DEL PROYECTO (incluye contenido de archivos clave):\n{summary}"
            raw    = self._chat(EVAL_SYS, prompt, max_tokens=256, temp=0.1)
            m      = re.search(r"\{.*\}", raw, re.DOTALL)
            if m:
                result = json.loads(m.group())
                logger.info(f"Evaluación: {result.get('score', 0)}/100 — {result.get('reason', '')[:80]}")
                return result
        except Exception as e:
            logger.warning(f"Error evaluando: {e}")
        return {"completed": False, "score": 0, "reason": "Error", "remaining": ""}

    def _parse(self, raw: str) -> list[Task]:
        clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
        m     = re.search(r"\{.*\}", clean, re.DOTALL)
        if not m:
            logger.warning("Arquitecto no devolvió JSON válido")
            return []
        try:
            data = json.loads(m.group())
        except Exception as e:
            logger.warning(f"JSON inválido: {e}")
            return []
        tasks = []
        for t in data.get("tasks", [])[:MAX_TASKS_PER_PLAN]:
            fp = (t.get("file_path") or "").strip()
            if not fp or "." not in fp.split("/")[-1]:
                continue
            action = t.get("action", "create").lower()
            if action not in ("create", "modify", "delete"):
                action = "create"
            tasks.append(Task(
                id=int(t.get("id", len(tasks) + 1)),
                title=t.get("title", "Sin título"),
                description=t.get("description", ""),
                file_path=fp,
                action=action,
                tech_notes=t.get("tech_notes", ""),
                depends_on=[int(x) for x in t.get("depends_on", [])],
            ))
        return tasks