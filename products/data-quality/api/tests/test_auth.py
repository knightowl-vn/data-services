import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from data_quality_api.auth import EDITOR, AuthUnavailable, OidcVerifier, verifier_from_env
from data_quality_api.main import create_app

ISSUER = "https://auth.test/realms/knightowl"
AUDIENCE = "portal"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def jwks() -> dict:
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(KEY.public_key()))
    return {"keys": [{**jwk, "kid": "k1", "use": "sig", "alg": "RS256"}]}


@pytest.fixture
def verifier(monkeypatch) -> OidcVerifier:
    monkeypatch.setattr(jwt.PyJWKClient, "fetch_data", lambda self: jwks())
    return OidcVerifier(ISSUER, AUDIENCE, jwks_url="https://auth.test/certs")


def token(key=KEY, **overrides) -> str:
    claims = {
        "iss": ISSUER,
        "aud": AUDIENCE,
        "sub": "user-1",
        "exp": int(time.time()) + 300,
        "groups": [EDITOR],
        **overrides,
    }
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "k1"})


def test_valid_token(verifier):
    user = verifier(token())
    assert user.id == "user-1"
    assert user.roles == {EDITOR}


@pytest.mark.parametrize(
    "bad",
    [
        {"key": OTHER_KEY},
        {"iss": "https://evil.test"},
        {"aud": "another-client"},
        {"exp": int(time.time()) - 60},
        {"groups": "data-quality:editor"},
    ],
)
def test_rejected_tokens(verifier, bad):
    with pytest.raises(jwt.PyJWTError):
        verifier(token(**bad))


def test_unsigned_token_rejected(verifier):
    unsigned = jwt.encode({"iss": ISSUER, "aud": AUDIENCE, "sub": "x"}, None, algorithm="none")
    with pytest.raises(jwt.PyJWTError):
        verifier(unsigned)


def test_end_to_end_through_app(verifier):
    c = TestClient(create_app(verify=verifier))
    ok = c.get("/api/v1/checks", headers={"Authorization": f"Bearer {token()}"})
    assert ok.status_code == 200
    forged = token(key=OTHER_KEY)
    assert c.get("/api/v1/checks", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_idp_down_is_503():
    def down(_token):
        raise AuthUnavailable("connection refused")

    c = TestClient(create_app(verify=down), headers={"Authorization": "Bearer x"})
    assert c.get("/api/v1/checks").status_code == 503


def test_startup_fails_without_config(monkeypatch):
    for var in ("AUTH_DISABLED", "OIDC_ISSUER_URL", "OIDC_AUDIENCE"):
        monkeypatch.delenv(var, raising=False)
    with pytest.raises(RuntimeError, match="OIDC_ISSUER_URL"), TestClient(create_app()):
        pass


def test_auth_disabled_for_local_dev(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "true")
    monkeypatch.setenv("DEV_ROLES", "data-quality:viewer")
    c = TestClient(create_app())
    with c:
        assert c.get("/api/v1/checks").status_code == 200
        assert (
            c.post(
                "/api/v1/checks", json={"name": "x", "dataset": "t", "rule": "unique"}
            ).status_code
            == 403
        )


def test_auth_disabled_must_be_explicit(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "yes")
    monkeypatch.delenv("OIDC_ISSUER_URL", raising=False)
    with pytest.raises(RuntimeError):
        verifier_from_env()
