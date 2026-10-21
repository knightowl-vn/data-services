# frontend

The web entry point for product frontends (micro frontends).

Add one folder per tool: `platform/frontend/<tool>/` with `service.yaml`, `infra/` (Pulumi), `deploy/`, `README.md`.

| Tool | What |
|---|---|
| `portal/` | Shell (host app): login, roles, layout, navigation; loads each product's frontend at runtime |

Shared frontend code (design system, shell/product contract) is in `libs/web/`.
