# New app template

Every app follows the layout of `apps/data-quality/`. To add one:

1. Copy the folder: `cp -r apps/data-quality apps/<name>`, then remove
   what you don't need (e.g. `frontend/`) and replace the code.
2. Update `app.yaml`: name, team, components, `depends_on`.
3. Update `infra/`: project name in `Pulumi.yaml`, `APP`/`TEAM` in
   `__main__.py`, and the tenants you need from `libs/pulumi-components`.
4. Update `deploy/`: names, images, ports; namespace `<name>-<env>`.
5. Copy `.github/workflows/app-data-quality.yml` to `app-<name>.yml` and
   replace `data-quality` with `<name>`.
6. Add your team to `.github/CODEOWNERS` for `/apps/<name>/` and your workflow.

## Rules

- Apps never edit `platform/`. Use components from `libs/` and platform
  stack outputs.
- Apps don't import each other's code. Talk through APIs or Kafka; put
  shared code in `libs/`.
- Keep the same Makefile targets (`test`, `build`, `api`) so the shared
  pipelines work.
