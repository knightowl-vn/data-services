// Build config every portal frontend uses, so the shell and all remotes agree on
// the remote layout and on which packages are shared. Plain JS: Vite loads it
// from node_modules, where Node does not run TypeScript.
import { federation } from "@module-federation/vite";

/**
 * One copy of each of these is loaded in the page (the shell's) and shared by
 * every remote. They must be singletons: React, the router and the portal
 * context break if two copies are loaded. Remotes declare compatible ranges.
 */
export const PORTAL_SHARED = [
  "react",
  "react-dom",
  "react-router",
  "@knightowl-vn/ui",
  "@knightowl-vn/portal-sdk",
];

const shared = Object.fromEntries(PORTAL_SHARED.map((name) => [name, { singleton: true }]));

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Vite plugins for a product frontend (a "remote").
 *
 * Fixed layout:
 *   - exposes "./App" from src/App.tsx (default export: the product's root component)
 *   - served by the shell at /apps/<name>/ (Vite `base`)
 *   - remoteEntry.js and portal.json at the root of the build
 *   - dev/preview server proxies /apps/<name>/api to the local api
 *
 * @param {{ name: string, apiTarget?: string, port?: number }} options
 */
export function portalRemote({ name, apiTarget = "http://localhost:8000", port = 5174 }) {
  if (!NAME_PATTERN.test(name)) throw new Error(`portalRemote: invalid product name "${name}"`);
  const base = `/apps/${name}`;
  const server = {
    port,
    strictPort: true,
    proxy: {
      [`${base}/api`]: {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.slice(base.length),
      },
    },
  };
  return [
    {
      name: "knightowl-portal-remote",
      config: () => ({
        base: `${base}/`,
        build: { target: "es2022" },
        server,
        preview: server,
      }),
    },
    federation({
      name: name.replace(/-/g, "_"),
      filename: "remoteEntry.js",
      exposes: { "./App": "./src/App.tsx" },
      shared,
      dts: false,
    }),
  ];
}

/** Vite plugins for the shell (the host). Remotes are registered at runtime. */
export function portalHost() {
  return [
    {
      name: "knightowl-portal-host",
      config: () => ({ build: { target: "es2022" } }),
    },
    federation({ name: "portal", remotes: {}, shared, dts: false }),
  ];
}
