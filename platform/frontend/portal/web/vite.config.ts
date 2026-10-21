import { portalHost } from "@knightowl-vn/portal-sdk/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

// Local dev only. In the cluster, oauth2-proxy serves /oauth2/* and nginx serves
// /remotes.json and proxies /apps/<name>/ (see nginx/default.conf.template).
//
//   PORTAL_DEV_REMOTES  products to load: "name=url,..." (each runs `npm run dev` or `preview`)
//   PORTAL_DEV_ROLES    roles of the fake user
const devRemotes = (process.env.PORTAL_DEV_REMOTES ?? "data-quality=http://localhost:5174")
  .split(",")
  .filter(Boolean)
  .map((pair) => {
    const [name, url] = pair.split("=");
    return { name: name.trim(), url: url.trim() };
  });
const devRoles = (process.env.PORTAL_DEV_ROLES ?? "data-quality:editor,portal:admin")
  .split(",")
  .filter(Boolean);

function devAuth(): Plugin {
  return {
    name: "portal-dev-auth",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const json = (body: unknown) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (url.pathname === "/oauth2/userinfo") {
          return json({
            user: "dev",
            email: "dev@example.com",
            preferredUsername: "Dev User",
            groups: devRoles,
          });
        }
        if (url.pathname === "/remotes.json") {
          return json({ remotes: devRemotes.map(({ name }) => ({ name })) });
        }
        if (url.pathname === "/oauth2/start" || url.pathname === "/oauth2/sign_out") {
          res.statusCode = 302;
          res.setHeader("Location", url.searchParams.get("rd") ?? "/");
          return res.end();
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), portalHost(), devAuth()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(devRemotes.map((r) => [`/apps/${r.name}`, { target: r.url }])),
  },
  test: { environment: "node", server: { deps: { inline: [/@knightowl-vn\//] } } },
});
