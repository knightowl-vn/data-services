"""Storage for checks and runs.

Uses memory for now. Swap in a Postgres store (schema in ../migrations)
that reads DATABASE_URL, which the app's Pulumi stack puts in a k8s Secret.
"""

from datetime import UTC, datetime
from itertools import count

from .models import Check, CheckCreate, Run, RunStatus


class InMemoryStore:
    def __init__(self) -> None:
        self._checks: dict[int, Check] = {}
        self._runs: dict[int, Run] = {}
        self._check_ids = count(1)
        self._run_ids = count(1)

    def list_checks(self) -> list[Check]:
        return list(self._checks.values())

    def get_check(self, check_id: int) -> Check | None:
        return self._checks.get(check_id)

    def create_check(self, data: CheckCreate) -> Check:
        check = Check(id=next(self._check_ids), created_at=_now(), **data.model_dump())
        self._checks[check.id] = check
        return check

    def create_run(self, check_id: int) -> Run:
        run = Run(
            id=next(self._run_ids), check_id=check_id, status=RunStatus.queued, created_at=_now()
        )
        self._runs[run.id] = run
        return run

    def list_runs(self, check_id: int) -> list[Run]:
        return [r for r in self._runs.values() if r.check_id == check_id]


def _now() -> datetime:
    return datetime.now(UTC)
