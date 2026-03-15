import logging, hashlib
from pathlib import Path

logger = logging.getLogger(__name__)

IGNORE   = {".git", "node_modules", "__pycache__", ".expo", "dist", "build", ".next"}
TEXT_EXT = {".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".md",
            ".yaml", ".yml", ".css", ".html", ".sh", ".env", ".txt", ".mjs", ".cjs"}

# Archivos cuyo contenido se incluye en el summary
# El Evaluador puede así verificar que los cambios realmente se aplicaron
PREVIEW_FILES = {
    "src/translate/types.ts",
    "src/translate/autoTranslate.ts",
    "src/storage/profilesStorage.ts",
    "src/safety/getBlockedList.ts",
    "src/notifications.ts",
    "src/theme.ts",
    "src/hooks/useAuth.ts",
    "app/src/types/app.d.ts",
    "tsconfig.json",
    "src/hooks/useAutoTranslate.ts",
    "src/storage/chatStorage.ts",
}

_summary_cache: dict[str, str] = {}


class Analyzer:
    def __init__(self, project_path: Path):
        self.root = Path(project_path)

    def summary(self) -> str:
        cache_key = self._dir_hash()
        if cache_key in _summary_cache:
            return _summary_cache[cache_key]

        lines    = []
        previews = []

        for p in sorted(self.root.rglob("*")):
            if any(part in IGNORE for part in p.parts):
                continue
            if p.is_file():
                rel = str(p.relative_to(self.root)).replace("\\", "/")
                lines.append(rel)
                if rel in PREVIEW_FILES and p.suffix in TEXT_EXT:
                    try:
                        content = p.read_text(encoding="utf-8")[:800]
                        previews.append(f"\n--- {rel} ---\n{content}\n")
                    except Exception:
                        pass

        result = "ARCHIVOS:\n" + "\n".join(lines[:200])
        if previews:
            result += "\n\nCONTENIDO DE ARCHIVOS CLAVE:" + "".join(previews)

        _summary_cache[cache_key] = result
        return result

    def _dir_hash(self) -> str:
        """Hash rápido para invalidar cache cuando cambian archivos."""
        try:
            mtimes = sorted(
                str(p.stat().st_mtime)
                for p in self.root.rglob("*")
                if p.is_file() and p.suffix in {".ts", ".tsx", ".json"}
                and not any(part in IGNORE for part in p.parts)
            )
            return hashlib.md5("".join(mtimes[:100]).encode()).hexdigest()
        except Exception:
            return "no-cache"

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
            _summary_cache.clear()  # Invalidar cache
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
                _summary_cache.clear()
                logger.info(f"🗑️  {file_path}")
            else:
                logger.warning(f"No existe para borrar: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error borrando {file_path}: {e}")
            return False

    def delete_dir(self, dir_path: str) -> bool:
        import shutil
        p = self.root / dir_path
        try:
            if p.exists() and p.is_dir():
                shutil.rmtree(p)
                _summary_cache.clear()
                logger.info(f"🗑️  Carpeta borrada: {dir_path}")
            return True
        except Exception as e:
            logger.error(f"Error borrando carpeta {dir_path}: {e}")
            return False