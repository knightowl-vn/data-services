# security-compliance

Identity (Keycloak), policy (OPA/Kyverno), audit.

Add one folder per tool: `platform/security-compliance/<tool>/` with `service.yaml`, `infra/` (Pulumi), `deploy/`, `README.md`.

| Tool | What |
|---|---|
| `cert-manager/` | TLS certificates (used by the CNPG backup plugin) |
