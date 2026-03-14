import logging
from pathlib import Path
from typing import Optional
from config.keys import GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_EMAIL, GITHUB_REPO_URL
logger = logging.getLogger(__name__)

class GitManager:
    def __init__(self, project_path):
        import git
        self.path = Path(project_path)
        try:
            self.repo = git.Repo(self.path)
            logger.info(f"Git: repo abierto en {self.path.name}")
        except git.InvalidGitRepositoryError:
            self.repo = git.Repo.init(self.path)
            self._configure()
            logger.info(f"Git: repo inicializado en {self.path.name}")
        self._configure()  # Siempre actualiza user/email

    def branch(self) -> str:
        try: return self.repo.active_branch.name
        except: return "master"

    def stage_all(self):
        try: self.repo.git.add(A=True)
        except Exception as e: logger.warning(f"Error staging: {e}")

    def commit(self, message: str) -> Optional[str]:
        try:
            if not self.repo.is_dirty(untracked_files=True): return None
            c = self.repo.index.commit(message)
            logger.info(f"Commit: {c.hexsha[:8]}")
            return c.hexsha
        except Exception as e: logger.error(f"Error commit: {e}"); return None

    def push(self) -> bool:
        if not GITHUB_TOKEN or not GITHUB_REPO_URL: return False
        try:
            # Construir URL con token fresco cada vez
            url = GITHUB_REPO_URL.replace("https://", f"https://{GITHUB_USERNAME}:{GITHUB_TOKEN}@")
            # Eliminar remote viejo y recrear con token nuevo
            try:
                self.repo.delete_remote("origin")
            except Exception:
                pass
            self.repo.create_remote("origin", url)
            branch = self.branch()
            self.repo.git.push("--set-upstream", "origin", branch)
            logger.info(f"Push OK → {branch}")
            return True
        except Exception as e:
            logger.error(f"Error push: {e}")
            return False

    def _configure(self):
        try:
            with self.repo.config_writer() as cfg:
                cfg.set_value("user", "name", GITHUB_USERNAME or "AI Agent")
                cfg.set_value("user", "email", GITHUB_EMAIL or "agent@ai.com")
        except Exception as e:
            logger.warning(f"Config git: {e}")
