import logging, time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from config.keys import MAX_ITERATIONS, AUDIT_MIN_SCORE, WORKSPACE_DIR
logger = logging.getLogger(__name__)

SKIP_KEYWORDS = ["estructura de proyecto","crear estructura","probar proyecto",
                 "probar y depurar","documentar proyecto","testing","depurar",
                 "verificar","deployment","despliegue"]

@dataclass
class RunStatus:
    iteration: int = 0
    total_tasks: int = 0
    done_tasks: int = 0
    current_task: Optional[str] = None
    completed: bool = False
    error: Optional[str] = None
    log: list[str] = field(default_factory=list)
    commit_shas: list[str] = field(default_factory=list)
    def add(self, msg: str): self.log.append(msg); logger.info(msg)

class AgentLoop:
    def __init__(self, project_path=None, on_progress=None):
        self.project_path = Path(project_path) if project_path else WORKSPACE_DIR
        self.on_progress  = on_progress or (lambda _: None)
        self._architect = self._developer = self._auditor = self._repo = None
        self.status = RunStatus()

    @property
    def architect(self):
        if not self._architect:
            from agents.architect import Architect
            self._architect = Architect()
        return self._architect

    @property
    def developer(self):
        if not self._developer:
            from agents.developer import Developer
            self._developer = Developer()
        return self._developer

    @property
    def auditor(self):
        if not self._auditor:
            from agents.auditor import Auditor
            self._auditor = Auditor()
        return self._auditor

    def run(self, objective: str, project_path: Optional[str] = None) -> RunStatus:
        if project_path: self.project_path = Path(project_path)
        self.status = RunStatus()
        self.status.add("🚀 Iniciando desarrollo autónomo")
        self.status.add(f"📁 Proyecto: {self.project_path}")
        self.status.add(f"🎯 Objetivo: {objective}")
        self.status.add("🤖 Arquitecto + Desarrollador + Auditor (Groq)")
        try:
            self._setup_git()
            self._main_loop(objective)
        except Exception as e:
            self.status.error = str(e)
            self.status.add(f"❌ Error fatal: {e}")
            logger.exception("Error en AgentLoop")
        return self.status

    def _main_loop(self, objective: str):
        from engine.analyzer import Analyzer
        from engine.tasks import TaskQueue
        analyzer = Analyzer(self.project_path)
        queue    = TaskQueue()
        consecutive_empty = 0

        for iteration in range(1, MAX_ITERATIONS + 1):
            self.status.iteration = iteration
            self.status.add(f"\n{'='*50}\n🔄 ITERACIÓN {iteration}/{MAX_ITERATIONS}")
            self._notify()

            summary = analyzer.summary()

            # Evaluar progreso desde iteración 2
            if iteration > 1:
                eval_r = self.architect.evaluate(summary, objective)
                score  = eval_r.get("score", 0)
                self.status.add(f"📊 Evaluación: {score}/100")
                if eval_r.get("completed") and score >= 80:
                    self.status.completed = True
                    self.status.add(f"✅ ¡Objetivo cumplido! Score: {score}/100")
                    self._notify()
                    return
                if eval_r.get("remaining"):
                    self.status.add(f"   Falta: {eval_r['remaining'][:120]}")

            tasks = self.architect.create_plan(summary, objective)
            tasks = [t for t in tasks if self._is_real_task(t)]
            queue.load(tasks)

            if not tasks:
                consecutive_empty += 1
                self.status.add(f"📋 Plan: 0 tareas (vacío #{consecutive_empty})")
                if consecutive_empty >= 3:
                    # Forzar completado si score >= 70
                    eval_r = self.architect.evaluate(summary, objective)
                    if eval_r.get("score", 0) >= 70:
                        self.status.completed = True
                        self.status.add(f"✅ Proyecto suficientemente completo. Score: {eval_r.get('score')}/100")
                        break
                continue
            else:
                consecutive_empty = 0

            self.status.total_tasks += len(tasks)
            self.status.add(f"📋 Plan: {len(tasks)} tareas")
            for t in tasks:
                self.status.add(f"   [{t.id}] {t.title} → {t.file_path}")
            self._notify()

            any_written = self._execute(queue, analyzer, summary)
            if any_written and self._repo:
                sha = self._commit(iteration, objective)
                if sha:
                    self.status.commit_shas.append(sha)
                    self.status.add(f"📦 Commit: {sha[:8]}")

        self.status.add(f"⚠️  Límite de {MAX_ITERATIONS} iteraciones alcanzado.")

    def _is_real_task(self, task) -> bool:
        fp = (task.file_path or "").strip().rstrip("/\\")
        if not fp: return False
        if "." not in Path(fp).name: return False
        if fp.startswith("C:") or fp.startswith("c:"): return False
        title_lower = task.title.lower()
        if any(kw in title_lower for kw in SKIP_KEYWORDS): return False
        return True

    def _execute(self, queue, analyzer, summary: str) -> bool:
        any_written = False
        for task in queue.ordered():
            if task.completed: continue
            self.status.current_task = task.title
            self.status.add(f"\n  🔧 [{task.id}] {task.title}\n     📄 {task.file_path}")
            self._notify()
            try:
                written = self._dev_audit_write(task, analyzer, summary)
                if written:
                    queue.complete(task.id)
                    self.status.done_tasks += 1
                    any_written = True
                    self.status.add("     ✅ Completado")
                else:
                    queue.fail(task.id, "No se pudo escribir")
            except Exception as e:
                queue.fail(task.id, str(e))
                self.status.add(f"     ❌ {str(e)[:100]}")
            time.sleep(2)  # pausa entre tareas
        return any_written

    def _dev_audit_write(self, task, analyzer, summary: str) -> bool:
        if task.action == "delete":
            return analyzer.delete(task.file_path)
        existing = analyzer.read(task.file_path) if task.action == "modify" else None
        code = self.developer.generate(task, existing, summary)
        if not code or len(code) < 10:
            return False
        result = self.auditor.audit(task, code, summary)
        self.status.add(f"     📊 Score: {result.score}/100 {'✅' if result.approved else '⚠️'}")
        final = result.corrected_code if (result.corrected_code and len(result.corrected_code) > 10) else code
        return analyzer.write(task.file_path, final)

    def _setup_git(self):
        try:
            from github_tools.git import GitManager
            self._repo = GitManager(self.project_path)
            self.status.add(f"📦 Git: rama {self._repo.branch()}")
        except Exception as e:
            logger.warning(f"Git no disponible: {e}")
            self._repo = None

    def _commit(self, iteration: int, objective: str) -> Optional[str]:
        if self._repo:
            self._repo.stage_all()
            sha = self._repo.commit(f"[AI Agent] iter={iteration}: {objective[:50]}")
            if sha: self._repo.push()
            return sha
        return None

    def _notify(self):
        try: self.on_progress(self.status)
        except: pass
