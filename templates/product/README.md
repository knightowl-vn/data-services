# New product template

Every product follows the layout of `products/data-quality/`. To add one:

1. Copy the folder: `cp -r products/data-quality products/<name>`, then
   remove what you don't need (e.g. `web/` for an API-only product) and
   replace the code.
2. Update `product.yaml`: name, team, components, API `visibility`,
   `depends_on`.
3. Update `infra/`: project name in `Pulumi.yaml`, `APP`/`TEAM` in
   `__main__.py`, and the tenants you need from `libs/pulumi-components`.
4. Update `deploy/`: names, images, ports; namespace `<name>-<env>`.
5. Copy `.github/workflows/product-data-quality.yml` to
   `product-<name>.yml` and replace `data-quality` with `<name>`.
6. Add your team to `.github/CODEOWNERS` for `/products/<name>/` and your
   workflow.

## Components

| Folder | What | Optional |
|---|---|---|
| `web/` | Frontend | yes |
| `api/` | Backend API + `openapi.json` contract | yes |
| `worker/` | Background jobs, consumers | yes |
| `infra/` | Pulumi project for the product | no |
| `deploy/` | kustomize base + overlays | no |

## API visibility

| `visibility` | Who calls it | Rules |
|---|---|---|
| `internal` | Only this product's `web/` | Change freely |
| `public` | Other products too | Versioned paths (`/api/v1`); CI blocks breaking changes |

Start `internal`. Switch to `public` when another product needs the API.

## Rules

- Folders follow teams. Split a component into its own product only when
  another team takes ownership of it.
- Products never edit `platform/`. Use components from `libs/` and platform
  stack outputs.
- Products don't import each other's code. Call public APIs or use Kafka;
  put shared code in `libs/`.
- Keep the same Makefile targets (`test`, `build`, `api`) so the shared
  pipelines work.
