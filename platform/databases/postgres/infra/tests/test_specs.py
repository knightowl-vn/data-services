from specs import (
    BACKUP_PLUGIN,
    Backup,
    Settings,
    cluster_spec,
    object_store_spec,
    pooler_spec,
    scheduled_backup_spec,
)


def test_cluster_without_backup_has_no_plugin():
    spec = cluster_spec(Settings(cluster_name="main", namespace="pg"), "main-superuser")
    assert spec["instances"] == 1
    assert spec["superuserSecret"] == {"name": "main-superuser"}
    assert "plugins" not in spec
    assert "walStorage" not in spec


def test_cluster_with_backup_archives_wal_to_object_store():
    s = Settings(
        cluster_name="main",
        namespace="pg",
        instances=3,
        wal_storage_size="10Gi",
        backup=Backup(destination_path="s3://b/prod"),
    )
    spec = cluster_spec(s, "main-superuser")
    assert spec["plugins"] == [
        {
            "name": BACKUP_PLUGIN,
            "isWALArchiver": True,
            "parameters": {"barmanObjectName": "main-backup"},
        }
    ]
    assert spec["walStorage"] == {"size": "10Gi"}


def test_object_store_endpoint_is_optional():
    assert "endpointURL" not in object_store_spec(Backup("s3://b"))["configuration"]
    store = object_store_spec(Backup("s3://b", endpoint_url="http://minio:9000"))
    assert store["configuration"]["endpointURL"] == "http://minio:9000"


def test_scheduled_backup_uses_plugin():
    s = Settings(cluster_name="main", namespace="pg", backup=Backup("s3://b"))
    spec = scheduled_backup_spec(s)
    assert spec["method"] == "plugin"
    assert len(spec["schedule"].split()) == 6


def test_pooler_name_differs_from_cluster():
    s = Settings(cluster_name="main", namespace="pg", pooler_instances=2)
    assert s.pooler_name != s.cluster_name
    assert pooler_spec(s)["cluster"] == {"name": "main"}
