# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

- `platform/<category>/<tool>/` — shared infra (Pulumi project in `infra/`, `service.yaml` with owner, layer, outputs). See `platform/README.md` for layer rules.
- `products/<name>/` — one folder per product, owned by one team: `web/`, `api/`, `worker/` (each optional), `infra/` (Pulumi), `deploy/` (kustomize), `product.yaml`. `products/data-quality/` is the reference product.
- API `visibility` in `product.yaml`: `public` = versioned paths (`/api/v1`) and CI blocks breaking changes (oasdiff); `internal` = change freely.
- `libs/pulumi-components/` — shared Pulumi components (`AppNamespace`, `PostgresTenant`). Products use platform services only through these and `StackReference` outputs; products never edit `platform/`.
- `.github/workflows/_*.yml` — reusable workflows; `product-<name>.yml` — per-product pipeline with path filters.

## Commands (products/data-quality)

- API: `cd api && pip install -e ".[dev]" && ruff check . && pytest -q`
- Web: `cd web && npm ci && npm test && npm run build`
- Regenerate API contract after API changes: `make api` (CI runs `make api-check`)
- Render manifests: `kustomize build deploy/overlays/<env>`
- Lint workflows: `actionlint`
