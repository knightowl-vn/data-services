---
trigger: always_on
---

# Repo rules

Read `AGENTS.md` at the repo root before any change and follow it. It holds
the layout, decisions, rules and commands for this repo.

Most important rules:

- Infra is Pulumi (Python), never Terraform. One stack per env: dev, staging, prod.
- `platform/<category>/<tool>/` = shared infra. Respect layers (a service
  depends only on same or lower layer). Contract = stack outputs in `service.yaml`.
- `products/<name>/` = one team's product (web, api, worker, infra, deploy in
  one folder). Products never edit `platform/`; they use
  `libs/pulumi-components` and `StackReference` outputs.
- `visibility: public` APIs are versioned (`/api/v1`) and must stay backward
  compatible; run `make api` after API changes.
- Postgres runs on CloudNativePG; apps connect via `app_host` (pooler).
- Update `AGENTS.md` when structure or a decision changes.
