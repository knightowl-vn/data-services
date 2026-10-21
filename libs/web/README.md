# libs/web

Shared frontend code for the portal shell and every product frontend.
Owned by `@knightowl-vn/platform-frontend`.

| Package | What |
|---|---|
| `ui/` (`@knightowl-vn/ui`) | Design tokens (CSS variables) and React components: `Button`, `TextField`, `SelectField`, `Card`, `PageHeader`, `Alert`, `Badge`, `DataTable`, `Stack`, `Spinner` |
| `portal-sdk/` (`@knightowl-vn/portal-sdk`) | Contract with the shell: `usePortal()`, `RequireRole`, `requestJson`, `validateManifest`, `DevPortal`; and `portalRemote()` / `portalHost()` build config in `/vite` |

## Using them in a product

`web/package.json`:

```json
"@knightowl-vn/portal-sdk": "file:../../../libs/web/portal-sdk",
"@knightowl-vn/ui": "file:../../../libs/web/ui"
```

and `web/.npmrc` with `install-links=true` (npm copies the package like one
from a registry, so its peer dependencies resolve from the product).

- Run **`npm ci`** after pulling lib changes; `npm install` keeps the old copy
  when the version number didn't change.
- Web Docker images build from the repo root so `libs/web` is in the context.
- In the portal, the shell's copy of these packages is used at runtime (shared
  singletons), so keep changes backward compatible within a major version.

## The remote contract

```tsx
// vite.config.ts
plugins: [react(), portalRemote({ name: "data-quality" })]

// src/App.tsx: default export, routes relative to /<product>/
export default function App() {
  return <Routes><Route index element={<ChecksPage />} /></Routes>;
}

// anywhere inside
const { user, hasRole, fetch, notify } = usePortal();
const checks = await requestJson<Check[]>(fetch, "/api/v1/checks"); // -> /apps/data-quality/api/v1/checks
<RequireRole roles={["data-quality:editor"]}>...</RequireRole>
```

`src/main.tsx` renders `<DevPortal>` in `npm run dev`, so a team can work
without the shell: fake user, switch roles with `?roles=a,b`, api proxied to
`:8000`. Production builds never include it.

## Styling rules

- Use `@knightowl-vn/ui` components first.
- Product styles: CSS Modules (`*.module.css`) only, using the `--ko-*` tokens
  from `ui/src/tokens.css`. No global selectors (`body`, `a`, `*`, ...), no
  `ko-` class names, no hard-coded colors.
- Need a new component in two products? Add it to `ui/`.

## Rules for these packages

- No `dependencies`, only `peerDependencies`. A new dependency would make every
  product's lockfile stale.
- Exports are TypeScript sources (the consumer's Vite compiles them), except
  `portal-sdk/vite.js`, which Node loads directly.
- Breaking change → bump the major version, update the shell and every product
  in the same PR (their workflows run on `libs/web/**` changes).

Checks: `npm ci && npm run typecheck && npm test` in each package.
