# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

- `platform/<category>/<tool>/` — shared infra (Pulumi project in `infra/`, `service.yaml` with owner, layer, outputs). See `platform/README.md` for layer rules.
- `apps/<app>/` — products. `apps/data-quality/` is the reference app: FastAPI backend, React/Vite frontend, Pulumi `infra/`, kustomize `deploy/`.
- `libs/pulumi-components/` — shared Pulumi components (`AppNamespace`, `PostgresTenant`). Apps use platform services only through these and `StackReference` outputs; apps never edit `platform/`.
- `.github/workflows/_*.yml` — reusable workflows; `app-<name>.yml` — per-app pipeline with path filters.

## Commands (apps/data-quality)

- Backend: `cd backend && pip install -e ".[dev]" && ruff check . && pytest -q`
- Frontend: `cd frontend && npm ci && npm test && npm run build`
- Regenerate API contract after API changes: `make api` (CI runs `make api-check`)
- Render manifests: `kustomize build deploy/overlays/<env>`
- Lint workflows: `actionlint`
