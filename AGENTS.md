# AGENTS.md

Instructions for AI coding agents (Claude Code, Antigravity, Codex, Cursor, ...).
This is the single source of truth: `CLAUDE.md` and `.agent/rules/` point here.
Keep it up to date when the structure or a decision changes.

## What this repo is

Monorepo for the knightowl data platform. Capabilities: data catalog,
orchestration, storage, databases, monitoring, ingestion, egress, security, BI.
Shared tools run once on the platform; many teams build products on top.

```
platform/<category>/<tool>/   shared infra, owned by platform teams
products/<name>/              one folder per product, owned by one team
libs/pulumi-components/       how products get resources from the platform
templates/product/            how to start a new product
.github/workflows/            reusable _*.yml + one product-<name>.yml per product
```

## Decisions (do not undo without asking the user)

| Decision | Why |
|---|---|
| Pulumi (Python), not Terraform | Team choice. One Pulumi project per platform tool and per product; one stack per env: `dev`, `staging`, `prod`. Org placeholder: `knightowl`. |
| `platform/` grouped by CNCF-style category | Tools are found by what they do, not by who asked for them. |
| Shared tools run once; consumers get **tenants** | Two capabilities needing Postgres/Airflow get a database/namespace on the shared one, never their own copy. |
| `products/<name>/` holds web + api + worker + infra + deploy together | A small team changes one folder. Do **not** split into separate `services/` and `web/` trees (rejected). |
| API sharing via `visibility` in `product.yaml`, not via folders | `public`: other teams may call it → versioned paths (`/api/v1`), contract in `api/openapi.json`, CI blocks breaking changes (oasdiff). `internal`: only own web uses it, change freely. |
| Postgres on CloudNativePG (CNPG), not Bitnami/Helm Postgres | Failover, PgBouncer pooler, S3 backups via Barman Cloud plugin. Operator is a separate project from the cluster so CRDs exist first. |
| Layer-2 services never depend on layer-3 | e.g. Postgres exports `metrics_selector`; observability creates the PodMonitor. |

## Platform rules

- Layout per tool: `service.yaml` (name, category, owner, layer, depends_on,
  outputs), `infra/` (Pulumi project), `deploy/` only if not installed by
  Pulumi, `README.md`.
- Layers: a service may depend only on the same or a lower layer.
  1 = provisioning, runtime, security-compliance · 2 = databases,
  streaming-messaging · 3 = observability, workflow-orchestration,
  data-catalog, cicd · 4 = bi-analytics.
- **Contract = stack outputs** listed in `service.yaml`. Consumers read them
  with `pulumi.StackReference(f"{org}/<tool>/{env}")`. Never remove or rename
  an output without updating every consumer (`grep -r get_output`).
- Reusable consumer setup (tenants, namespaces, topics) goes in
  `libs/pulumi-components` as a `ComponentResource`.
- Pin chart/tool versions in `Pulumi.<env>.yaml`; upgrade dev → staging → prod.

Current platform services:

| Path | Layer | Notes |
|---|---|---|
| `security-compliance/cert-manager` | 1 | Helm, CRDs on |
| `databases/cnpg-operator` | 2 | CNPG operator + Barman Cloud plugin in `cnpg-system` |
| `databases/postgres` | 2 | Cluster `main`, pooler, backups (staging/prod). Outputs: `host`, `ro_host`, `app_host`, `port`, `admin_user`, `admin_password`, `cluster_name`, `namespace`, `metrics_selector` |

Other category folders have only a README for now.

## Product rules

- Copy `products/data-quality/` (the reference product) — see
  `templates/product/README.md`.
- `product.yaml`: components (`web`, `api`, `worker`), images, API
  `visibility`, `depends_on` platform services.
- `infra/` uses only `libs/pulumi-components` (`AppNamespace`,
  `PostgresTenant`) and `StackReference` outputs. **Products never edit
  `platform/`.** Need something new from the platform → add a component or
  output there in a separate change owned by the platform team.
- `PostgresTenant` creates role + database and a k8s Secret `<database>-db`
  (underscores → dashes) with `DATABASE_URL` (TLS, via pooler `app_host`).
- `deploy/`: kustomize `base/` + `overlays/{dev,staging,prod}`; namespace
  `<product>-<env>`. Argo CD syncs; CI bumps image tags.
- Add the team to `.github/CODEOWNERS` and create
  `.github/workflows/product-<name>.yml` (copy data-quality's).

## Stack and conventions

- API: Python 3.13, FastAPI, pydantic, pytest, ruff (`ruff.toml`, line 100).
  Routes under `APIRouter(prefix="/api/v1")`; `/health` unversioned.
- Web: React 19, Vite 8, TypeScript 7, Vitest 5; nginx-unprivileged image
  proxies `/api/` to the api Service.
- Images: `ghcr.io/knightowl-vn/<product>-<component>:<git sha>`, multi-arch
  (amd64 + arm64), non-root.
- CI: GitHub Actions, runner `ubuntu-24.04-arm`, path filters
  (dorny/paths-filter). Pulumi and deploy steps are off until repo vars
  `PULUMI_ENABLED` / `DEPLOY_ENABLED` are `true`.
- Secrets: never commit. Use `pulumi config set --secret` or generate with
  `pulumi_random`.

## Commands

Product (`products/data-quality`):

```bash
cd api && pip install -e ".[dev]" && ruff check . && pytest -q
cd web && npm ci && npm test && npm run build
make api          # regenerate api/openapi.json after API changes
make api-check    # what CI runs: contract must match code
kustomize build deploy/overlays/dev
```

Platform:

```bash
ruff check platform libs && ruff format --check platform libs
cd platform/databases/postgres/infra && pytest -q   # CNPG spec tests
cd platform/<category>/<tool>/infra && pulumi preview --stack dev
```

Workflows: `actionlint`.

## Before you finish a change

1. Run the checks above for every folder you touched.
2. API changed → `make api`, commit `openapi.json`; if `visibility: public`,
   make the change backward compatible or add `/api/v2`.
3. Stack output added/changed → update `service.yaml`, the tool README, and
   consumers.
4. Structure or a decision changed → update this file.

## Not done yet

Postgres store in the data-quality API (uses in-memory store), worker
example, auth/ingress/gateway, generated API clients, observability stack,
storage (S3/MinIO) service, CI for `platform/`.
