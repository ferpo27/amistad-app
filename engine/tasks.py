import logging
from typing import Optional
from agents.models import Task
logger = logging.getLogger(__name__)

class TaskQueue:
    def __init__(self): self._tasks: dict[int,Task] = {}
    def load(self, tasks: list[Task]): self._tasks = {t.id:t for t in tasks}; logger.info(f"TaskQueue: {len(self._tasks)} tareas")
    @property
    def all_done(self): return bool(self._tasks) and all(t.completed for t in self._tasks.values())
    def complete(self, tid: int, result: Optional[str]=None):
        if tid in self._tasks: self._tasks[tid].completed=True; self._tasks[tid].result=result
    def fail(self, tid: int, reason: str):
        if tid in self._tasks: self._tasks[tid].result=f"ERROR:{reason}"; logger.warning(f"Tarea {tid} falló: {reason}")
    def ordered(self) -> list[Task]:
        result,remaining,done = [],[*self._tasks.values()],set()
        for _ in range(len(remaining)*2):
            if not remaining: break
            for t in remaining[:]:
                if all(d in done for d in t.depends_on): result.append(t); done.add(t.id); remaining.remove(t)
        result.extend(remaining)
        return result
