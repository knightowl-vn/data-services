import { Alert } from "@knightowl-vn/ui";
import { type ReactNode, useMemo } from "react";
import { BrowserRouter } from "react-router";
import { hasAnyRole, PortalProvider } from "./context";
import { serviceBase } from "./manifest";
import type { PortalContextValue } from "./types";

/**
 * Standalone dev harness: runs a remote without the shell, with a fake user.
 * Switch roles with the URL, e.g. ?roles=data-quality:viewer
 * Only for `vite dev`; production builds never render it (see the product's main.tsx).
 */
export function DevPortal({
  name,
  title,
  roles,
  children,
}: {
  name: string;
  title: string;
  /** Default roles of the fake user. */
  roles: string[];
  children: ReactNode;
}) {
  const base = serviceBase(name);
  const value = useMemo<PortalContextValue>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("roles");
    const userRoles = fromUrl !== null ? fromUrl.split(",").filter(Boolean) : roles;
    return {
      user: { id: "dev", name: "Dev User", email: "dev@example.com", roles: userRoles },
      app: { name, title, routeBase: base, serviceBase: base },
      hasRole: (...wanted) => hasAnyRole(userRoles, wanted),
      fetch: (path, init) => window.fetch(`${base}${path}`, { credentials: "same-origin", ...init }),
      notify: (message, tone = "info") => console.info(`[notify:${tone}]`, message),
      logout: () => console.info("[dev] logout"),
    };
  }, [name, title, roles, base]);

  return (
    <BrowserRouter basename={base}>
      <PortalProvider value={value}>
        <div style={{ padding: "var(--ko-space-4)" }}>
          <Alert tone="warning">
            Standalone dev: {title} as {value.user.name}, roles:{" "}
            {value.user.roles.join(", ") || "(none)"}. Change with ?roles=a,b
          </Alert>
        </div>
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--ko-space-5)" }}>
          {children}
        </main>
      </PortalProvider>
    </BrowserRouter>
  );
}
