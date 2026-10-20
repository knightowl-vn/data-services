from fastapi.testclient import TestClient

from data_quality_api.main import create_app


def client() -> TestClient:
    return TestClient(create_app())


def test_health():
    assert client().get("/health").json() == {"status": "ok"}


def test_create_and_list_checks():
    c = client()
    body = {
        "name": "orders id not null",
        "dataset": "sales.orders",
        "rule": "not_null",
        "column": "id",
    }
    created = c.post("/api/checks", json=body)
    assert created.status_code == 201
    assert created.json()["id"] == 1

    listed = c.get("/api/checks").json()
    assert [x["name"] for x in listed] == ["orders id not null"]


def test_invalid_rule_rejected():
    r = client().post("/api/checks", json={"name": "x", "dataset": "t", "rule": "nope"})
    assert r.status_code == 422


def test_run_check_queues_run():
    c = client()
    c.post(
        "/api/checks",
        json={"name": "rows", "dataset": "t", "rule": "row_count_min", "threshold": 10},
    )
    run = c.post("/api/checks/1/runs")
    assert run.status_code == 202
    assert run.json()["status"] == "queued"
    assert len(c.get("/api/checks/1/runs").json()) == 1


def test_unknown_check_is_404():
    assert client().post("/api/checks/99/runs").status_code == 404
