"""A Kubernetes namespace for one app in one environment."""

import pulumi
import pulumi_kubernetes as k8s


class AppNamespace(pulumi.ComponentResource):
    """Namespace + resource quota + service account for an app.

    Name format: ``<app>-<env>``, e.g. ``data-quality-dev``.
    """

    def __init__(
        self,
        app: str,
        env: str,
        team: str,
        cpu_limit: str = "4",
        memory_limit: str = "8Gi",
        opts: pulumi.ResourceOptions | None = None,
    ):
        super().__init__("knightowl:apps:AppNamespace", f"{app}-{env}", None, opts)
        child = pulumi.ResourceOptions(parent=self)
        labels = {"app.knightowl.vn/name": app, "app.knightowl.vn/team": team, "env": env}

        self.namespace = k8s.core.v1.Namespace(
            f"{app}-{env}",
            metadata={"name": f"{app}-{env}", "labels": labels},
            opts=child,
        )
        self.name = self.namespace.metadata["name"]

        k8s.core.v1.ResourceQuota(
            f"{app}-{env}-quota",
            metadata={"name": "default", "namespace": self.name},
            spec={"hard": {"limits.cpu": cpu_limit, "limits.memory": memory_limit}},
            opts=child,
        )

        self.service_account = k8s.core.v1.ServiceAccount(
            f"{app}-{env}-sa",
            metadata={"name": app, "namespace": self.name, "labels": labels},
            opts=child,
        )

        self.register_outputs({"name": self.name})
