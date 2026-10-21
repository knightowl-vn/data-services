# AGENTS.md

Instructions for AI coding agents (Claude Code, Antigravity, Codex, Cursor, ...).
This is the single source of truth: `CLAUDE.md` and `.agent/rules/` point here.
Keep it up to date when the structure or a decision changes.

## What this repo is

Monorepo for the knightowl data platform. Capabilities: data catalog,
orchestration, storage, databases, monitoring, ingestion, egress, security, BI,
and a web portal that hosts every product's frontend.
Shared tools run once on the platform; many teams build products on top.

```
platform/<category>/<tool>/   shared infra, owned by platform teams
products/<name>/              one folder per product, owned by one team
libs/pulumi-components/       how products get resources from the platform
libs/web/                     ui (design system) + portal-sdk (shell/product contract)
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
| Micro frontends: one portal shell (`platform/frontend/portal`) loads each product's `web/` at runtime with Module Federation | Teams build and deploy frontends alone; users get one login and one look. Rejected: product UIs as npm packages built into the shell (couples deploys), iframes (no shared UI or routing). |
| Login at the edge: oauth2-proxy (OIDC) in front of the shell | No HTML, JS or api served without a session; no tokens in browser JS. The shell only reads `/oauth2/userinfo`. Shell/UI role checks hide things; apis must still check roles. |
| Shell routes `/apps/<name>/` → Service `<name>-web` in `<name>-<env>` by convention | No per-product config in the shell. `remotes.json` (per env) lists names only; the product owns `portal.json` (title, nav, roles). |
| Shared singletons: react, react-dom, react-router, `@knightowl-vn/ui`, `@knightowl-vn/portal-sdk` | One copy in the page (the shell's). List lives in `libs/web/portal-sdk/vite.js`. |
| `libs/web` packages installed with `file:` + `install-links=true`, TS sources, peer deps only | No registry to run; lib changes don't make product lockfiles stale. Web images build from the repo root. |

## Platform rules

- Layout per tool: `service.yaml` (name, category, owner, layer, depends_on,
  outputs), `infra/` (Pulumi project), `deploy/` only if not installed by
  Pulumi, `README.md`.
- Layers: a service may depend only on the same or a lower layer.
  1 = provisioning, runtime, security-compliance · 2 = databases,
  streaming-messaging · 3 = observability, workflow-orchestration,
  data-catalog, cicd, frontend · 4 = bi-analytics.
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
| `frontend/portal` | 3 | Shell (`web/`, Argo CD from `deploy/`) behind oauth2-proxy (Helm, `infra/`). Outputs: `namespace`, `url`, `oauth2_proxy_version` |

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
- `web/` is a portal remote: `portalRemote({ name })` in `vite.config.ts`,
  default export in `src/App.tsx` (routes relative to `/<name>`),
  `public/portal.json` (roles `<name>:<role>` or `portal:<role>`), Service
  `<name>-web` port 80. No login code in products: `usePortal()` gives user,
  roles, `fetch` (to `/apps/<name>/api`), `notify`. UI from `@knightowl-vn/ui`;
  own styles CSS Modules + `--ko-*` tokens only. Registering in the portal =
  one line in `platform/frontend/portal/deploy/overlays/<env>/remotes.json`, once.
- Add the team to `.github/CODEOWNERS` and create
  `.github/workflows/product-<name>.yml` (copy data-quality's).

## Stack and conventions

- API: Python 3.13, FastAPI, pydantic, pytest, ruff (`ruff.toml`, line 100).
  Routes under `APIRouter(prefix="/api/v1")`; `/health` unversioned.
- Web: React 19, React Router 8, Vite 8, TypeScript 7, Vitest 5, Module
  Federation (`@module-federation/vite`); nginx-unprivileged image proxies
  `/api/` to the api Service. Web images build from the repo root
  (`docker build -f <path>/Dockerfile .`). Use `npm ci` (not `npm install`)
  to pick up `libs/web` changes.
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

Shared web libs and portal:

```bash
cd libs/web/<ui|portal-sdk> && npm ci && npm run typecheck && npm test
cd platform/frontend/portal/web && npm ci && npm test && npm run build
cd platform/frontend/portal/infra && pytest -q
kustomize build platform/frontend/portal/deploy/overlays/dev
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
example, identity provider (Keycloak) in `platform/`, role checks in product
apis (verify the forwarded token), API gateway, generated API clients,
observability stack, storage (S3/MinIO) service, CI for `platform/` (only the
portal has a workflow).
