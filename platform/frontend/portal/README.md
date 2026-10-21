# portal

The shell (host app) for product frontends. Users open one site; each product
team builds and deploys its own frontend, and the shell loads it at runtime
with [Module Federation](https://module-federation.io).

| Shell (platform team) | Product frontend (product team) |
|---|---|
| Login, session, sign-out | Its pages and routes under `/<product>/*` |
| Checks the user may open the product, filters nav by role | Hides actions by role (`RequireRole`) |
| Layout, header, navigation, toasts, error isolation | Its own api, at `/apps/<product>/api` |
| One copy of React, router, `ui`, `portal-sdk` for everyone | `portal.json`: title, nav, roles |

## How a request flows

```
browser ──> Ingress portal.<env>.knightowl.vn
              └─> oauth2-proxy  (no session? -> identity provider login)
                    └─> portal-shell nginx
                          ├─ /                    shell SPA
                          ├─ /remotes.json        which products (ConfigMap)
                          └─ /apps/<name>/...  ─> <name>-web.<name>-<env>.svc   (product nginx)
                                                    ├─ /remoteEntry.js, /assets/*, /portal.json
                                                    └─ /api/...  ─> <name>-api   (product api)
```

- **Login is enforced before anything is served.** oauth2-proxy sits in front of
  the shell, so the shell, every product's JS and every product api need a
  valid session. Expired sessions: page loads redirect to login; api calls
  (`/apps/*/api/`) get 401 and the shell redirects.
- **One origin.** Products are proxied, not loaded from other hosts, so the
  session cookie works for their apis and the CSP is `script-src 'self'`.
- **No per-product config in the shell.** `/apps/<name>/` goes to Service
  `<name>-web` in namespace `<name>-<env>` by naming convention.
- **Products deploy alone.** `remoteEntry.js` and `portal.json` are served with
  `Cache-Control: no-cache`; a product's deploy is live on the next page load.
- **One product failing doesn't take down the portal.** A missing or invalid
  `portal.json` drops that product from the nav (shown to `portal:admin` users
  on the home page); a remote that fails to load or crashes shows an error in
  its own area.

## Auth and roles

| Where | What it enforces |
|---|---|
| oauth2-proxy | Signed in (and optionally member of `allowedGroups`). Every request. |
| Shell | User has one of `portal.json` `roles` to open a product; nav items filtered by role. |
| Product UI | `RequireRole` / `hasRole()` hide actions. Convenience only. |
| Product api | **Must** check roles itself. Upstreams get `Authorization: Bearer <token>` and `X-Forwarded-User/-Email/-Groups`. |

Roles come from the identity provider as the `groups` claim (Keycloak: add a
groups or client-roles mapper to the `portal` client). Names are
`<product>:<role>` (e.g. `data-quality:editor`) or portal-wide `portal:<role>`;
`portal.json` may only use those prefixes.

## Adding a product

Product side (see `templates/product/README.md`):

1. `web/` builds with `portalRemote({ name })` from `@knightowl-vn/portal-sdk/vite`
   and default-exports its root component from `src/App.tsx`.
2. `web/public/portal.json` describes title, nav and roles.
3. The web Service is `<name>-web` (port 80) in namespace `<name>-<env>`.

Platform side, **once per product and env**: add `{ "name": "<name>" }` to
`deploy/overlays/<env>/remotes.json`. After that the product never needs a
change here.

## Shared packages and versions

The shell provides one copy of `react`, `react-dom`, `react-router`,
`@knightowl-vn/ui` and `@knightowl-vn/portal-sdk` (list in
`libs/web/portal-sdk/vite.js`). Remotes use it at runtime, so they must
declare compatible ranges. Upgrading a major version of one of these is a
coordinated change: shell first, then products.

## Layout

```
portal/
├── service.yaml
├── web/       # shell: React + Vite, Module Federation host
│   ├── src/        session.ts (who is signed in), registry.ts (which products),
│   │               access.ts (roles), RemoteRoute.tsx (load + isolate a product)
│   ├── nginx/      routing to products, security headers
│   └── Dockerfile  build from the repo root
├── infra/     # Pulumi: namespace + oauth2-proxy (Helm); specs.py is unit tested
└── deploy/    # kustomize: shell Deployment/Service, remotes.json per env
```

## Run locally

```bash
# a product: api on :8000, its frontend on :5174
cd products/data-quality/api && uvicorn data_quality_api.main:app --port 8000
cd products/data-quality/web && npm ci && npm run dev

# the shell on :5173, with a fake user and roles (no oauth2-proxy needed)
cd platform/frontend/portal/web && npm ci && npm run dev
PORTAL_DEV_ROLES=data-quality:viewer npm run dev                 # try other roles
PORTAL_DEV_REMOTES=data-quality=http://localhost:5174,x=http://localhost:5175 npm run dev
```

Open http://localhost:5173. Product teams usually don't need the shell: their
`npm run dev` runs standalone (see `libs/web/README.md`).

Checks: `cd web && npm ci && npm test && npm run build`,
`cd infra && pytest -q`, `kustomize build deploy/overlays/dev`.

## Deploy

```bash
cd infra && pulumi stack select dev
pulumi config set --secret oidcClientSecret <secret from the identity provider>
pulumi up
```

Then Argo CD syncs `deploy/overlays/<env>`; CI builds the shell image and bumps
the dev tag (`.github/workflows/platform-portal.yml`).

| Output | Description |
|---|---|
| `namespace` | `portal-<env>` |
| `url` | Portal URL |
| `oauth2_proxy_version` | Installed chart version |

## Not done yet

- Identity provider (Keycloak) is not in `platform/` yet; `oidcIssuerUrl` points to where it will be.
- Product apis don't verify the token yet (see the data-quality README).
- During a product's rolling deploy, a browser can get a new `remoteEntry.js`
  and an old pod's assets (404 until reload). Fix later by serving assets from
  object storage that keeps old versions.
