"""Plain builders for the CloudNativePG resources. No Pulumi calls, so they are easy to test."""

from __future__ import annotations

from dataclasses import dataclass, field

BACKUP_PLUGIN = "barman-cloud.cloudnative-pg.io"
BACKUP_CREDENTIALS_SECRET = "postgres-backup-s3"


@dataclass
class Backup:
    destination_path: str  # e.g. s3://knightowl-pg-backups/prod
    endpoint_url: str | None = None  # set for MinIO / non-AWS S3
    retention: str = "30d"
    schedule: str = "0 0 2 * * *"  # 6 fields (seconds first): daily 02:00


@dataclass
class Settings:
    cluster_name: str
    namespace: str
    instances: int = 1
    image: str | None = None
    storage_size: str = "20Gi"
    storage_class: str | None = None
    wal_storage_size: str | None = None
    cpu: str = "500m"
    memory: str = "1Gi"
    parameters: dict[str, str] = field(default_factory=dict)
    pooler_instances: int = 0
    backup: Backup | None = None

    @property
    def object_store_name(self) -> str:
        return f"{self.cluster_name}-backup"

    @property
    def pooler_name(self) -> str:
        # Must differ from the cluster name.
        return f"{self.cluster_name}-pooler-rw"


def _storage(size: str, storage_class: str | None) -> dict:
    spec: dict = {"size": size}
    if storage_class:
        spec["storageClass"] = storage_class
    return spec


def cluster_spec(s: Settings, superuser_secret: str) -> dict:
    spec: dict = {
        "instances": s.instances,
        "enableSuperuserAccess": True,
        "superuserSecret": {"name": superuser_secret},
        "storage": _storage(s.storage_size, s.storage_class),
        "resources": {
            "requests": {"cpu": s.cpu, "memory": s.memory},
            "limits": {"memory": s.memory},
        },
        # Spread instances over nodes when there is more than one.
        "affinity": {"enablePodAntiAffinity": True, "topologyKey": "kubernetes.io/hostname"},
        "postgresql": {"parameters": dict(s.parameters)},
    }
    if s.image:
        spec["imageName"] = s.image
    if s.wal_storage_size:
        spec["walStorage"] = _storage(s.wal_storage_size, s.storage_class)
    if s.backup:
        spec["plugins"] = [
            {
                "name": BACKUP_PLUGIN,
                "isWALArchiver": True,
                "parameters": {"barmanObjectName": s.object_store_name},
            }
        ]
    return spec


def object_store_spec(b: Backup) -> dict:
    configuration: dict = {
        "destinationPath": b.destination_path,
        "s3Credentials": {
            "accessKeyId": {"name": BACKUP_CREDENTIALS_SECRET, "key": "ACCESS_KEY_ID"},
            "secretAccessKey": {"name": BACKUP_CREDENTIALS_SECRET, "key": "SECRET_ACCESS_KEY"},
        },
        "wal": {"compression": "gzip"},
        "data": {"compression": "gzip"},
    }
    if b.endpoint_url:
        configuration["endpointURL"] = b.endpoint_url
    return {"retentionPolicy": b.retention, "configuration": configuration}


def scheduled_backup_spec(s: Settings) -> dict:
    assert s.backup is not None
    return {
        "schedule": s.backup.schedule,
        "backupOwnerReference": "self",
        "cluster": {"name": s.cluster_name},
        "method": "plugin",
        "pluginConfiguration": {"name": BACKUP_PLUGIN},
    }


def pooler_spec(s: Settings) -> dict:
    return {
        "cluster": {"name": s.cluster_name},
        "instances": s.pooler_instances,
        "type": "rw",
        "pgbouncer": {
            "poolMode": "session",
            "parameters": {"max_client_conn": "1000", "default_pool_size": "10"},
        },
    }


def service_host(name: str, namespace: str) -> str:
    return f"{name}.{namespace}.svc.cluster.local"
