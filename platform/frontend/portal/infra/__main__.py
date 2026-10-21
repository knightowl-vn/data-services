"""Portal: namespace + oauth2-proxy, the login gate in front of the shell.

Traffic: Ingress (portal host) -> oauth2-proxy -> portal-shell Service (deploy/)
-> /apps/<name>/ -> <name>-web Service of each product.
The shell itself is deployed by Argo CD from deploy/ (CI builds its image).
"""

import pulumi
import pulumi_kubernetes as k8s
import pulumi_random as random
from knightowl_components import AppNamespace
from specs import Settings, oauth2_proxy_values

config = pulumi.Config()
env = pulumi.get_stack()  # dev | staging | prod

ns = AppNamespace(
    "portal",
    env=env,
    team="platform-frontend",
    cpu_limit=config.get("cpuLimit") or "2",
    memory_limit=config.get("memoryLimit") or "2Gi",
)

settings = Settings(
    env=env,
    namespace=f"portal-{env}",
    host=config.require("host"),
    oidc_issuer_url=config.require("oidcIssuerUrl"),
    allowed_groups=config.get_object("allowedGroups") or [],
    ingress_class=config.get("ingressClass") or "nginx",
    tls_secret=config.get("tlsSecret"),
    replicas=config.get_int("replicas") or 1,
)
client_id = config.require("oidcClientId")
client_secret = config.require_secret("oidcClientSecret")  # pulumi config set --secret
cookie_secret = random.RandomPassword("oauth2-proxy-cookie-secret", length=32, special=False)

version = config.require("oauth2ProxyVersion")
release = k8s.helm.v3.Release(
    "oauth2-proxy",
    name="oauth2-proxy",
    chart="oauth2-proxy",
    version=version,
    repository_opts={"repo": "https://oauth2-proxy.github.io/manifests"},
    namespace=ns.name,
    values=pulumi.Output.all(client_secret, cookie_secret.result).apply(
        lambda s: oauth2_proxy_values(settings, client_id, s[0], s[1])
    ),
)

pulumi.export("namespace", ns.name)
pulumi.export("url", f"https://{settings.host}")
pulumi.export("oauth2_proxy_version", version)
