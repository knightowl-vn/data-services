# CloudNativePG operator

Installs the [CloudNativePG](https://cloudnative-pg.io) operator and the
[Barman Cloud plugin](https://cloudnative-pg.io/plugin-barman-cloud/) (backups
to S3-compatible storage) into `cnpg-system`. One operator serves every
Postgres cluster in the Kubernetes cluster.

Kept separate from `../postgres` so the CRDs exist before any `Cluster` is
created, and the operator can be upgraded on its own.

Requires: Kubernetes >= 1.29, `platform/security-compliance/cert-manager`.

```bash
cd infra && pulumi stack select dev && pulumi up
```

Upgrades: bump `operatorChartVersion` / `backupPluginChartVersion` in
`infra/Pulumi.<env>.yaml`, roll out dev → staging → prod.

| Output | Description |
|---|---|
| `namespace` | `cnpg-system` |
| `operator_version` | Installed chart version |
| `backup_plugin` | `barman-cloud.cloudnative-pg.io` |
