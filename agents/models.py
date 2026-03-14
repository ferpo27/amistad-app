from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Task:
    id: int
    title: str
    description: str
    file_path: str
    action: str
    tech_notes: str = ""
    depends_on: list[int] = field(default_factory=list)
    completed: bool = False
    result: Optional[str] = None

@dataclass
class AuditResult:
    approved: bool
    score: int
    issues: list[str]
    suggestions: list[str]
    corrected_code: str = ""
