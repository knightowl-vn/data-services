"""Who is calling, and may they do this.

The portal's oauth2-proxy forwards the user's OIDC ID token as
`Authorization: Bearer <jwt>`. We verify it ourselves (signature, issuer,
audience, expiry) instead of trusting X-Forwarded-* headers, which any pod
in the cluster could send.
"""

import json
import os
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from functools import cached_property
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

VIEWER = "data-quality:viewer"
EDITOR = "data-quality:editor"


@dataclass(frozen=True)
class User:
    id: str
    roles: frozenset[str]


class AuthUnavailable(Exception):
    """The identity provider's signing keys could not be fetched."""


Verifier = Callable[[str], User]


class OidcVerifier:
    def __init__(
        self,
        issuer: str,
        audience: str,
        jwks_url: str | None = None,
        groups_claim: str = "groups",
    ) -> None:
        self.issuer = issuer.rstrip("/")
        self.audience = audience
        self.groups_claim = groups_claim
        self._jwks_url = jwks_url

    @cached_property
    def _jwks(self) -> jwt.PyJWKClient:
        url = self._jwks_url
        if url is None:
            discovery = f"{self.issuer}/.well-known/openid-configuration"
            try:
                with urllib.request.urlopen(discovery, timeout=5) as res:
                    url = json.load(res)["jwks_uri"]
            except (OSError, ValueError, KeyError) as e:
                # Not cached: the next request tries discovery again.
                raise AuthUnavailable(f"OIDC discovery failed: {e}") from e
        return jwt.PyJWKClient(url, cache_keys=True, lifespan=300)

    def __call__(self, token: str) -> User:
        try:
            key = self._jwks.get_signing_key_from_jwt(token).key
        except jwt.PyJWKClientConnectionError as e:
            raise AuthUnavailable(str(e)) from e
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256", "ES256"],
            audience=self.audience,
            issuer=self.issuer,
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
        groups = claims.get(self.groups_claim, [])
        if not isinstance(groups, list) or not all(isinstance(g, str) for g in groups):
            raise jwt.InvalidTokenError(f"claim {self.groups_claim!r} must be a list of strings")
        return User(id=claims["sub"], roles=frozenset(groups))


class DevVerifier:
    """Local dev only: every request, with or without a token, is this user."""

    needs_token = False

    def __init__(self, roles: frozenset[str]) -> None:
        self.user = User(id="dev", roles=roles)

    def __call__(self, _token: str) -> User:
        return self.user


def verifier_from_env() -> Verifier:
    """OIDC_ISSUER_URL + OIDC_AUDIENCE in the cluster; AUTH_DISABLED=true for local dev."""
    if os.environ.get("AUTH_DISABLED", "").lower() == "true":
        return DevVerifier(frozenset(os.environ.get("DEV_ROLES", f"{VIEWER},{EDITOR}").split(",")))
    issuer = os.environ.get("OIDC_ISSUER_URL")
    audience = os.environ.get("OIDC_AUDIENCE")
    if not issuer or not audience:
        raise RuntimeError(
            "Set OIDC_ISSUER_URL and OIDC_AUDIENCE, or AUTH_DISABLED=true for local dev"
        )
    return OidcVerifier(
        issuer,
        audience,
        jwks_url=os.environ.get("OIDC_JWKS_URL") or None,
        groups_claim=os.environ.get("OIDC_GROUPS_CLAIM", "groups"),
    )


_bearer = HTTPBearer(auto_error=False)


def require_role(*roles: str):
    """Dependency: a verified user with at least one of `roles`."""

    def dependency(
        request: Request,
        credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    ) -> User:
        verify: Verifier = request.app.state.verify
        if verify is None:
            raise RuntimeError("auth verifier is not configured")
        if credentials is None and getattr(verify, "needs_token", True):
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                "Missing bearer token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            user = verify(credentials.credentials if credentials else "")
        except AuthUnavailable as e:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Auth unavailable") from e
        except jwt.PyJWTError as e:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                "Invalid token",
                headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
            ) from e
        if not user.roles.intersection(roles):
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires one of: {', '.join(roles)}")
        return user

    return dependency
