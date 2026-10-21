"""Plain builders for oauth2-proxy (the portal's login gate). No Pulumi calls, so they are easy to test."""

from __future__ import annotations

import json
from dataclasses import dataclass, field

# oauth2-proxy answers these with 401 instead of a login redirect, so a remote's
# fetch() sees the expired session and the shell sends the user to log in.
API_ROUTES = [r"^/apps/[^/]+/api/"]


@dataclass
class Settings:
    env: str
    namespace: str
    host: str  # e.g. portal.dev.knightowl.vn
    oidc_issuer_url: str  # e.g. https://auth.dev.knightowl.vn/realms/knightowl
    shell_service: str = "portal-shell"
    # If set, only members of one of these groups/roles may sign in at all.
    allowed_groups: list[str] = field(default_factory=list)
    ingress_class: str = "nginx"
    tls_secret: str | None = None
    replicas: int = 1
    cookie_expire: str = "8h"

    @property
    def upstream(self) -> str:
        return f"http://{self.shell_service}.{self.namespace}.svc.cluster.local:80"


def _toml(value: object) -> str:
    # JSON strings, booleans and lists of strings are valid TOML values.
    return json.dumps(value)


def oauth2_proxy_config(s: Settings) -> str:
    """oauth2_proxy.cfg. Secrets are not in here; the chart passes them as env vars."""
    options: dict[str, object] = {
        "provider": "oidc",
        "oidc_issuer_url": s.oidc_issuer_url,
        "code_challenge_method": "S256",
        "scope": "openid email profile",
        # Identity provider roles must be mapped into this claim (Keycloak: a
        # "groups" or client-role mapper). The shell reads them as roles.
        "oidc_groups_claim": "groups",
        "email_domains": ["*"],
        "http_address": "0.0.0.0:4180",
        "upstreams": [s.upstream],
        "reverse_proxy": True,
        "skip_provider_button": True,
        "cookie_secure": True,
        "cookie_httponly": True,
        "cookie_samesite": "lax",
        "cookie_expire": s.cookie_expire,
        "cookie_refresh": "5m",
        # Upstreams (shell, product web, product api) get who the user is:
        # X-Forwarded-User/-Email/-Groups and Authorization: Bearer <token>.
        "pass_user_headers": True,
        "pass_access_token": True,
        "pass_authorization_header": True,
        "api_routes": API_ROUTES,
    }
    if s.allowed_groups:
        options["allowed_groups"] = s.allowed_groups
    return "\n".join(f"{k} = {_toml(v)}" for k, v in options.items()) + "\n"


def oauth2_proxy_values(
    s: Settings, client_id: str, client_secret: str, cookie_secret: str
) -> dict:
    ingress: dict = {
        "enabled": True,
        "className": s.ingress_class,
        "path": "/",
        "pathType": "Prefix",
        "hosts": [s.host],
        # Session cookies can be large (tokens inside).
        "annotations": {"nginx.ingress.kubernetes.io/proxy-buffer-size": "16k"},
    }
    if s.tls_secret:
        ingress["tls"] = [{"secretName": s.tls_secret, "hosts": [s.host]}]
    return {
        "config": {
            "clientID": client_id,
            "clientSecret": client_secret,
            "cookieSecret": cookie_secret,
            "configFile": oauth2_proxy_config(s),
        },
        "ingress": ingress,
        "replicaCount": s.replicas,
        # A PDB with one replica would block node drains.
        "podDisruptionBudget": {"enabled": s.replicas > 1},
        # Required: AppNamespace sets a ResourceQuota on limits.
        "resources": {
            "requests": {"cpu": "50m", "memory": "64Mi"},
            "limits": {"cpu": "500m", "memory": "128Mi"},
        },
    }
