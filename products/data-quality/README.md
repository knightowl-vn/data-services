# Data Quality

Define data quality checks on datasets (not null, unique, row count,
freshness) and run them. Owned by `@knightowl-vn/data-quality`.

This product is also the **reference example** for how products are laid out.

```
data-quality/
├── product.yaml    # owner, components, API visibility, platform dependencies
├── Makefile        # test / build / api / dev targets
├── web/            # React + Vite + TypeScript, a portal remote (micro frontend)
│   └── public/portal.json   # title, nav and roles for the portal
├── api/            # Python FastAPI (public, /api/v1)
│   ├── openapi.json    # contract, generated from the code
│   ├── src/
│   ├── tests/
│   └── migrations/
├── infra/          # Pulumi: namespace + Postgres tenant
└── deploy/         # kustomize base + dev/staging/prod overlays
```

## Run locally

```bash
# api (http://localhost:8000/docs)
cd api && python -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/uvicorn data_quality_api.main:app --reload

# web, standalone with a fake user (http://localhost:5174/apps/data-quality/)
# switch roles with ?roles=data-quality:viewer
cd web && npm ci && npm run dev
```

To see it inside the portal, also run the shell (`platform/frontend/portal/README.md`).

Tests: `make test`.

## API contract

`api/openapi.json` is generated from the code. After changing the API, run
`make api` and commit the result. CI fails if it is out of date.

The API is `visibility: public` in `product.yaml`, so other products may
call it. That means:

- Paths are versioned (`/api/v1/...`). Breaking changes go in a new `/api/v2`.
- CI runs `oasdiff` and fails the PR if the change would break callers
  (e.g. removing a path or a field).

## Frontend (portal remote)

The web is not a standalone site. The portal shell
(`platform/frontend/portal`) logs the user in, draws the layout and loads this
frontend at `/data-quality/*`. The team builds and deploys it alone.

| File | Role |
|---|---|
| `web/vite.config.ts` | `portalRemote({ name: "data-quality" })`: exposes `src/App.tsx`, base `/apps/data-quality/` |
| `web/src/App.tsx` | Default-exported root component; routes relative to `/data-quality` |
| `web/public/portal.json` | Title, nav, roles (`data-quality:viewer`, `data-quality:editor`) |
| `web/src/api.ts` | Calls through `usePortal().fetch` (session cookie, `/apps/data-quality` prefix) |
| `web/src/main.tsx` | Standalone dev only (`DevPortal`) |

UI uses `@knightowl-vn/ui` components; own styles are CSS Modules with the
`--ko-*` tokens (`libs/web/README.md`). Only editors see "Add check" and
"Run"; the api does not check roles yet (see below).

## How it uses the platform

| Needs | How |
|---|---|
| Namespace `data-quality-<env>` | `AppNamespace` in `infra/` |
| Postgres database `data_quality` | `PostgresTenant` in `infra/`, reading `platform/databases/postgres` outputs |
| `DATABASE_URL` | k8s Secret `data-quality-db`, loaded by the api Deployment |
| Login, layout, navigation | Portal shell; listed in `platform/frontend/portal/deploy/overlays/<env>/remotes.json` |

## Pipeline (`.github/workflows/product-data-quality.yml`)

| Change in | Runs |
|---|---|
| `api/` | lint + tests, contract check, breaking-change check, image build (main only) |
| `web/`, `api/openapi.json` or `libs/web/` | tests + build, image build (main only) |
| `infra/` | `pulumi preview` on PR, `pulumi up` on main |
| any of the above on main | dev overlay image tags bumped, Argo CD syncs |

## Not done yet

- The api stores data in memory. Next step: a Postgres store using
  `DATABASE_URL` and `api/migrations/`.
- Running checks: runs are queued only. Add a `worker/` component
  (or an Airflow DAG) that executes them.
- The api does not check the user's roles yet. Login is enforced by the
  portal, and the api receives `Authorization: Bearer <token>` and
  `X-Forwarded-Groups`; next step is to verify the token and require
  `data-quality:editor` for writes.
- No generated clients for other products to call the API.
