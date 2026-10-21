import re
import tomllib

from specs import API_ROUTES, Settings, oauth2_proxy_config, oauth2_proxy_values


def settings(**kw) -> Settings:
    base = {
        "env": "dev",
        "namespace": "portal-dev",
        "host": "portal.dev.knightowl.vn",
        "oidc_issuer_url": "https://auth.dev.knightowl.vn/realms/knightowl",
    }
    return Settings(**{**base, **kw})


def parse(cfg: str) -> dict:
    return tomllib.loads(cfg)


def test_config_proxies_everything_to_the_shell_and_forwards_identity():
    cfg = parse(oauth2_proxy_config(settings()))
    assert cfg["upstreams"] == ["http://portal-shell.portal-dev.svc.cluster.local:80"]
    assert cfg["provider"] == "oidc"
    assert cfg["code_challenge_method"] == "S256"
    assert cfg["pass_user_headers"] and cfg["pass_authorization_header"]
    assert cfg["oidc_groups_claim"] == "groups"
    assert cfg["api_routes"] == API_ROUTES
    assert "allowed_groups" not in cfg


def test_cookie_is_secure():
    cfg = parse(oauth2_proxy_config(settings()))
    assert cfg["cookie_secure"] and cfg["cookie_httponly"]
    assert cfg["cookie_samesite"] == "lax"


def test_allowed_groups_restrict_sign_in():
    cfg = parse(oauth2_proxy_config(settings(allowed_groups=["portal:user"])))
    assert cfg["allowed_groups"] == ["portal:user"]


def test_api_routes_match_product_apis_only():
    (pattern,) = API_ROUTES
    assert re.match(pattern, "/apps/data-quality/api/v1/checks")
    assert not re.match(pattern, "/apps/data-quality/remoteEntry.js")
    assert not re.match(pattern, "/data-quality/api")


def test_values_keep_secrets_out_of_the_config_file():
    values = oauth2_proxy_values(settings(), "portal", "client-secret", "c" * 32)
    assert values["config"]["clientSecret"] == "client-secret"
    assert "client-secret" not in values["config"]["configFile"]
    assert values["ingress"]["hosts"] == ["portal.dev.knightowl.vn"]
    assert "tls" not in values["ingress"]
    assert values["podDisruptionBudget"] == {"enabled": False}
    assert values["resources"]["limits"]["memory"]


def test_prod_values_have_tls_and_a_pdb():
    values = oauth2_proxy_values(settings(tls_secret="portal-tls", replicas=2), "p", "s", "c" * 32)
    assert values["ingress"]["tls"] == [
        {"secretName": "portal-tls", "hosts": ["portal.dev.knightowl.vn"]}
    ]
    assert values["podDisruptionBudget"] == {"enabled": True}
