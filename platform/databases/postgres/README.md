# Postgres (shared)

Shared PostgreSQL cluster run by the database team, on
[CloudNativePG](https://cloudnative-pg.io) (CNPG). Pulumi project in `infra/`.

## What it creates

| Resource | Notes |
|---|---|
| `Cluster` `main` | Postgres 18, 1 / 2 / 3 instances (dev / staging / prod), automatic failover, TLS |
| Superuser secret | Random password, used only by Pulumi to create tenants |
| `Pooler` `main-pooler-rw` | PgBouncer in front of the primary; apps connect here |
| `ObjectStore` + `ScheduledBackup` | WAL archiving + daily base backup to S3 (staging, prod) |

Sizing, Postgres `parameters`, and backup settings are per env in
`infra/Pulumi.<env>.yaml`.

## Install order

```
platform/security-compliance/cert-manager   # once per k8s cluster
platform/databases/cnpg-operator            # once per k8s cluster
platform/databases/postgres                 # this
```

```bash
cd infra
pulumi stack select prod
pulumi config set --secret postgres:backupAccessKeyId <key>      # staging/prod
pulumi config set --secret postgres:backupSecretAccessKey <secret>
pulumi up
```

Backups go to `backup.destination_path` (S3). For MinIO or another
S3-compatible store, also set `backup.endpoint_url`.

Tests for the resource specs: `cd infra && pytest -q`.

## Using it from a product

Products never change this folder. They read this stack's outputs and create
their own database + role with `PostgresTenant` from `libs/pulumi-components`:

```python
pg = pulumi.StackReference(f"{org}/postgres/{env}")
PostgresTenant(
    "my-product",
    database="my_product",
    namespace=ns.name,
    host=pg.get_output("host"),
    port=pg.get_output("port"),
    admin_user=pg.get_output("admin_user"),
    admin_password=pg.get_output("admin_password"),
    app_host=pg.get_output("app_host"),
)
```

The app gets `DATABASE_URL` from a Secret named `<database>-db`.

Note: `host` is an in-cluster DNS name, so the Pulumi run that creates
tenants must reach the cluster network (self-hosted runner in the cluster,
or a port-forward).

## Outputs (contract)

| Output | Description |
|---|---|
| `host` | Primary, read-write (`main-rw.platform-postgres.svc.cluster.local`) |
| `ro_host` | Replicas, read-only (`main-ro...`) |
| `app_host` | Pooler if enabled, else `host` |
| `port` | 5432 |
| `admin_user` | `postgres` |
| `admin_password` | Secret |
| `cluster_name` | `main` |
| `namespace` | `platform-postgres` |
| `metrics_selector` | Pod labels for a PodMonitor on port `metrics` |

## Monitoring

Each instance exposes Prometheus metrics on port `metrics` (9187).
Observability (layer 3) creates the PodMonitor from `metrics_selector`;
this layer-2 service does not depend on the Prometheus Operator.
