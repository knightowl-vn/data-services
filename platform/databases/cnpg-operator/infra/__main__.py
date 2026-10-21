"""CloudNativePG operator + Barman Cloud backup plugin (same namespace, as the plugin requires)."""

import pulumi
import pulumi_kubernetes as k8s

CHARTS_REPO = "https://cloudnative-pg.github.io/charts"
BACKUP_PLUGIN = "barman-cloud.cloudnative-pg.io"

config = pulumi.Config()
namespace_name = config.get("namespace") or "cnpg-system"
operator_version = config.require("operatorChartVersion")
plugin_version = config.require("backupPluginChartVersion")

namespace = k8s.core.v1.Namespace("cnpg-system", metadata={"name": namespace_name})

operator = k8s.helm.v3.Release(
    "cnpg",
    name="cnpg",
    chart="cloudnative-pg",
    version=operator_version,
    repository_opts={"repo": CHARTS_REPO},
    namespace=namespace.metadata["name"],
    values={
        "crds": {"create": True},
        "config": {"clusterWide": True},
    },
)

backup_plugin = k8s.helm.v3.Release(
    "barman-cloud",
    name="barman-cloud",
    chart="plugin-barman-cloud",
    version=plugin_version,
    repository_opts={"repo": CHARTS_REPO},
    namespace=namespace.metadata["name"],
    opts=pulumi.ResourceOptions(depends_on=[operator]),
)

pulumi.export("namespace", operator.namespace)
pulumi.export("operator_version", operator_version)
pulumi.export("backup_plugin", BACKUP_PLUGIN)
