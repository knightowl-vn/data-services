# Data Quality

Define data quality checks on datasets (not null, unique, row count,
freshness) and run them. Owned by `@knightowl-vn/data-quality`.

This app is also the **reference example** for how apps are laid out.

```
data-quality/
├── app.yaml        # owner, components, platform dependencies
├── Makefile        # test / build / api / dev targets
├── api/            # openapi.json: contract between frontend and backend
├── backend/        # Python FastAPI
├── frontend/       # React + Vite + TypeScript
├── infra/          # Pulumi: namespace + Postgres tenant
└── deploy/         # kustomize base + dev/staging/prod overlays
```

## Run locally

```bash
# backend (http://localhost:8000/docs)
cd backend && python -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/uvicorn data_quality_api.main:app --reload

# frontend (http://localhost:5173, proxies /api to :8000)
cd frontend && npm ci && npm run dev
```

Tests: `make test`.

## API contract

`api/openapi.json` is generated from the backend. After changing the API,
run `make api` and commit the result. CI fails if it is out of date.

## How it uses the platform

| Needs | How |
|---|---|
| Namespace `data-quality-<env>` | `AppNamespace` in `infra/` |
| Postgres database `data_quality` | `PostgresTenant` in `infra/`, reading `platform/databases/postgres` outputs |
| `DATABASE_URL` | k8s Secret `data-quality-db`, loaded by the backend Deployment |

## Pipeline (`.github/workflows/app-data-quality.yml`)

| Change in | Runs |
|---|---|
| `backend/`, `api/` | lint + tests, API contract check, image build (main only) |
| `frontend/`, `api/` | tests + build, image build (main only) |
| `infra/` | `pulumi preview` on PR, `pulumi up` on main |
| any of the above on main | dev overlay image tags bumped, Argo CD syncs |

## Not done yet

- Backend stores data in memory. Next step: a Postgres store using
  `DATABASE_URL` and `backend/migrations/`.
- Running checks: runs are queued only. Add a `workers/` component
  (or an Airflow DAG) that executes them.
- No auth or ingress yet.
