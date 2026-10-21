"""Infra for the data quality product.

Uses platform services only through their stack outputs and the shared
components in libs/pulumi-components. Never edits platform/ directly.
"""

import pulumi
from knightowl_components import AppNamespace, PostgresTenant

APP = "data-quality"
TEAM = "data-quality"

config = pulumi.Config()
env = pulumi.get_stack()  # dev | staging | prod
org = config.require("org")

# 1. Kubernetes namespace for this product in this env: data-quality-<env>
ns = AppNamespace(
    APP,
    env=env,
    team=TEAM,
    cpu_limit=config.get("cpuLimit") or "2",
    memory_limit=config.get("memoryLimit") or "4Gi",
)

# 2. Own database on the shared Postgres (read its contract via StackReference)
pg = pulumi.StackReference(f"{org}/postgres/{env}")
db = PostgresTenant(
    APP,
    database="data_quality",
    namespace=ns.name,
    host=pg.get_output("host"),
    port=pg.get_output("port"),
    admin_user=pg.get_output("admin_user"),
    admin_password=pg.get_output("admin_password"),
    app_host=pg.get_output("app_host"),  # via the PgBouncer pooler
)

pulumi.export("namespace", ns.name)
pulumi.export("db_secret", db.secret_name)  # loaded by the api Deployment
