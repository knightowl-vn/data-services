# data-services

Monorepo for the data platform: shared infrastructure, and the products
teams build on it.

```
data-services/
├── platform/      # shared infra by category (databases, observability, ...)
├── products/      # one folder per product, owned by one team
├── libs/          # shared code (pulumi-components, web: ui + portal-sdk)
├── templates/     # how to start a new product
└── .github/       # CI: reusable workflows + one workflow per product, CODEOWNERS
```

| Layer | Owned by | Contains |
|---|---|---|
| `platform/` | Platform teams | Tools run once and shared: Postgres, Kafka, Airflow, monitoring... |
| `products/` | Product teams | Everything for one product: `web/`, `api/`, `worker/`, `infra/`, `deploy/` |
| `libs/` | Platform team | Components products use to get resources on the platform, shared UI |

## Frontends: one portal, many teams

Users open one portal (`platform/frontend/portal`). It handles login, roles,
layout and navigation, and loads each product's frontend at runtime (micro
frontends with Module Federation). Each team builds and deploys its own
`web/` without touching the portal or other teams. Shared look and the
shell/product contract live in `libs/web`.

## Folders follow teams

A product folder holds everything one team ships, so a feature is one
folder, one PR, one pipeline. Whether other products may call an API is set
in `product.yaml` (`visibility: public | internal`), not by moving folders.
Split a component into its own product only when another team takes
ownership of it.

## Tooling

- **Infra:** Pulumi (Python). One project per platform tool and per product,
  one stack per environment (`dev`, `staging`, `prod`).
- **Deploy:** kustomize overlays per environment, synced by Argo CD.
- **CI:** GitHub Actions. Shared logic in `.github/workflows/_*.yml`; each
  product's workflow runs only for the components that changed.

## Turning on CI deploys

Builds and tests run without setup. To enable the rest, set in repo settings:

| Setting | Enables |
|---|---|
| Variable `PULUMI_ENABLED=true` + secret `PULUMI_ACCESS_TOKEN` | `pulumi preview`/`up` |
| Variable `DEPLOY_ENABLED=true` | Image tag bumps in dev overlays |

See `platform/README.md` and `templates/product/README.md` for the rules.
