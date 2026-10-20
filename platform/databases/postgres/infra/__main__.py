"""Shared PostgreSQL cluster, installed with the Bitnami Helm chart."""

import pulumi
import pulumi_kubernetes as k8s

config = pulumi.Config()
namespace_name = config.get("namespace") or "platform-postgres"
storage_size = config.get("storageSize") or "20Gi"
admin_password = config.require_secret("adminPassword")

namespace = k8s.core.v1.Namespace("postgres", metadata={"name": namespace_name})

release = k8s.helm.v3.Release(
    "postgres",
    chart="postgresql",
    repository_opts={"repo": "oci://registry-1.docker.io/bitnamicharts"},
    namespace=namespace.metadata["name"],
    values={
        "auth": {"postgresPassword": admin_password},
        "primary": {"persistence": {"size": storage_size}},
        "metrics": {"enabled": True},
    },
)

# Contract: the only values other stacks should read.
pulumi.export(
    "host",
    pulumi.Output.concat(release.status.name, "-postgresql.", namespace_name, ".svc.cluster.local"),
)
pulumi.export("port", 5432)
pulumi.export("admin_user", "postgres")
pulumi.export("admin_password", admin_password)
