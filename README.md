# data-services

Monorepo for the data platform: shared infrastructure, and the apps teams
build on it.

```
data-services/
├── platform/      # shared infra by category (databases, observability, ...)
├── apps/          # products owned by app teams (e.g. data-quality)
├── libs/          # shared code (pulumi-components, ...)
├── templates/     # how to start a new app
└── .github/       # CI: reusable workflows + one workflow per app, CODEOWNERS
```

| Layer | Owned by | Contains |
|---|---|---|
| `platform/` | Platform teams | Tools run once and shared: Postgres, Kafka, Airflow, monitoring... |
| `apps/` | Product teams | Frontend, backend, infra (tenants), deploy, per app |
| `libs/` | Platform team | Components apps use to get resources on the platform |

## Tooling

- **Infra:** Pulumi (Python). One project per platform tool and per app,
  one stack per environment (`dev`, `staging`, `prod`).
- **Deploy:** kustomize overlays per environment, synced by Argo CD.
- **CI:** GitHub Actions. Shared logic in `.github/workflows/_*.yml`; each
  app's workflow runs only for the parts of the app that changed.

## Turning on CI deploys

Builds and tests run without setup. To enable the rest, set in repo settings:

| Setting | Enables |
|---|---|
| Variable `PULUMI_ENABLED=true` + secret `PULUMI_ACCESS_TOKEN` | `pulumi preview`/`up` |
| Variable `DEPLOY_ENABLED=true` | Image tag bumps in dev overlays |

See `platform/README.md` and `templates/app/README.md` for the rules.
