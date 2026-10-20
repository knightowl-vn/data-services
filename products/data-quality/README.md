# Data Quality

Define data quality checks on datasets (not null, unique, row count,
freshness) and run them. Owned by `@knightowl-vn/data-quality`.

This product is also the **reference example** for how products are laid out.

```
data-quality/
├── product.yaml    # owner, components, API visibility, platform dependencies
├── Makefile        # test / build / api / dev targets
├── web/            # React + Vite + TypeScript
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

# web (http://localhost:5173, proxies /api to :8000)
cd web && npm ci && npm run dev
```

Tests: `make test`.

## API contract

`api/openapi.json` is generated from the code. After changing the API, run
`make api` and commit the result. CI fails if it is out of date.

The API is `visibility: public` in `product.yaml`, so other products may
call it. That means:

- Paths are versioned (`/api/v1/...`). Breaking changes go in a new `/api/v2`.
- CI runs `oasdiff` and fails the PR if the change would break callers
  (e.g. removing a path or a field).

## How it uses the platform

| Needs | How |
|---|---|
| Namespace `data-quality-<env>` | `AppNamespace` in `infra/` |
| Postgres database `data_quality` | `PostgresTenant` in `infra/`, reading `platform/databases/postgres` outputs |
| `DATABASE_URL` | k8s Secret `data-quality-db`, loaded by the api Deployment |

## Pipeline (`.github/workflows/product-data-quality.yml`)

| Change in | Runs |
|---|---|
| `api/` | lint + tests, contract check, breaking-change check, image build (main only) |
| `web/` or `api/openapi.json` | tests + build, image build (main only) |
| `infra/` | `pulumi preview` on PR, `pulumi up` on main |
| any of the above on main | dev overlay image tags bumped, Argo CD syncs |

## Not done yet

- The api stores data in memory. Next step: a Postgres store using
  `DATABASE_URL` and `api/migrations/`.
- Running checks: runs are queued only. Add a `worker/` component
  (or an Airflow DAG) that executes them.
- No auth, ingress or gateway route yet, and no generated clients for
  other products to call the API.
