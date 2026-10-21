"""Shared PostgreSQL cluster on CloudNativePG.

Needs the operator from platform/databases/cnpg-operator. Creates:
superuser secret, Cluster, optional backups (ObjectStore + ScheduledBackup),
optional PgBouncer Pooler. Exports the contract used by PostgresTenant.
"""

import pulumi
import pulumi_kubernetes as k8s
import pulumi_random as random
from specs import (
    BACKUP_CREDENTIALS_SECRET,
    Backup,
    Settings,
    cluster_spec,
    object_store_spec,
    pooler_spec,
    scheduled_backup_spec,
    service_host,
)

config = pulumi.Config()
backup_cfg = config.get_object("backup")

s = Settings(
    cluster_name=config.get("clusterName") or "main",
    namespace=config.get("namespace") or "platform-postgres",
    instances=config.get_int("instances") or 1,
    image=config.get("image"),
    storage_size=config.get("storageSize") or "20Gi",
    storage_class=config.get("storageClass"),
    wal_storage_size=config.get("walStorageSize"),
    cpu=config.get("cpu") or "500m",
    memory=config.get("memory") or "1Gi",
    parameters=config.get_object("parameters") or {},
    pooler_instances=config.get_int("poolerInstances") or 0,
    backup=Backup(**backup_cfg) if backup_cfg else None,
)

namespace = k8s.core.v1.Namespace("postgres", metadata={"name": s.namespace})
ns = namespace.metadata["name"]

# Superuser, used only by Pulumi (PostgresTenant) to create product roles/databases.
admin_password = random.RandomPassword("postgres-admin", length=32, special=False)
superuser = k8s.core.v1.Secret(
    "postgres-superuser",
    metadata={"name": f"{s.cluster_name}-superuser", "namespace": ns},
    type="kubernetes.io/basic-auth",
    string_data={"username": "postgres", "password": admin_password.result},
)

cluster_deps: list[pulumi.Resource] = []
if s.backup:
    creds = k8s.core.v1.Secret(
        "postgres-backup-s3",
        metadata={"name": BACKUP_CREDENTIALS_SECRET, "namespace": ns},
        string_data={
            "ACCESS_KEY_ID": config.require_secret("backupAccessKeyId"),
            "SECRET_ACCESS_KEY": config.require_secret("backupSecretAccessKey"),
        },
    )
    store = k8s.apiextensions.CustomResource(
        "postgres-backup",
        api_version="barmancloud.cnpg.io/v1",
        kind="ObjectStore",
        metadata={"name": s.object_store_name, "namespace": ns},
        spec=object_store_spec(s.backup),
        opts=pulumi.ResourceOptions(depends_on=[creds]),
    )
    cluster_deps.append(store)

cluster = k8s.apiextensions.CustomResource(
    "postgres",
    api_version="postgresql.cnpg.io/v1",
    kind="Cluster",
    metadata={"name": s.cluster_name, "namespace": ns},
    spec=cluster_spec(s, superuser.metadata["name"]),
    opts=pulumi.ResourceOptions(depends_on=[superuser, *cluster_deps]),
)

if s.backup:
    k8s.apiextensions.CustomResource(
        "postgres-scheduled-backup",
        api_version="postgresql.cnpg.io/v1",
        kind="ScheduledBackup",
        metadata={"name": f"{s.cluster_name}-daily", "namespace": ns},
        spec=scheduled_backup_spec(s),
        opts=pulumi.ResourceOptions(depends_on=[cluster]),
    )

if s.pooler_instances > 0:
    k8s.apiextensions.CustomResource(
        "postgres-pooler",
        api_version="postgresql.cnpg.io/v1",
        kind="Pooler",
        metadata={"name": s.pooler_name, "namespace": ns},
        spec=pooler_spec(s),
        opts=pulumi.ResourceOptions(depends_on=[cluster]),
    )

# Contract (see ../service.yaml). CNPG services: <cluster>-rw (primary), <cluster>-ro (replicas).
rw_host = service_host(f"{s.cluster_name}-rw", s.namespace)
pulumi.export("host", rw_host)
pulumi.export("ro_host", service_host(f"{s.cluster_name}-ro", s.namespace))
pulumi.export(
    "app_host",
    service_host(s.pooler_name, s.namespace) if s.pooler_instances > 0 else rw_host,
)
pulumi.export("port", 5432)
pulumi.export("admin_user", "postgres")
pulumi.export("admin_password", pulumi.Output.secret(admin_password.result))
pulumi.export("cluster_name", s.cluster_name)
pulumi.export("namespace", s.namespace)
# Observability (layer 3) uses this to create a PodMonitor on port "metrics".
pulumi.export("metrics_selector", {"cnpg.io/cluster": s.cluster_name})
