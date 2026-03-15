import logging, re
from typing import Optional
from agents.models import Task
from agents.base import GroqBase

logger = logging.getLogger(__name__)

DEV_SYS = """Sos un desarrollador senior experto en React Native, TypeScript y Expo.

REGLAS CRÍTICAS — NO NEGOCIABLES:
1. Devolvé ÚNICAMENTE el código completo del archivo. Sin explicaciones, sin markdown, sin ```.
2. El código debe ser COMPLETO y FUNCIONAL. Sin TODOs, sin placeholders, sin comentarios vacíos.
3. Si la acción es MODIFY: respetá la estructura existente, cambiá SOLO lo necesario para resolver el problema.
4. Si la acción es CREATE: código completo listo para usar desde el día 1.
5. Implementá EXACTAMENTE lo pedido en la descripción. Nada más, nada menos.
6. Para archivos .ts/.tsx: TypeScript válido sin errores de tipos."""


class Developer(GroqBase):
    _use_cache = False  # NUNCA cachea — siempre genera código fresco

    def __init__(self):
        super().__init__()
        logger.info(f"Desarrollador listo | {self.model}")

    def generate(self, task: Task, existing: Optional[str], summary: str) -> str:
        logger.info(f"💻 [{task.id}] {task.title} → {task.file_path}")

        action_ctx = ""
        if task.action == "modify" and existing:
            action_ctx = (
                f"\nACCIÓN: MODIFICAR el archivo existente.\n"
                f"IMPORTANTE: Respetá la estructura actual. Cambiá SOLO lo necesario.\n"
                f"ARCHIVO ACTUAL COMPLETO:\n{existing[:3000]}\n"
            )
        elif task.action == "create":
            action_ctx = "\nACCIÓN: CREAR archivo nuevo desde cero.\n"

        prompt = (
            f"Archivo: {task.file_path}\n"
            f"Descripción exacta de lo que hay que hacer: {task.description}\n"
            f"Notas técnicas: {task.tech_notes}\n"
            f"Contexto del proyecto:\n{summary[:400]}\n"
            f"{action_ctx}"
        )

        raw  = self._chat(DEV_SYS, prompt, max_tokens=4096, temp=0.15)
        code = self._clean(raw, task.file_path)
        logger.info(f"Código generado: {len(code)} chars")
        return code

    def _clean(self, code: str, fp: str) -> str:
        ext_map = {
            ".py": "python", ".js": "javascript", ".ts": "typescript",
            ".tsx": "tsx", ".jsx": "jsx", ".html": "html", ".css": "css",
            ".json": "json", ".yml": "yaml", ".yaml": "yaml",
            ".sh": "bash", ".md": "markdown"
        }
        ext  = ("." + fp.rsplit(".", 1)[-1]) if "." in fp else ""
        lang = ext_map.get(ext, "")
        for pat in [rf"^```{re.escape(lang)}\s*\n(.*?)```\s*$", r"^```\w*\s*\n(.*?)```\s*$"]:
            m = re.search(pat, code, re.DOTALL | re.MULTILINE)
            if m:
                return m.group(1).rstrip()
        return code.strip()