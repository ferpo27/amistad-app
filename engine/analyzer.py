import logging
from pathlib import Path

logger = logging.getLogger(__name__)

IGNORE = {".git", "node_modules", "__pycache__", ".expo", "dist", "build", ".next"}
TEXT_EXT = {".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".md", ".yaml", ".yml",
            ".css", ".html", ".sh", ".env", ".txt", ".mjs", ".cjs"}

class Analyzer:
    def __init__(self, project_path: Path):
        self.root = Path(project_path)

    def summary(self) -> str:
        lines = []
        for p in sorted(self.root.rglob("*")):
            if any(part in IGNORE for part in p.parts):
                continue
            if p.is_file():
                rel = p.relative_to(self.root)
                lines.append(str(rel))
        return "\n".join(lines[:200])

    def read(self, file_path: str) -> str | None:
        p = self.root / file_path
        if p.exists() and p.suffix in TEXT_EXT:
            try:
                return p.read_text(encoding="utf-8")[:3000]
            except Exception:
                return None
        return None

    def write(self, file_path: str, content: str) -> bool:
        p = self.root / file_path
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
            logger.info(f"✍️  {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error escribiendo {file_path}: {e}")
            return False

    def delete(self, file_path: str) -> bool:
        p = self.root / file_path
        try:
            if p.exists():
                p.unlink()
                logger.info(f"🗑️  Borrado: {file_path}")
                return True
            else:
                logger.warning(f"⚠️  No existe para borrar: {file_path}")
                return True  # No es error si ya no existe
        except Exception as e:
            logger.error(f"Error borrando {file_path}: {e}")
            return False

    def delete_dir(self, dir_path: str) -> bool:
        import shutil
        p = self.root / dir_path
        try:
            if p.exists() and p.is_dir():
                shutil.rmtree(p)
                logger.info(f"🗑️  Carpeta borrada: {dir_path}")
            return True
        except Exception as e:
            logger.error(f"Error borrando carpeta {dir_path}: {e}")
            return False