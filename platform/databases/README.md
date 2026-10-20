# databases

Shared database engines (Postgres, ClickHouse, Redis). Apps get tenants, not their own engines.

Add one folder per tool: `platform/databases/<tool>/` with `service.yaml`, `infra/` (Pulumi), `deploy/`, `README.md`.
