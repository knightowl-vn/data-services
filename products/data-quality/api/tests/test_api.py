import jwt
from fastapi.testclient import TestClient

from data_quality_api.auth import EDITOR, VIEWER, User
from data_quality_api.main import create_app

USERS = {
    "editor": User("e", frozenset({EDITOR})),
    "viewer": User("v", frozenset({VIEWER})),
    "nobody": User("n", frozenset({"other-product:editor"})),
}


def fake_verify(token: str) -> User:
    if token not in USERS:
        raise jwt.InvalidTokenError("unknown token")
    return USERS[token]


def client(as_user: str | None = "editor") -> TestClient:
    headers = {"Authorization": f"Bearer {as_user}"} if as_user else {}
    return TestClient(create_app(verify=fake_verify), headers=headers)


def test_health_needs_no_token():
    assert client(None).get("/health").json() == {"status": "ok"}


def test_create_and_list_checks():
    c = client()
    body = {
        "name": "orders id not null",
        "dataset": "sales.orders",
        "rule": "not_null",
        "column": "id",
    }
    created = c.post("/api/v1/checks", json=body)
    assert created.status_code == 201
    assert created.json()["id"] == 1

    listed = c.get("/api/v1/checks").json()
    assert [x["name"] for x in listed] == ["orders id not null"]


def test_invalid_rule_rejected():
    r = client().post("/api/v1/checks", json={"name": "x", "dataset": "t", "rule": "nope"})
    assert r.status_code == 422


def test_run_check_queues_run():
    c = client()
    c.post(
        "/api/v1/checks",
        json={"name": "rows", "dataset": "t", "rule": "row_count_min", "threshold": 10},
    )
    run = c.post("/api/v1/checks/1/runs")
    assert run.status_code == 202
    assert run.json()["status"] == "queued"
    assert len(c.get("/api/v1/checks/1/runs").json()) == 1


def test_unknown_check_is_404():
    assert client().post("/api/v1/checks/99/runs").status_code == 404


def test_missing_token_is_401():
    r = client(None).get("/api/v1/checks")
    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_invalid_token_is_401():
    assert client("forged").get("/api/v1/checks").status_code == 401


def test_viewer_reads_but_cannot_write():
    app = create_app(verify=fake_verify)
    editor = TestClient(app, headers={"Authorization": "Bearer editor"})
    viewer = TestClient(app, headers={"Authorization": "Bearer viewer"})
    editor.post("/api/v1/checks", json={"name": "x", "dataset": "t", "rule": "unique"})

    assert viewer.get("/api/v1/checks").status_code == 200
    assert viewer.get("/api/v1/checks/1/runs").status_code == 200
    body = {"name": "y", "dataset": "t", "rule": "unique"}
    assert viewer.post("/api/v1/checks", json=body).status_code == 403
    assert viewer.post("/api/v1/checks/1/runs").status_code == 403


def test_user_without_product_role_is_403():
    assert client("nobody").get("/api/v1/checks").status_code == 403
