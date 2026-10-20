from fastapi import APIRouter, FastAPI, HTTPException, status

from .models import Check, CheckCreate, Run
from .store import InMemoryStore


def create_app(store: InMemoryStore | None = None) -> FastAPI:
    app = FastAPI(title="Data Quality API", version="0.1.0")
    db = store or InMemoryStore()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # Public, versioned API (visibility: public in product.yaml).
    # Breaking changes go in a new /api/v2 router; never change v1 in place.
    v1 = APIRouter(prefix="/api/v1")

    @v1.get("/checks")
    def list_checks() -> list[Check]:
        return db.list_checks()

    @v1.post("/checks", status_code=status.HTTP_201_CREATED)
    def create_check(body: CheckCreate) -> Check:
        return db.create_check(body)

    @v1.get("/checks/{check_id}")
    def get_check(check_id: int) -> Check:
        return _require_check(db, check_id)

    @v1.post("/checks/{check_id}/runs", status_code=status.HTTP_202_ACCEPTED)
    def run_check(check_id: int) -> Run:
        # Queues the run. A worker (Airflow DAG or queue consumer) executes it.
        _require_check(db, check_id)
        return db.create_run(check_id)

    @v1.get("/checks/{check_id}/runs")
    def list_runs(check_id: int) -> list[Run]:
        _require_check(db, check_id)
        return db.list_runs(check_id)

    app.include_router(v1)
    return app


def _require_check(db: InMemoryStore, check_id: int) -> Check:
    check = db.get_check(check_id)
    if check is None:
        raise HTTPException(status_code=404, detail="Check not found")
    return check


app = create_app()
