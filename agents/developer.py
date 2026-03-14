import logging, re
from typing import Optional
from agents.models import Task
from agents.base import GroqBase
logger = logging.getLogger(__name__)

DEV_SYS = """Sos un desarrollador senior. REGLAS CRÍTICAS:
1. Devolvé ÚNICAMENTE el código. Sin explicaciones, sin markdown, sin ```.
2. Código COMPLETO y FUNCIONAL. Sin TODOs vacíos.
3. Para archivos .md devolvé texto markdown completo, NO código Python.
4. Implementá EXACTAMENTE lo pedido."""

class Developer(GroqBase):
    def __init__(self):
        super().__init__()
        logger.info(f"Desarrollador listo | {self.model}")

    def generate(self, task: Task, existing: Optional[str], summary: str) -> str:
        logger.info(f"💻 [{task.id}] {task.title} → {task.file_path}")
        ext = task.file_path.rsplit(".", 1)[-1].lower() if "." in task.file_path else ""
        
        # Instrucción especial para README
        extra = ""
        if ext == "md":
            extra = "\nIMPORTANTE: Generá un README.md completo con secciones: descripción, instalación, uso, estructura. Mínimo 20 líneas.\n"

        prompt = (
            f"Archivo: {task.file_path}\n"
            f"Tarea: {task.description}\n"
            f"Notas: {task.tech_notes}\n"
            f"Contexto del proyecto: {summary[:600]}\n"
            f"{extra}"
        )
        if existing:
            prompt += f"\nArchivo actual (modificar):\n{existing[:2000]}\n"

        code = self._clean(self._chat(DEV_SYS, prompt, max_tokens=4096, temp=0.2), task.file_path)
        logger.info(f"Código: {len(code)} chars")
        return code

    def _clean(self, code: str, fp: str) -> str:
        ext_map = {".py":"python",".js":"javascript",".ts":"typescript",".html":"html",
                   ".css":"css",".json":"json",".yml":"yaml",".yaml":"yaml",".sh":"bash",".md":"markdown"}
        ext = ("."+fp.rsplit(".",1)[-1]) if "." in fp else ""
        lang = ext_map.get(ext,"")
        for pat in [rf"^```{lang}\s*\n(.*?)```\s*$", r"^```\w*\s*\n(.*?)```\s*$"]:
            m = re.search(pat, code, re.DOTALL|re.MULTILINE)
            if m: return m.group(1).rstrip()
        return code.strip()
