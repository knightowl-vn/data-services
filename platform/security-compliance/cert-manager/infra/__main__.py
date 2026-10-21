"""cert-manager, installed with its CRDs."""

import pulumi
import pulumi_kubernetes as k8s

config = pulumi.Config()
namespace_name = config.get("namespace") or "cert-manager"
version = config.require("version")

namespace = k8s.core.v1.Namespace("cert-manager", metadata={"name": namespace_name})

release = k8s.helm.v3.Release(
    "cert-manager",
    name="cert-manager",
    chart="cert-manager",
    version=version,
    repository_opts={"repo": "https://charts.jetstack.io"},
    namespace=namespace.metadata["name"],
    values={
        "crds": {"enabled": True, "keep": True},
        "prometheus": {"enabled": True},
    },
)

pulumi.export("namespace", release.namespace)
pulumi.export("version", version)
