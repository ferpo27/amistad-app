import logging, re, concurrent.futures
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from config.keys import MAX_ITERATIONS, AUDIT_MIN_SCORE, WORKSPACE_DIR

logger = logging.getLogger(__name__)

SKIP_KEYWORDS = [
    "estructura de proyecto", "crear estructura", "probar proyecto",
    "probar y depurar", "documentar proyecto", "testing", "depurar",
    "verificar", "deployment", "despliegue"
]


@dataclass
class RunStatus:
    iteration: int = 0
    total_tasks: int = 0
    done_tasks: int = 0
    failed_tasks: int = 0
    current_task: Optional[str] = None
    completed: bool = False
    error: Optional[str] = None
    log: list[str] = field(default_factory=list)
    commit_shas: list[str] = field(default_factory=list)

    def add(self, msg: str):
        self.log.append(msg)
        logger.info(msg)


def _extract_protected(objective: str) -> list[str]:
    """Detecta automáticamente archivos que el usuario pidió no tocar."""
    patterns = [
        r"no toques?\s+([^\s,\n]+\.[a-z]+)",
        r"no modificar\s+([^\s,\n]+\.[a-z]+)",
        r"no cambies?\s+([^\s,\n]+\.[a-z]+)",
        r"NO\s+(?:tocar|modificar|cambiar)\s+([^\s,\n]+\.[a-z]+)",
    ]
    found = []
    for pat in patterns:
        found.extend(re.findall(pat, objective, re.IGNORECASE))
    if found:
        logger.info(f"🛡️  Archivos protegidos detectados: {found}")
    return found


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
        if project_path:
            self.project_path = Path(project_path)
        self.status = RunStatus()
        self.status.add("🚀 Iniciando agente")
        self.status.add(f"📁 {self.project_path}")
        protected = _extract_protected(objective)
        try:
            self._setup_git()
            self._main_loop(objective, protected)
        except Exception as e:
            self.status.error = str(e)
            self.status.add(f"❌ Error fatal: {e}")
            logger.exception("Error en AgentLoop")
        return self.status

    def _main_loop(self, objective: str, protected: list[str]):
        from engine.analyzer import Analyzer
        from engine.tasks import TaskQueue
        analyzer       = Analyzer(self.project_path)
        queue          = TaskQueue()
        consecutive_empty = 0
        last_plan_hash    = ""

        for iteration in range(1, MAX_ITERATIONS + 1):
            self.status.iteration = iteration
            self.status.add(f"\n{'='*50}\n🔄 ITERACIÓN {iteration}/{MAX_ITERATIONS}")
            self._notify()

            summary = analyzer.summary()

            # Generar plan
            raw_tasks = self.architect.create_plan(summary, objective, protected)

            # ── FILTRO ANTES DE CARGAR EN LA QUEUE ──────────────────────────
            valid_tasks = [t for t in raw_tasks if self._is_real_task(t)]

            if not valid_tasks:
                consecutive_empty += 1
                self.status.add(f"📋 Sin tareas válidas (vacío #{consecutive_empty})")
                if consecutive_empty >= 2:
                    self.status.completed = True
                    self.status.add("✅ Sin más tareas — objetivo completo")
                    break
                continue
            else:
                consecutive_empty = 0

            # Detectar plan idéntico al anterior
            plan_hash = "|".join(t.file_path for t in valid_tasks)
            if plan_hash == last_plan_hash:
                self.status.add("🔁 Plan idéntico al anterior — deteniendo para no repetir")
                break
            last_plan_hash = plan_hash

            # Cargar en la queue DESPUÉS del filtro
            queue.load(valid_tasks)

            self.status.total_tasks += len(valid_tasks)
            self.status.add(f"📋 Plan: {len(valid_tasks)} tareas")
            for t in valid_tasks:
                self.status.add(f"   [{t.id}] {t.action.upper()} → {t.file_path}")
            self._notify()

            any_written = self._execute(queue, analyzer, summary)

            if any_written and self._repo:
                sha = self._commit(iteration, objective)
                if sha:
                    self.status.commit_shas.append(sha)
                    self.status.add(f"📦 Commit: {sha[:8]}")

        # Evaluación UNA sola vez al final
        if self.status.done_tasks > 0:
            summary = analyzer.summary()
            eval_r  = self.architect.evaluate(summary, objective)
            score   = eval_r.get("score", 0)
            self.status.add(f"📊 Evaluación final: {score}/100 — {eval_r.get('reason', '')[:80]}")
            if score >= 75:
                self.status.completed = True

        self.status.add(
            f"\n📊 Resumen: ✅ {self.status.done_tasks} OK | ❌ {self.status.failed_tasks} fallidas"
        )

    def _is_real_task(self, task) -> bool:
        fp = (task.file_path or "").strip().rstrip("/\\")
        if not fp:
            return False
        if "." not in Path(fp).name:
            return False
        if fp.startswith("C:") or fp.startswith("c:"):
            return False
        if any(kw in task.title.lower() for kw in SKIP_KEYWORDS):
            return False
        return True

    def _execute(self, queue, analyzer, summary: str) -> bool:
        """Tareas independientes en paralelo, dependientes en serie."""
        any_written = False
        ordered     = queue.ordered()

        independent = [t for t in ordered if not t.depends_on and not t.completed]
        dependent   = [t for t in ordered if t.depends_on  and not t.completed]

        # Paralelo para tareas independientes (máx 3 simultáneas)
        if len(independent) > 1:
            any_written = self._execute_parallel(independent, queue, analyzer, summary) or any_written
        elif independent:
            any_written = self._execute_one(independent[0], queue, analyzer, summary) or any_written

        # Serie para dependientes
        for task in dependent:
            if task.completed:
                continue
            any_written = self._execute_one(task, queue, analyzer, summary) or any_written

        return any_written

    def _execute_parallel(self, tasks, queue, analyzer, summary: str) -> bool:
        any_written = False
        self.status.add(f"⚡ {len(tasks)} tareas en paralelo...")

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(self._dev_audit_write, task, analyzer, summary): task
                for task in tasks
            }
            for future in concurrent.futures.as_completed(futures):
                task = futures[future]
                try:
                    written = future.result()
                    if written:
                        queue.complete(task.id)
                        self.status.done_tasks += 1
                        any_written = True
                        self.status.add(f"   ✅ {task.file_path}")
                    else:
                        queue.fail(task.id, "Rechazado")
                        self.status.failed_tasks += 1
                        self.status.add(f"   ❌ {task.file_path}")
                except Exception as e:
                    queue.fail(task.id, str(e))
                    self.status.failed_tasks += 1
                    self.status.add(f"   ❌ {task.file_path}: {str(e)[:60]}")

        return any_written

    def _execute_one(self, task, queue, analyzer, summary: str) -> bool:
        self.status.current_task = task.title
        self.status.add(f"\n  🔧 {task.action.upper()} → {task.file_path}")
        self._notify()
        try:
            written = self._dev_audit_write(task, analyzer, summary)
            if written:
                queue.complete(task.id)
                self.status.done_tasks += 1
                self.status.add("     ✅ Completado")
                return True
            else:
                queue.fail(task.id, "Rechazado")
                self.status.failed_tasks += 1
                self.status.add("     ❌ Rechazado por auditor")
                return False
        except Exception as e:
            queue.fail(task.id, str(e))
            self.status.failed_tasks += 1
            self.status.add(f"     ❌ {str(e)[:80]}")
            return False

    def _dev_audit_write(self, task, analyzer, summary: str) -> bool:
        if task.action == "delete":
            return analyzer.delete(task.file_path)

        existing = analyzer.read(task.file_path) if task.action == "modify" else None
        code     = self.developer.generate(task, existing, summary)

        if not code or len(code) < 10:
            logger.warning(f"Código vacío para {task.file_path}")
            return False

        result = self.auditor.audit(task, code, summary, existing or "")
        self.status.add(f"     📊 Auditoría: {result.score}/100 {'✅' if result.approved else '❌'}")

        if not result.approved:
            for issue in result.issues[:2]:
                self.status.add(f"        • {issue}")
            return False

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
            if sha:
                self._repo.push()
            return sha
        return None

    def _notify(self):
        try:
            self.on_progress(self.status)
        except Exception:
            pass